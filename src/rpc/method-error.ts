// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Method } from "./method";
import { Struct } from "../serialization/pointers/struct";
import { format } from "../util";
import { RPC_METHOD_ERROR } from "../errors";

export class MethodError<P extends Struct, R extends Struct> extends Error {
  constructor(
    public method: Method<P, R>,
    message: string,
  ) {
    super(
      format(
        RPC_METHOD_ERROR,
        method.interfaceName,
        method.methodName,
        message,
      ),
    );
  }
}
