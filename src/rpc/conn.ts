// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { IDGen } from "./idgen";
import { RefCount } from "./refcount";
import { Client, isSameClient, clientFromResolution } from "./client";
import { Transport } from "./transport";
import { Question, QuestionState } from "./question";
import { Return, Payload, CapDescriptor, MessageTarget } from "../capnp/rpc";
import { RPCError } from "./rpc-error";
import { AnswerEntry, Answer } from "./answer";
import {
  newMessage,
  newFinishMessage,
  newUnimplementedMessage,
  newReturnMessage,
  setReturnException,
} from "./capability";
import { Pipeline } from "./pipeline";
import { Struct } from "../serialization/pointers/struct";
import {
  promisedAnswerOpsToTransform,
  transformToPromisedAnswer,
} from "./promised-answer";
import { Method } from "./method";
import { PipelineOp } from "./pipeline-op";
import { ImportClient } from "./import-client";
import { Call, placeParams } from "./call";
import { Segment } from "../serialization/segment";
import { List } from "../serialization/pointers/list/list";
import { Ref } from "./ref";
import { PipelineClient } from "./pipeline-client";
import { FixedAnswer } from "./fixed-answer";
import { LocalAnswerClient } from "./local-answer-client";
import { Finalize } from "./finalize";
import { Message as RPCMessage } from "../capnp/rpc";
import { MethodError } from "./method-error";
import { Registry } from "./registry";
import { joinAnswer } from "./join";
import {
  INVARIANT_UNREACHABLE_CODE,
  RPC_BAD_TARGET,
  RPC_FINISH_UNKNOWN_ANSWER,
  RPC_NO_MAIN_INTERFACE,
  RPC_QUESTION_ID_REUSED,
  RPC_RETURN_FOR_UNKNOWN_QUESTION,
  RPC_UNKNOWN_ANSWER_ID,
  RPC_UNKNOWN_CAP_DESCRIPTOR,
  RPC_UNKNOWN_EXPORT_ID,
} from "../errors";
import { format } from "../util";
import { Interface, Message } from "../serialization";
import { AnyStruct } from "../serialization/pointers/struct";
import {
  InterfaceCtor,
  ServerTarget,
} from "../serialization/pointers/interface";
import { Server } from "./server";
import { getAs } from "../serialization/pointers/struct.utils";

type QuestionSlot = Question<any, any> | null;

// https://github.com/unjs/capnp-es/issues/7
const ConnWeakRefRegistry = globalThis.FinalizationRegistry
  ? new FinalizationRegistry<() => void>((cb) => cb())
  : undefined;

const ConDefaultFinalize: Finalize = (obj, finalizer): void => {
  ConnWeakRefRegistry?.register(obj as object, finalizer);
};

export class Conn {
  questionID = new IDGen();
  questions: QuestionSlot[] = [];

  answers: { [key: number]: AnswerEntry<any> } = {};

  exportID = new IDGen();
  exports: Array<Export | null> = [];

  imports: { [key: number]: ImportEntry } = {};

  onError?: (err?: Error) => void;
  main?: Client;
  working = false;

  /**
   * Create a new connection
   * @param transport The transport used to receive/send messages.
   * @param finalize Weak reference implementation. Compatible with
   * the 'weak' module on node.js (just add weak as a dependency and pass
   * require("weak")), but alternative implementations can be provided for
   * other platforms like Electron. Defaults to using FinalizationRegistry if
   * available.
   * @returns A new connection.
   */
  constructor(
    public transport: Transport,
    public finalize = ConDefaultFinalize,
  ) {
    this.startWork();
  }

  bootstrap<C>(InterfaceClass: InterfaceCtor<C, Server>): C {
    const q = this.newQuestion();
    const msg = newMessage();
    const boot = msg._initBootstrap();
    boot.questionId = q.id;

    this.sendMessage(msg);
    return new InterfaceClass.Client(new Pipeline(AnyStruct, q).client());
  }

  initMain<S extends InterfaceCtor<unknown, Server>>(
    InterfaceClass: S,
    target: ServerTarget<S>,
  ): void {
    this.main = new InterfaceClass.Server(target);
    this.addExport(this.main);
  }

  startWork(): void {
    this.work().catch((error_) => {
      if (this.onError) {
        this.onError(error_);
      } else if (error_ !== undefined) {
        throw error_;
      }
    });
  }

  sendReturnException(id: number, err: Error): void {
    const m = newReturnMessage(id);
    setReturnException(m.return, err);
    this.sendMessage(m);
  }

  handleBootstrapMessage(m: RPCMessage): void {
    const boot = m.bootstrap;
    const id = boot.questionId;
    const ret = newReturnMessage(id);
    ret.return.releaseParamCaps = false;
    const a = this.insertAnswer(id);
    if (a === null) {
      return this.sendReturnException(id, new Error(RPC_QUESTION_ID_REUSED));
    }
    if (this.main === undefined) {
      return a.reject(new Error(RPC_NO_MAIN_INTERFACE));
    }

    const msg = new Message();
    msg.addCap(this.main);
    a.fulfill(new Interface(msg.getSegment(0), 0));
  }

  handleFinishMessage(m: RPCMessage): void {
    const { finish } = m;
    const id = finish.questionId;
    const a = this.popAnswer(id);
    if (a === null) {
      throw new Error(format(RPC_FINISH_UNKNOWN_ANSWER, id));
    }
    if (finish.releaseResultCaps) {
      const caps = a.resultCaps;
      let i = caps.length;
      while (--i >= 0) {
        this.releaseExport(i, 1);
      }
    }
  }

  handleMessage(m: RPCMessage): void {
    switch (m.which()) {
      case RPCMessage.UNIMPLEMENTED: {
        // no-op for now to avoid feedback loop
        break;
      }
      case RPCMessage.BOOTSTRAP: {
        this.handleBootstrapMessage(m);
        break;
      }
      case RPCMessage.ABORT: {
        this.shutdown(new RPCError(m.abort));
        break;
      }
      case RPCMessage.FINISH: {
        this.handleFinishMessage(m);
        break;
      }
      case RPCMessage.RETURN: {
        // Make a copy to allow `m` to fall out of scope for GC and finalization
        // this.handleReturnMessage(m.segment.message.copy().initRoot(RPCMessage));
        this.handleReturnMessage(m);
        break;
      }
      case RPCMessage.CALL: {
        // Make a copy to allow `m` to fall out of scope for GC and finalization
        // this.handleCallMessage(m.segment.message.copy().initRoot(RPCMessage));
        this.handleCallMessage(m);
        break;
      }
      default:
      // Ignore
    }
  }

  handleReturnMessage(m: RPCMessage): void {
    const ret = m.return;
    const id = ret.answerId;
    const q = this.popQuestion(id);
    if (!q) {
      throw new Error(format(RPC_RETURN_FOR_UNKNOWN_QUESTION, id));
    }

    if (ret.releaseParamCaps) {
      for (let i = 0; i < q.paramCaps.length; i++) {
        this.releaseExport(id, 1);
      }
    }

    let releaseResultCaps = true;
    switch (ret.which()) {
      case Return.RESULTS: {
        releaseResultCaps = false;
        const { results } = ret;
        // TODO: reply with unimplemented if we have a problem here
        this.populateMessageCapTable(results);

        const { content } = results;
        q.fulfill(content);
        break;
      }
      case Return.EXCEPTION: {
        const exc = ret.exception;
        const err: Error = q.method
          ? new MethodError(q.method, exc.reason)
          : new RPCError(exc);
        q.reject(err);
        break;
      }
      default:
      // Ignore
    }

    const fin = newFinishMessage(id, releaseResultCaps);
    this.sendMessage(fin);
  }

  handleCallMessage(m: RPCMessage): void {
    const mcall = m.call;
    const mt = mcall.target;
    if (
      mt.which() !== MessageTarget.IMPORTED_CAP &&
      mt.which() !== MessageTarget.PROMISED_ANSWER
    ) {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const mparams = mcall.params;
    try {
      this.populateMessageCapTable(mparams);
    } catch {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const id = mcall.questionId;
    const a = this.insertAnswer(id);
    if (!a) {
      // TODO: this should abort the whole conn
      throw new Error(format(RPC_QUESTION_ID_REUSED, id));
    }

    const interfaceDef = Registry.lookup(mcall.interfaceId);
    if (!interfaceDef) {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const method = interfaceDef.methods[mcall.methodId];
    if (!method) {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const paramContent = mparams.content;

    const call: Call<any, any> = {
      method,

      params: getAs(method.ParamsClass, paramContent),
    };
    try {
      this.routeCallMessage(a, mt, call);
    } catch (error_) {
      a.reject(error_ as Error);
    }
  }

  routeCallMessage<P extends Struct, R extends Struct>(
    result: AnswerEntry<R>,
    mt: MessageTarget,
    cl: Call<P, R>,
  ): void {
    switch (mt.which()) {
      case MessageTarget.IMPORTED_CAP: {
        const id = mt.importedCap;
        const e = this.findExport(id);
        if (!e) {
          throw new Error(RPC_BAD_TARGET);
        }
        const answer = this.call(e.client, cl);
        joinAnswer(result, answer);
        break;
      }
      case MessageTarget.PROMISED_ANSWER: {
        const mpromise = mt.promisedAnswer;
        const id = mpromise.questionId;
        if (id === result.id) {
          // Grandfather paradox
          throw new Error(RPC_BAD_TARGET);
        }
        const pa = this.answers[id] as AnswerEntry<R>;
        if (!pa) {
          throw new Error(RPC_BAD_TARGET);
        }
        const mtrans = mpromise.transform;
        const transform = promisedAnswerOpsToTransform(mtrans);
        if (pa.done) {
          const { obj, err } = pa;
          const client = clientFromResolution(transform, obj, err);
          const answer = this.call(client, cl);
          joinAnswer(result, answer);
        } else {
          pa.queueCall(cl, transform, result);
        }

        break;
      }
      default: {
        throw new Error(INVARIANT_UNREACHABLE_CODE);
      }
    }
  }

  populateMessageCapTable(payload: Payload): void {
    const msg = payload.segment.message;
    const ctab = payload.capTable;
    for (const desc of ctab) {
      switch (desc.which()) {
        case CapDescriptor.NONE: {
          msg.addCap(null);
          break;
        }
        case CapDescriptor.SENDER_HOSTED: {
          const id = desc.senderHosted;
          const client = this.addImport(id);
          msg.addCap(client);
          break;
        }
        case CapDescriptor.SENDER_PROMISE: {
          // Apparently, this is a hack, see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/rpc.go#L549
          const id = desc.senderPromise;
          const client = this.addImport(id);
          msg.addCap(client);
          break;
        }
        case CapDescriptor.RECEIVER_HOSTED: {
          const id = desc.receiverHosted;
          const e = this.findExport(id);
          if (!e) {
            throw new Error(format(RPC_UNKNOWN_EXPORT_ID, id));
          }
          msg.addCap(e.rc.ref());
          break;
        }
        case CapDescriptor.RECEIVER_ANSWER: {
          const recvAns = desc.receiverAnswer;
          const id = recvAns.questionId;
          const a = this.answers[id];
          if (!a) {
            throw new Error(format(RPC_UNKNOWN_ANSWER_ID, id));
          }
          const recvTransform = recvAns.transform;
          const transform = promisedAnswerOpsToTransform(recvTransform);
          msg.addCap(answerPipelineClient(a, transform));
          break;
        }
        default: {
          throw new Error(format(RPC_UNKNOWN_CAP_DESCRIPTOR, desc.which()));
        }
      }
    }
  }

  addImport(id: number): Client {
    const importEntry = this.imports[id];
    if (importEntry) {
      importEntry.refs++;
      return importEntry.rc.ref();
    }
    const client = new ImportClient(this, id);
    const [rc, ref] = RefCount.new(client, this.finalize);
    this.imports[id] = {
      rc,
      refs: 1,
    };
    return ref;
  }

  findExport(id: number): Export | null {
    if (id > this.exports.length) {
      return null;
    }
    return this.exports[id];
  }

  addExport(client: Client): number {
    for (let i = 0; i < this.exports.length; i++) {
      const e = this.exports[i];
      if (e && isSameClient(e.rc._client, client)) {
        e.wireRefs++;
        return i;
      }
    }

    const id = this.exportID.next();
    const [rc, ref] = RefCount.new(client, this.finalize);
    const _export: Export = {
      client: ref,
      id,
      rc,
      wireRefs: 1,
    };
    if (id === this.exports.length) {
      this.exports.push(_export);
    } else {
      this.exports[id] = _export;
    }
    return id;
  }

  releaseExport(id: number, refs: number): void {
    const e = this.findExport(id);
    if (!e) {
      return;
    }
    e.wireRefs -= refs;
    if (e.wireRefs > 0) {
      return;
    }
    if (e.wireRefs < 0) {
      this.error(`warning: export ${id} has negative refcount (${e.wireRefs})`);
    }
    e.client.close();
    this.exports[id] = null;
    this.exportID.remove(id);
  }

  error(s: string): void {
    console.error(s);
  }

  newQuestion<CallParams extends Struct, CallResults extends Struct>(
    method?: Method<CallParams, CallResults>,
  ): Question<CallParams, CallResults> {
    const id = this.questionID.next();
    const q = new Question(this, id, method);
    if (id === this.questions.length) {
      this.questions.push(q);
    } else {
      this.questions[id] = q;
    }
    return q;
  }

  findQuestion<P extends Struct, R extends Struct>(
    id: number,
  ): Question<P, R> | null {
    if (id > this.questions.length) {
      return null;
    }
    return this.questions[id];
  }

  popQuestion<P extends Struct, R extends Struct>(
    id: number,
  ): Question<P, R> | null {
    const q = this.findQuestion<P, R>(id);
    if (!q) {
      return q;
    }
    this.questions[id] = null;
    this.questionID.remove(id);
    return q;
  }

  // TODO: cancel context?

  insertAnswer(id: number): AnswerEntry<any> | null {
    if (this.answers[id]) {
      return null;
    }
    const a = new AnswerEntry(this, id);
    this.answers[id] = a;
    return a;
  }

  popAnswer(id: number): AnswerEntry<any> | null {
    const a = this.answers[id];
    delete this.answers[id];
    return a;
  }

  shutdown(_err?: Error): void {
    // FIXME: unstub
    this.transport.close();
  }

  call<P extends Struct, R extends Struct>(
    client: Client,
    call: Call<P, R>,
  ): Answer<R> {
    // TODO: this has a lot of complicated logic in the Go implementation
    // (lockedCall).
    // Some of it has to do with locking, which we don't need
    return client.call(call);
  }

  fillParams<P extends Struct, R extends Struct>(
    payload: Payload,
    cl: Call<P, R>,
  ): void {
    const params = placeParams(cl, payload.content);
    payload.content = params;
    this.makeCapTable(payload.segment, (length) =>
      payload._initCapTable(length),
    );
  }

  makeCapTable(
    s: Segment,
    init: (length: number) => List<CapDescriptor>,
  ): void {
    const msgtab = s.message._capnp.capTable;
    if (!msgtab) {
      return;
    }
    const t = init(msgtab.length);
    for (const [i, client] of msgtab.entries()) {
      const desc = t.get(i);
      if (!client) {
        desc.none = true;
        continue;
      }
      this.descriptorForClient(desc, client);
    }
  }

  // descriptorForClient fills desc for client, adding it to the export
  // table if necessary.  The caller must be holding onto c.mu.
  descriptorForClient(desc: CapDescriptor, _client: Client): void {
    {
      dig: for (let client = _client; ; ) {
        // cf. https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/introspect.go#L113
        // TODO: fulfiller.EmbargoClient
        // TODO: embargoClient
        // TODO: queueClient
        // TODO: localAnswerClient
        if (client instanceof ImportClient) {
          if (client.conn !== this) {
            break dig;
          }
          desc.receiverHosted = client.id;
          return;
        } else if (client instanceof Ref) {
          client = client.client();
        } else if (client instanceof PipelineClient) {
          const p = client.pipeline;
          const ans = p.answer;
          const transform = p.transform();
          // TODO: fulfiller
          if (ans instanceof FixedAnswer) {
            let s: Struct | undefined;
            let err: Error | undefined;
            try {
              s = ans.structSync();
            } catch (error_) {
              err = error_ as Error;
            }
            client = clientFromResolution(transform, s, err);
          } else if (ans instanceof Question) {
            if (ans.state !== QuestionState.IN_PROGRESS) {
              client = clientFromResolution(transform, ans.obj, ans.err);
              continue;
            }
            if (ans.conn !== this) {
              break dig;
            }
            const a = desc._initReceiverAnswer();
            a.questionId = ans.id;
            transformToPromisedAnswer(a, p.transform());
            return;
          } else {
            break dig;
          }
        } else {
          break dig;
        }
      }
    }

    const id = this.addExport(_client);
    desc.senderHosted = id;
  }

  sendMessage(msg: RPCMessage): void {
    this.transport.sendMessage(msg);
  }

  private async work() {
    this.working = true;
    while (this.working) {
      try {
        const m = await this.transport.recvMessage();
        this.handleMessage(m);
      } catch (error_) {
        if (error_ !== undefined) {
          throw error_;
        }
        this.working = false;
      }
    }
  }
}

interface Export {
  id: number;
  rc: RefCount;
  client: Client;
  wireRefs: number;
}

export interface ImportEntry {
  rc: RefCount;
  refs: number;
}

export function answerPipelineClient<T extends Struct>(
  a: AnswerEntry<T>,
  transform: PipelineOp[],
): Client {
  return new LocalAnswerClient(a, transform);
}
