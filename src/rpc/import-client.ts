// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Conn } from "./conn";
import { Client } from "./client";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { Answer } from "./answer";
import { ErrorAnswer } from "./error-answer";
import { newMessage } from "./capability";
import { RPC_IMPORT_CLOSED } from "../errors";

// An ImportClient implements Client for a remote capability.
export class ImportClient implements Client {
  closed = false;

  constructor(
    public conn: Conn,
    public id: number,
  ) {}

  call<CallParams extends Struct, CallResults extends Struct>(
    cl: Call<CallParams, CallResults>,
  ): Answer<CallResults> {
    if (this.closed) {
      return new ErrorAnswer(new Error(RPC_IMPORT_CLOSED));
    }

    const q = this.conn.newQuestion(cl.method);
    const msg = newMessage();
    const msgCall = msg._initCall();
    msgCall.questionId = q.id;
    msgCall.interfaceId = cl.method.interfaceId;
    msgCall.methodId = cl.method.methodId;
    const target = msgCall._initTarget();
    target.importedCap = this.id;
    const payload = msgCall._initParams();
    this.conn.fillParams(payload, cl);
    // TODO: handle thrown exceptions here?

    this.conn.sendMessage(msg);
    // TODO: what about q.start()?
    return q;
  }

  close(): void {
    // TODO: figure out
  }
}
