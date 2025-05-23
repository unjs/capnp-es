import * as schema from "../../capnp/schema";
import { getConcreteListType } from "../node-util";
import * as util from "../util";
import type { CodeGeneratorFileContext } from ".";

/**
 * Generates a concrete list type initializer for a Cap'n Proto field.
 *
 * This function creates the static list type property initialization code for fields
 * that require concrete list implementations (like lists of structs or nested lists).
 *
 * @param ctx - The code generator context
 * @param fullClassName - The fully qualified name of the containing class
 * @param field - The Cap'n Proto field definition requiring a concrete list type
 */
export function generateConcreteListInitializer(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  field: schema.Field,
): void {
  const name = `_${util.c2t(field.name)}`;
  const type = getConcreteListType(ctx, field.slot.type);

  ctx.codeParts.push(`${fullClassName}.${name} = ${type};`);
}
