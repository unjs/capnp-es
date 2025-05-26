// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Client } from "./client";
import { RPC_NULL_CLIENT } from "../errors";
import { Answer } from "./answer";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { ErrorAnswer } from "./error-answer";

export class ErrorClient implements Client {
  constructor(public err: Error) {}

  call<P extends Struct, R extends Struct>(_call: Call<P, R>): Answer<R> {
    return new ErrorAnswer(this.err);
  }

  close(): void {
    throw this.err;
  }
}

export function clientOrNull(client: Client | null): Client {
  return client ?? new ErrorClient(new Error(RPC_NULL_CLIENT));
}
