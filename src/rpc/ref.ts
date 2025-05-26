// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Client } from "./client";
import { RefCount } from "./refcount";
import { Finalize } from "./finalize";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { Answer } from "./answer";

// A Ref is a single reference to a client wrapped by RefCount.
export class Ref implements Client {
  closeState: { closed: boolean };

  constructor(
    public rc: RefCount,
    finalize: Finalize,
  ) {
    const closeState = { closed: false };
    this.closeState = closeState;
    finalize(this, () => {
      if (!closeState.closed) {
        closeState.closed = true;
        rc.decref();
      }
    });
  }

  call<P extends Struct, R extends Struct>(cl: Call<P, R>): Answer<R> {
    return this.rc.call(cl);
  }

  client(): Client {
    return this.rc._client;
  }

  close(): void {
    if (!this.closeState.closed) {
      this.closeState.closed = true;
      this.rc.decref();
    }
  }
}
