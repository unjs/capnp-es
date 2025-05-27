// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Client } from "./client";
import { Conn } from "./conn";
import {
  AnswerQCall,
  Answer,
  isRemoteCall,
  isLocalCall,
  isDisembargo,
} from "./answer";
import { Struct } from "../serialization";
import { Fulfiller } from "./fulfiller/fulfiller";
import { copyCall, Call } from "./call";
import { ErrorAnswer } from "./error-answer";
import { Queue } from "./queue";
import { Qcalls, QCallSlot } from "./qcalls";
import { RPC_CALL_QUEUE_FULL } from "../errors";
import { MessageTarget, Disembargo_Context_Which } from "../capnp/rpc";
import { newDisembargoMessage } from "./capability";
import { joinAnswer } from "./join";

// callQueueSize is the maximum number of calls that can be queued per answer or client.
export const callQueueSize = 64;

export class QueueClient implements Client {
  _client: Client;
  calls: Qcalls;
  q: Queue;

  constructor(
    public conn: Conn,
    client: Client,
    calls: AnswerQCall[],
  ) {
    this._client = client;
    this.calls = Qcalls.copyOf(calls);
    this.q = new Queue(this.calls, callQueueSize);
  }

  pushCall<P extends Struct, R extends Struct>(call: Call<P, R>): Answer<R> {
    const f = new Fulfiller<R>();
    try {
      call = copyCall(call);
    } catch (error_) {
      return new ErrorAnswer(error_ as Error);
    }
    const i = this.q.push();
    if (i === -1) {
      return new ErrorAnswer(new Error(RPC_CALL_QUEUE_FULL));
    }
    this.calls.data[i] = {
      call,
      f,
    };
    return f;
  }

  pushEmbargo(id: number, tgt: MessageTarget): void {
    const i = this.q.push();
    if (i === -1) {
      throw new Error(RPC_CALL_QUEUE_FULL);
    }
    this.calls.data[i] = {
      embargoID: id,
      embargoTarget: tgt,
    };
  }

  flushQueue(): void {
    let c: QCallSlot = null;
    {
      const i = this.q.front();
      if (i !== -1) {
        c = this.calls.data[i];
      }
    }

    while (c) {
      this.handle(c);
      this.q.pop();

      {
        const i = this.q.front();
        c = i === -1 ? null : this.calls.data[i];
      }
    }
  }

  handle(c: QCallSlot): void {
    if (!c) {
      return;
    }

    if (isRemoteCall(c)) {
      const answer = this._client.call(c.call);
      joinAnswer(c.a, answer);
    } else if (isLocalCall(c)) {
      const answer = this._client.call(c.call);
      joinAnswer(c.f, answer);
    } else if (isDisembargo(c)) {
      const msg = newDisembargoMessage(
        Disembargo_Context_Which.RECEIVER_LOOPBACK,
        c.embargoID,
      );
      msg.disembargo.target = c.embargoTarget;
      this.conn.sendMessage(msg);
    }
  }

  isPassthrough(): boolean {
    return this.q.len() === 0;
  }

  call<P extends Struct, R extends Struct>(call: Call<P, R>): Answer<R> {
    // Fast path: queue is flushed
    if (this.isPassthrough()) {
      return this._client.call(call);
    }

    // Add to queue
    return this.pushCall(call);
  }

  // close releases any resources associated with this client.
  // No further calls to the client should be made after calling Close.
  close(): void {
    // muffin
  }
}
