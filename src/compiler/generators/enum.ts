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
  const nodeComment = extractJSDocs(sourceInfo);

  const propInits = fieldIndexInCodeOrder.map((index) => {
    const field = fields[index];
    const key = util.c2s(field.name);
    const val = (field as schema.Field).discriminantValue || index;
    return `
      ${getJSCommentForField(parentNode, fields, index, sourceInfo)}
      ${key}: ${val}`;
  });

  ctx.codeParts.push(`
    ${nodeComment}
    export const ${className} = {
      ${propInits.join(",\n")}
    } as const;

    export type ${className} = (typeof ${className})[keyof typeof ${className}];
  `);
}

/**
 * Retrieves the JSDoc comment for a specific enum or union field.
 *
 * For plain enums the field index directly maps to `sourceInfo.members`.
 * For unnamed unions the passed `fields` are a filtered subset of
 * `struct.fields`, so the original index is recovered by matching the field
 * name against the full struct field list.
 *
 * @param parentNode - The parent node (enum or struct) owning the fields
 * @param fields - The array of fields passed to `generateEnumNode`
 * @param fieldIndex - Index of the field within `fields`
 * @param sourceInfo - Source info for the parent node, if available
 * @returns Formatted JSDoc comment string, or an empty string if none exists
 */
function getJSCommentForField(
  parentNode: schema.Node,
  fields: (schema.Enumerant | schema.Field)[],
  fieldIndex: number,
  sourceInfo: schema.Node_SourceInfo | undefined,
): string {
  if (parentNode._isEnum) {
    return extractJSDocs(sourceInfo?.members.at(fieldIndex));
  }

  const structFields = parentNode.struct.fields;
  const fieldName = fields[fieldIndex].name;
  const fieldIndexInStruct = structFields.findIndex(
    (f) => f.name === fieldName,
  );
  return extractJSDocs(sourceInfo?.members.at(fieldIndexInStruct));
}
