import * as schema from "../../capnp/schema";
import { compareCodeOrder, lookupNodeSourceInfo } from "../node-util";
import * as util from "../util";
import type { CodeGeneratorFileContext } from ".";
import { extractJSDocs } from "./helpers";

/**
 * Generates TypeScript enum code from Cap'n Proto enum definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param className - The name to use for the generated enum type and const object
 * @param parentNode - The parent of the fields used to retrieve the source info (comments)
 * @param fields - Array of enum fields containing names and optional discriminant values
 */
export function generateEnumNode(
  ctx: CodeGeneratorFileContext,
  className: string,
  parentNode: schema.Node,
  fields: schema.Enumerant[] | schema.Field[],
): void {
  const fieldIndexInCodeOrder = fields
    .map(({ codeOrder }, fieldIndex) => ({ fieldIndex, codeOrder }))
    .sort(compareCodeOrder)
    .map(({ fieldIndex }) => fieldIndex);

  const sourceInfo = lookupNodeSourceInfo(ctx, parentNode);

  const propInits = fieldIndexInCodeOrder.map((index) => {
    const field = fields[index];
    const docComment = extractJSDocs(sourceInfo?.members.at(index));
    const key = util.c2s(field.name);
    const val = (field as schema.Field).discriminantValue || index;
    return `
      ${docComment}
      ${key}: ${val}`;
  });

  ctx.codeParts.push(`
    export const ${className} = {
      ${propInits.join(",\n")}
    } as const;

    export type ${className} = (typeof ${className})[keyof typeof ${className}];
  `);
}
