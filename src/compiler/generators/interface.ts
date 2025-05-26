import * as schema from "../../capnp/schema";
import {
  getDisplayNamePrefix,
  getFullClassName,
  lookupNode,
  lookupNodeSourceInfo,
} from "../node-util";
import * as util from "../util";
import type { CodeGeneratorFileContext } from ".";
import { generateInterfaceClasses } from "./rpc";
import { createNestedNodeProperty, createValueExpression } from "./struct";
import { extractJSDocs } from "./helpers";

/**
 * Generates TypeScript class definition for a Cap'n Proto interface node.
 * Creates class members, properties, methods and nested type definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param node - The schema node to generate code for
 *
 * @remarks
 * - Creates static properties for constants and nested types
 * - Generate interface methods
 * - Preserves documentation comments from schema
 */
export function generateInterfaceNode(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node.nestedNodes
    .map((n) => lookupNode(ctx, n))
    .filter((n) => !n._isConst && !n._isAnnotation);
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);

  // List of field indexes in code order
  const consts = ctx.nodes.filter((n) => n.scopeId === nodeId && n._isConst);

  const members: string[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(
    ...consts.map((node) => {
      const name = util.c2s(getDisplayNamePrefix(node));
      const value = createValueExpression(node.const.value);
      return `static readonly ${name} = ${value}`;
    }),
    ...nestedNodes.map((node) => createNestedNodeProperty(node)),
    `static readonly Client = ${fullClassName}$Client;
     static readonly Server = ${fullClassName}$Server;
     static readonly _capnp = {
        displayName: "${displayNamePrefix}",
        id: "${nodeIdHex}",
        size: new $.ObjectSize(0, 0),
      }
    toString(): string { return "${fullClassName}_" + super.toString(); }`,
  );

  const docComment = extractJSDocs(lookupNodeSourceInfo(ctx, node));

  const classCode = `
  ${docComment}
  export class ${fullClassName} extends $.Interface {
    ${members.join("\n")}
  }`;

  generateInterfaceClasses(ctx, node);

  ctx.codeParts.push(classCode);
}
