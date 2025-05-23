import * as schema from "../../capnp/schema";
import { format } from "../../util";
import * as E from "../errors";
import { lookupNode, getFullClassName } from "../node-util";
import { generateEnumNode } from "./enum";
import { generateStructNode } from "./struct";

/**
 * Generates TypeScript code for a Cap'n Proto schema node.
 * Handles different node types (struct, enum, interface) and their nested definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param node - The schema node to generate code for
 *
 * @remarks
 * - Generates nested nodes first to ensure proper symbol references
 * - Handles group nodes that appear before struct nodes
 * - Skips already generated nodes to avoid duplicates
 * - Throws error for unknown node types
 */
export function generateNode(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);

  if (ctx.generatedNodeIds.has(nodeIdHex)) {
    // skip already generated nodes
    return;
  }

  ctx.generatedNodeIds.add(nodeIdHex);

  // An array of nodes that are nested within this node;
  // these must appear first since those symbols will be
  // referenced in the node's class definition.
  const nestedNodes = node.nestedNodes.map((node) => lookupNode(ctx, node));

  for (const nestedNode of nestedNodes) {
    generateNode(ctx, nestedNode);
  }

  // An array of group structs formed as children of this struct.
  // They appear before the struct node in the file.
  const groupNodes = ctx.nodes.filter(
    (node) => node.scopeId === nodeId && node._isStruct && node.struct.isGroup,
  );
  for (const groupNode of groupNodes) {
    generateNode(ctx, groupNode);
  }

  const nodeType = node.which();

  switch (nodeType) {
    case schema.Node.STRUCT: {
      generateStructNode(ctx, node);
      break;
    }

    case schema.Node.CONST: {
      // Const nodes are generated along with the containing class, ignore these.
      break;
    }

    case schema.Node.ENUM: {
      generateEnumNode(
        ctx,
        getFullClassName(node),
        node,
        node.enum.enumerants.toArray(),
      );
      break;
    }

    case schema.Node.INTERFACE: {
      generateStructNode(ctx, node);
      break;
    }

    case schema.Node.ANNOTATION: {
      break;
    }

    // case s.Node.FILE:
    default: {
      throw new Error(
        format(E.GEN_NODE_UNKNOWN_TYPE, nodeType /* s.Node_Which[whichNode] */),
      );
    }
  }
}

export class CodeGeneratorContext {
  files: CodeGeneratorFileContext[] = [];
}

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
