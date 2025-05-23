// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import * as schema from "../capnp/schema";

export class CodeGeneratorFileContext {
  // inputs
  readonly nodes: schema.Node[];
  readonly imports: schema.CodeGeneratorRequest_RequestedFile_Import[];

  // outputs
  concreteLists: Array<[string, schema.Field]> = [];
  generatedNodeIds = new Set<string>();
  generatedResultsPromiseIds = new Set<bigint>();
  tsPath = "";
  codeParts: string[] = [];

  constructor(
    public readonly req: schema.CodeGeneratorRequest,
    public readonly file: schema.CodeGeneratorRequest_RequestedFile,
  ) {
    this.nodes = req.nodes.toArray();
    this.imports = file.imports.toArray();
  }

  toString(): string {
    return this.file?.filename ?? "CodeGeneratorFileContext()";
  }
}
