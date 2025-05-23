// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Message } from "../../serialization/message";
import { Message as RPCMessage } from "../../capnp/rpc";
import { Deferred } from "../deferred";
import { Transport } from "../transport";

export abstract class DeferredTransport implements Transport {
  protected d?: Deferred<RPCMessage>;
  protected closed = false;

  abstract sendMessage(msg: RPCMessage): void;

  close(): void {
    this.closed = true;
    this.d?.reject();
  }

  recvMessage(): Promise<RPCMessage> {
    if (this.closed) {
      return Promise.reject();
    }
    if (this.d) {
      this.d.reject();
    }
    this.d = new Deferred();
    return this.d.promise;
  }

  protected reject = (err: unknown): void => {
    this.d?.reject(err);
  };

  protected resolve = (buf: ArrayBuffer): void => {
    try {
      this.d?.resolve(new Message(buf, false).getRoot(RPCMessage));
    } catch (error_) {
      this.d?.reject(error_);
    }
  };
}
