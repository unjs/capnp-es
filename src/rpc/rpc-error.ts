// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { RPC_ERROR } from "../errors";
import { Exception } from "../capnp/rpc";
import { format } from "../util";

export class RPCError extends Error {
  constructor(public exception: Exception) {
    super(format(RPC_ERROR, exception.reason));
  }
}

export function toException(exc: Exception, err: Error): void {
  if (err instanceof RPCError) {
    exc.reason = err.exception.reason;
    exc.type = err.exception.type;
    return;
  }
  exc.reason = err.message;
  exc.type = Exception.Type.FAILED;
}
