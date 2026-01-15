// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Pipeline } from "./pipeline";
import { Struct } from "../serialization/pointers/struct";
import { Client } from "./client";
import { PipelineOp } from "./pipeline-op";
import { Call } from "./call";
import { Answer } from "./answer";

/**
 * PipelineClient implements Client by calling to the pipeline's answer.
 */
export class PipelineClient<
  AnswerResults extends Struct,
  ParentResults extends Struct,
  Results extends Struct,
> implements Client {
  constructor(
    public pipeline: Pipeline<AnswerResults, ParentResults, Results>,
  ) {}

  transform(): PipelineOp[] {
    return this.pipeline.transform();
  }

  call<CallParams extends Struct, CallResults extends Struct>(
    call: Call<CallParams, CallResults>,
  ): Answer<CallResults> {
    return this.pipeline.answer.pipelineCall(this.transform(), call);
  }

  close(): void {
    this.pipeline.answer.pipelineClose(this.transform());
  }
}
