import * as schema from "../../capnp/schema";
import { compareCodeOrder } from "../node-util";
import * as util from "../util";
import type { CodeGeneratorFileContext } from ".";

/**
 * Generates TypeScript enum code from Cap'n Proto enum definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param className - The name to use for the generated enum type and const object
 * @param fields - Array of enum fields containing names and optional discriminant values
 */
export function generateEnumNode(
  ctx: CodeGeneratorFileContext,
  className: string,
  fields: schema.Enumerant[] | schema.Field[],
): void {
  const propInits = fields.sort(compareCodeOrder).map((e, index) => {
    const key = util.c2s(e.name);
    const val = (e as schema.Field).discriminantValue || index;
    return `${key}: ${val}`;
  });

  ctx.codeParts.push(`
    export const ${className} = {
      ${propInits.join(",\n")}
    } as const;

    export type ${className} = (typeof ${className})[keyof typeof ${className}];
  `);
}
