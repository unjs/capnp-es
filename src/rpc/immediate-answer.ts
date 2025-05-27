// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { FixedAnswer } from "./fixed-answer";
import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Client } from "./client";
import { transformPtr } from "./transform-ptr";
import { Call } from "./call";
import { Answer } from "./answer";
import { getInterfaceClientOrNull } from "../serialization/pointers/struct.utils";

export class ImmediateAnswer<R extends Struct> extends FixedAnswer<R> {
  constructor(public s: R) {
    super();
  }

  structSync(): R {
    return this.s;
  }

  findClient(transform: PipelineOp[]): Client {
    const p = transformPtr(this.s, transform);
    return getInterfaceClientOrNull(p);
  }

  pipelineCall<CallParams extends Struct, CallResults extends Struct>(
    transform: PipelineOp[],
    call: Call<CallParams, CallResults>,
  ): Answer<CallResults> {
    return this.findClient(transform).call(call);
  }

  pipelineClose(transform: PipelineOp[]): void {
    this.findClient(transform).close();
  }
}
