// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import * as schema from "../capnp/schema";
import { format } from "../util";

import { CodeGeneratorFileContext } from "./generators";
import { ConcreteListType } from "./constants";
import * as E from "./errors";
import * as util from "./util";

export function compareCodeOrder(
  a: { readonly codeOrder: number },
  b: { readonly codeOrder: number },
): number {
  return a.codeOrder - b.codeOrder;
}

export function getConcreteListType(
  ctx: CodeGeneratorFileContext,
  type: schema.Type,
): string {
  if (!type._isList) {
    return getJsType(ctx, type, false);
  }

  const { elementType } = type.list;
  const elementTypeWhich = elementType.which();

  if (elementTypeWhich === schema.Type.LIST) {
    return `$.PointerList(${getConcreteListType(ctx, elementType)})`;
  } else if (elementTypeWhich === schema.Type.STRUCT) {
    const structNode = tryLookupNode(ctx, elementType.struct.typeId);

    if (
      structNode &&
      structNode.struct.preferredListEncoding !==
        schema.ElementSize.INLINE_COMPOSITE
    ) {
      throw new Error(E.GEN_FIELD_NON_INLINE_STRUCT_LIST);
    }

    return `$.CompositeList(${getJsType(ctx, elementType, false)})`;
  }

  return ConcreteListType[elementTypeWhich];
}

export function getDisplayNamePrefix(node: schema.Node): string {
  return node.displayName.slice(node.displayNamePrefixLength);
}

/**
 * Converts a Cap'n Proto schema node's display name into a TypeScript class name.
 * Transforms names like "foo:bar.baz.qux" into "Bar_Baz_Qux".
 *
 * @param node - Schema node containing the display name to convert
 * @param node.displayName - Full display name including namespace (e.g. "foo:bar.baz.qux")
 * @returns Formatted class name with capitalized parts joined by underscores
 */
export function getFullClassName(node: schema.Node): string {
  return node.displayName
    .split(":")[1]
    .split(".")
    .map((s) => util.c2t(s))
    .join("_");
}

export function getJsType(
  ctx: CodeGeneratorFileContext,
  type: schema.Type,
  constructor: boolean,
): string {
  const whichType = type.which();

  switch (whichType) {
    case schema.Type.ANY_POINTER: {
      return "$.Pointer";
    }

    case schema.Type.BOOL: {
      return "boolean";
    }

    case schema.Type.DATA: {
      return "$.Data";
    }

    case schema.Type.ENUM: {
      const node = tryLookupNode(ctx, type.enum.typeId);
      if (!node) {
        // External enum type - generate a placeholder type name
        return `Enum_${type.enum.typeId.toString(16)}`;
      }
      return getFullClassName(node);
    }

    case schema.Type.FLOAT32:
    case schema.Type.FLOAT64:
    case schema.Type.INT16:
    case schema.Type.INT32:
    case schema.Type.INT8:
    case schema.Type.UINT16:
    case schema.Type.UINT32:
    case schema.Type.UINT8: {
      return "number";
    }

    case schema.Type.UINT64:
    case schema.Type.INT64: {
      return "bigint";
    }

    case schema.Type.INTERFACE: {
      const node = tryLookupNode(ctx, type.interface.typeId);
      if (!node) {
        // External interface type - generate a placeholder type name
        return `Interface_${type.interface.typeId.toString(16)}`;
      }
      return getFullClassName(node);
    }

    case schema.Type.LIST: {
      return `$.List${constructor ? "Ctor" : ""}<${getJsType(ctx, type.list.elementType, false)}>`;
    }

    case schema.Type.STRUCT: {
      const node = tryLookupNode(ctx, type.struct.typeId);
      if (!node) {
        // External struct type - generate a placeholder type name
        const c = `Struct_${type.struct.typeId.toString(16)}`;
        return constructor ? `$.StructCtor<${c}>` : c;
      }
      const c = getFullClassName(node);
      return constructor ? `$.StructCtor<${c}>` : c;
    }

    case schema.Type.TEXT: {
      return "string";
    }

    case schema.Type.VOID: {
      return "$.Void";
    }

    default: {
      throw new Error(format(E.GEN_UNKNOWN_TYPE, whichType));
    }
  }
}

/**
 * Gets all fields that are part of an unnamed union in a struct.
 * An unnamed union is a group of fields where only one can be set at a time.
 *
 * @param node - The struct schema node to check for unnamed union fields
 * @returns Array of fields that belong to the unnamed union
 */
export function getUnnamedUnionFields(node: schema.Node): schema.Field[] {
  return node.struct.fields.filter(
    (field) => field.discriminantValue !== schema.Field.NO_DISCRIMINANT,
  );
}

/**
 * Checks if a Node with the given ID exists in the schema context.
 *
 * @param ctx - The file context containing all nodes from the schema
 * @param lookup - Either a Node ID as a bigint, or an object containing an ID field
 * @returns whether a node with the given ID exists
 */
export function hasNode(
  ctx: CodeGeneratorFileContext,
  lookup: { readonly id: bigint } | bigint,
): boolean {
  const id = typeof lookup === "bigint" ? lookup : lookup.id;

  return ctx.nodes.some((n) => n.id === id);
}

export function loadRequestedFile(
  req: schema.CodeGeneratorRequest,
  file: schema.CodeGeneratorRequest_RequestedFile,
): CodeGeneratorFileContext {
  const ctx = new CodeGeneratorFileContext(req, file);

  const schema = lookupNode(ctx, file.id);

  ctx.tsPath = schema.displayName.replace(/\.capnp$/, "") + ".ts";

  return ctx;
}

/**
 * Looks up a Node in the schema by its ID.
 *
 * @param ctx - The file context containing all nodes from the schema
 * @param lookup - Either a Node ID as a bigint, or an object containing an ID field
 * @throws {Error} When the node cannot be found in the context
 * @returns The found Node from the schema
 */
export function lookupNode(
  ctx: CodeGeneratorFileContext,
  lookup: { readonly id: bigint } | bigint,
): schema.Node {
  const id = typeof lookup === "bigint" ? lookup : lookup.id;
  const node = ctx.nodes.find((n) => n.id === id);

  if (node === undefined) {
    throw new Error(format(E.GEN_NODE_LOOKUP_FAIL, id));
  }

  return node;
}

/**
 * Attempts to look up a Node in the schema by its ID without throwing.
 *
 * @param ctx - The file context containing all nodes from the schema
 * @param lookup - Either a Node ID as a bigint, or an object containing an ID field
 * @returns The found Node from the schema, or undefined if not found
 */
export function tryLookupNode(
  ctx: CodeGeneratorFileContext,
  lookup: { readonly id: bigint } | bigint,
): schema.Node | undefined {
  const id = typeof lookup === "bigint" ? lookup : lookup.id;
  return ctx.nodes.find((n) => n.id === id);
}

/**
 * Looks up source information for a Node in the schema by its ID.
 *
 * Source information includes documentation comments and other metadata
 * that was present in the original Cap'n Proto schema file.
 *
 * @param ctx - The file context containing all nodes and source info from the schema
 * @param lookup - Either a Node ID as a bigint, or an object containing an ID field
 * @returns The source info for the node if found, undefined otherwise
 */
export function lookupNodeSourceInfo(
  ctx: CodeGeneratorFileContext,
  lookup: { readonly id: bigint } | bigint,
): schema.Node_SourceInfo | undefined {
  const id = typeof lookup === "bigint" ? lookup : lookup.id;
  return ctx.req.sourceInfo.find((s) => s.id === id);
}

/**
 * Determines whether the given field needs a concrete list class.
 *
 * This is currently the case for composite lists
 * (`$.CompositeList`) and lists of lists (`capnp.PointerList`).
 *
 * @param field The field to check.
 * @returns Returns `true` if the field requires a concrete list class initializer.
 */
export function needsConcreteListClass(field: schema.Field): boolean {
  if (!field._isSlot) {
    return false;
  }

  const slotType = field.slot.type;

  if (!slotType._isList) {
    return false;
  }

  const { elementType } = slotType.list;

  return elementType._isStruct || elementType._isList;
}
