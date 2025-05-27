// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { PipelineClient } from "./pipeline-client";
import { Struct, StructCtor } from "../serialization/pointers/struct";
import { Answer } from "./answer";
import { PipelineOp } from "./pipeline-op";
import { transformPtr } from "./transform-ptr";
import { Pointer } from "../serialization/pointers/pointer";
import { copyFrom } from "../serialization/pointers/pointer.utils";
import { getAs, initStruct } from "../serialization/pointers/struct.utils";

// TODO: figure out if we can respect no-any.
// It doesn't appear so because PipelineOp has just
// a field index, so we have no typing information.

/**
 * A Pipeline is a generic wrapper for an answer
 */
export class Pipeline<
  AnswerResults extends Struct,
  ParentResults extends Struct,
  Results extends Struct,
> {
  op: PipelineOp;
  pipelineClient?: PipelineClient<AnswerResults, ParentResults, Results>;

  // Returns a new Pipeline based on an answer
  constructor(
    public ResultsClass: StructCtor<Results>,
    public answer: Answer<AnswerResults>,
    op?: PipelineOp,
    public parent?: Pipeline<AnswerResults, Struct, ParentResults>,
  ) {
    this.op = op || { field: 0 };
  }

  // transform returns the operations needed to transform the root answer
  // into the value p represents.
  transform(): PipelineOp[] {
    const xform: PipelineOp[] = [];
    for (
      // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
      let q: Pipeline<any, any, any> | null = this;
      q.parent;
      q = q.parent
    ) {
      xform.unshift(q.op);
    }
    return xform;
  }

  // Struct waits until the answer is resolved and returns the struct
  // this pipeline represents.
  async struct(): Promise<Results> {
    const s = await this.answer.struct();
    const t = transformPtr(s, this.transform());
    if (!t) {
      if (this.op.defaultValue) {
        copyFrom(this.op.defaultValue, t);
      } else {
        initStruct(this.ResultsClass._capnp.size, t);
      }
    }
    return getAs(this.ResultsClass, t);
  }

  // client returns the client version of this pipeline
  client(): PipelineClient<AnswerResults, ParentResults, Results> {
    if (!this.pipelineClient) {
      this.pipelineClient = new PipelineClient(this);
    }
    return this.pipelineClient;
  }

  // getPipeline returns a derived pipeline which yields the pointer field given
  getPipeline<RR extends Struct>(
    ResultsClass: StructCtor<RR>,
    off: number,
    defaultValue?: Pointer,
  ): Pipeline<AnswerResults, Results, RR> {
    return new Pipeline(
      ResultsClass,
      this.answer,
      <PipelineOp>{ field: off, defaultValue },
      this,
    );
  }
}
