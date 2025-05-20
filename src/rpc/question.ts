// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Struct } from "../serialization/pointers/struct";
import { Answer } from "./answer";
import { Conn } from "./conn";
import { Method } from "./method";
import { PipelineOp } from "./pipeline-op";
import { Deferred } from "./deferred";
import { Call } from "./call";
import { clientFromResolution } from "./client";
import { newMessage } from "./capability";
import { transformToPromisedAnswer } from "./promised-answer";
import { Pointer } from "../serialization/pointers/pointer";
import { NOT_IMPLEMENTED, RPC_FULFILL_ALREADY_CALLED } from "../errors";
import { getAs } from "../serialization/pointers/struct.utils";

export enum QuestionState {
  IN_PROGRESS,
  RESOLVED,
  CANCELED,
}

export class Question<P extends Struct, R extends Struct> implements Answer<R> {
  conn: Conn;
  id: number;
  method?: Method<P, R>;
  paramCaps: number[] = [];
  state = QuestionState.IN_PROGRESS;
  obj?: R;
  err?: Error;
  derived: PipelineOp[][] = [];
  deferred = new Deferred<R>();

  constructor(conn: Conn, id: number, method?: Method<P, R>) {
    this.conn = conn;
    this.id = id;
    this.method = method;
  }

  async struct(): Promise<R> {
    return await this.deferred.promise;
  }

  // start signals the question has been sent
  start(): void {
    // TODO: send finishMessage in case it gets cancelled
    // see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/question.go#L77
  }

  // fulfill is called to resolve a question successfully.
  // The caller must be holding onto q.conn.mu.
  fulfill(obj: Pointer): void {
    // TODO: derived, see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/question.go#L105
    if (this.state !== QuestionState.IN_PROGRESS) {
      throw new Error(RPC_FULFILL_ALREADY_CALLED);
    }
    // eslint-disable-next-line unicorn/prefer-ternary
    if (this.method) {
      this.obj = getAs(this.method.ResultsClass, obj);
    } else {
      // ugly, but when bootstrapping, method is null
      this.obj = obj as R;
    }
    this.state = QuestionState.RESOLVED;
    this.deferred.resolve(this.obj);
  }

  // reject is called to resolve a question with failure
  reject(err: Error): void {
    if (!err) {
      throw new Error(`Question.reject called with null`);
    }
    if (this.state !== QuestionState.IN_PROGRESS) {
      throw new Error(`Question.reject called more than once`);
    }
    this.err = err;
    this.state = QuestionState.RESOLVED;
    this.deferred.reject(err);
  }

  // cancel is called to resolve a question with cancellation.
  cancel(err: Error): boolean {
    if (this.state === QuestionState.IN_PROGRESS) {
      this.err = err;
      this.state = QuestionState.CANCELED;
      this.deferred.reject(err);
      return true;
    }
    return false;
  }

  pipelineCall<CallParams extends Struct, CallResults extends Struct>(
    transform: PipelineOp[],
    call: Call<CallParams, CallResults>,
  ): Answer<CallResults> {
    if (this.conn.findQuestion<P, R>(this.id) !== this) {
      if (this.state === QuestionState.IN_PROGRESS) {
        throw new Error(`question popped but not done`);
      }

      const client = clientFromResolution(transform, this.obj, this.err);
      // TODO: check that this is fine - this was conn.lockedCall
      return client.call(call);
    }

    const pipeq = this.conn.newQuestion(call.method);
    const msg = newMessage();
    const msgCall = msg._initCall();
    msgCall.questionId = pipeq.id;
    msgCall.interfaceId = call.method.interfaceId;
    msgCall.methodId = call.method.methodId;
    const target = msgCall._initTarget();
    const a = target._initPromisedAnswer();
    a.questionId = this.id;
    transformToPromisedAnswer(a, transform);
    const payload = msgCall._initParams();
    this.conn.fillParams(payload, call);
    this.conn.sendMessage(msg);
    this.addPromise(transform);
    return pipeq;
  }

  addPromise(transform: PipelineOp[]): void {
    for (const d of this.derived) {
      if (transformsEqual(transform, d)) {
        return;
      }
    }
    this.derived.push(transform);
  }

  pipelineClose(): void {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export function transformsEqual(t: PipelineOp[], u: PipelineOp[]): boolean {
  if (t.length !== u.length) {
    return false;
  }

  for (const [i, element_] of t.entries()) {
    if (element_.field !== u[i].field) {
      return false;
    }
  }
  return true;
}
