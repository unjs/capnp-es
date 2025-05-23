import * as schema from "../../capnp/schema";
import {
  getDisplayNamePrefix,
  getFullClassName,
  lookupNode,
  getUnnamedUnionFields,
  compareCodeOrder,
  needsConcreteListClass,
  lookupNodeSourceInfo,
  getJsType,
} from "../node-util";
import * as util from "../util";
import { generateEnumNode } from "./enum";
import type { CodeGeneratorFileContext } from ".";
import { createBigIntExpression, extractJSDocs } from "./helpers";
import { generateInterfaceClasses } from "./rpc";
import { Primitives, ConcreteListType } from "../constants";
import * as E from "../errors";
import {
  testWhich,
  getUint16,
  getPointer,
} from "../../serialization/pointers/struct.utils";
import * as capnp from "../..";
import { format, pad } from "../../util";

/**
 * Generates TypeScript class definition for a Cap'n Proto struct or interface node.
 * Creates class members, properties, methods and nested type definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param node - The schema node to generate code for
 *
 * @remarks
 * - Generates enum definitions for unnamed unions if present
 * - Creates static properties for constants and nested types
 * - Generates getter/setter methods for all fields
 * - Handles special cases for interfaces (Client/Server classes)
 * - Preserves documentation comments from schema
 */
export function generateStructNode(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  const type = node.which() === schema.Node.STRUCT ? "struct" : "interface";

  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node.nestedNodes
    .map((n) => lookupNode(ctx, n))
    .filter((n) => !n._isConst && !n._isAnnotation);
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);
  const unionFields = getUnnamedUnionFields(node);

  const struct = type === "struct" ? node.struct : undefined;
  const dataWordCount = struct ? struct.dataWordCount : 0;
  const dataByteLength = struct ? dataWordCount * 8 : 0;
  const discriminantCount = struct ? struct.discriminantCount : 0;
  const discriminantOffset = struct ? struct.discriminantOffset : 0;
  const fields = struct?.fields.toArray() ?? [];
  const pointerCount = struct ? struct.pointerCount : 0;

  // List of field indexes in code order
  const fieldIndexInCodeOrder = fields
    .map(({ codeOrder }, fieldIndex) => ({ fieldIndex, codeOrder }))
    .sort(compareCodeOrder)
    .map(({ fieldIndex }) => fieldIndex);

  const concreteLists = fields
    .filter((f) => needsConcreteListClass(f))
    .sort(compareCodeOrder);
  const consts = ctx.nodes.filter((n) => n.scopeId === nodeId && n._isConst);
  const hasUnnamedUnion = discriminantCount !== 0;

  if (hasUnnamedUnion) {
    generateEnumNode(ctx, fullClassName + "_Which", node, unionFields);
  }

  const members: string[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(
    ...consts.map((node) => {
      const name = util.c2s(getDisplayNamePrefix(node));
      const value = createValueExpression(node.const.value);
      return `static readonly ${name} = ${value}`;
    }),
    ...unionFields
      .sort(compareCodeOrder)
      .map((field) => createUnionConstProperty(fullClassName, field)),
    ...nestedNodes.map((node) => createNestedNodeProperty(node)),
  );

  if (type === "interface") {
    members.push(`
      static readonly Client = ${fullClassName}$Client;
      static readonly Server = ${fullClassName}$Server;
      `);
  }

  const defaultValues: string[] = [];
  for (const index of fieldIndexInCodeOrder) {
    const field = fields[index];
    if (
      field._isSlot &&
      field.slot.hadExplicitDefault &&
      field.slot.type.which() !== schema.Type.VOID
    ) {
      defaultValues.push(generateDefaultValue(field));
    }
  }

  members.push(
    `
      static readonly _capnp = {
        displayName: "${displayNamePrefix}",
        id: "${nodeIdHex}",
        size: new $.ObjectSize(${dataByteLength}, ${pointerCount}),
        ${defaultValues.join(",")}
      }`,
    ...concreteLists.map((field) => createConcreteListProperty(ctx, field)),
  );

  for (const index of fieldIndexInCodeOrder) {
    const field = fields[index];
    generateStructFieldMethods(ctx, members, node, field, index);
  }

  // toString(): string { return 'MyStruct_' + super.toString(); }
  members.push(
    `toString(): string { return "${fullClassName}_" + super.toString(); }`,
  );

  if (hasUnnamedUnion) {
    members.push(`
      which(): ${fullClassName}_Which {
        return $.utils.getUint16(${discriminantOffset * 2}, this) as ${fullClassName}_Which;
      }
    `);
  }

  const docComment = extractJSDocs(lookupNodeSourceInfo(ctx, node));

  const classCode = `
  ${docComment}
  export class ${fullClassName} extends ${type === "interface" ? "$.Interface" : "$.Struct"} {
    ${members.join("\n")}
  }`;

  // Make sure the interface classes are generated first.
  if (type === "interface") {
    generateInterfaceClasses(ctx, node);
  }

  ctx.codeParts.push(classCode);

  // Write out the concrete list type initializer after all the class definitions. It can't be initialized within the
  // class's static initializer because the nested type might not be defined yet.
  // FIXME: This might be solvable with topological sorting?
  ctx.concreteLists.push(
    ...concreteLists.map((field): [string, schema.Field] => [
      fullClassName,
      field,
    ]),
  );
} /**
 * Generates TypeScript code for struct field methods.
 *
 * This function creates accessor methods and properties for a Cap'n Proto struct field:
 * - Getters and setters for the field value
 * - Adoption and disowning methods for pointer fields
 * - Initialization methods for lists and structs
 * - Union discriminant handling for fields in unnamed unions
 *
 * @param ctx - The code generator context
 * @param members - Array of code parts to append the generated methods to
 * @param node - The struct node containing the field
 * @param field - The field to generate methods for
 * @param fieldIndex - Index of the field in the struct's field list (for documentation lookup)
 */

export function generateStructFieldMethods(
  ctx: CodeGeneratorFileContext,
  members: string[],
  node: schema.Node,
  field: schema.Field,
  fieldIndex: number,
): void {
  let jsType: string;
  let whichType: schema.Type_Which | string;

  if (field._isSlot) {
    const slotType = field.slot.type;
    jsType = getJsType(ctx, slotType, false);
    whichType = slotType.which();
  } else if (field._isGroup) {
    jsType = getFullClassName(lookupNode(ctx, field.group.typeId));
    whichType = "group";
  } else {
    throw new Error(format(E.GEN_UNKNOWN_STRUCT_FIELD, field.which()));
  }

  const isInterface = whichType === schema.Type.INTERFACE;
  if (isInterface) {
    jsType = `${jsType}$Client`;
  }

  const { discriminantOffset } = node.struct;
  const { name } = field;
  // `constructor` is not a valid accessor, use `$constructor` instead
  const accessorName = name === "constructor" ? "$constructor" : name;
  const capitalizedName = util.c2t(name);
  const { discriminantValue } = field;
  const fullClassName = getFullClassName(node);
  const hadExplicitDefault = field._isSlot && field.slot.hadExplicitDefault;
  const maybeDefaultArg = hadExplicitDefault
    ? `, ${fullClassName}._capnp.default${capitalizedName}`
    : "";
  const union = discriminantValue !== schema.Field.NO_DISCRIMINANT;
  const offset = field._isSlot ? field.slot.offset : 0;

  let adopt = false;
  let disown = false;
  let init;
  let has = false;
  let get;
  let set;

  switch (whichType) {
    case schema.Type.ANY_POINTER: {
      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getPointer(${offset}, this${maybeDefaultArg})`;
      set = `$.utils.copyFrom(value, ${get})`;
      break;
    }

    case schema.Type.BOOL:
    case schema.Type.ENUM:
    case schema.Type.FLOAT32:
    case schema.Type.FLOAT64:
    case schema.Type.INT16:
    case schema.Type.INT32:
    case schema.Type.INT64:
    case schema.Type.INT8:
    case schema.Type.UINT16:
    case schema.Type.UINT32:
    case schema.Type.UINT64:
    case schema.Type.UINT8: {
      const { byteLength, getter, setter } = Primitives[whichType];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = offset * byteLength;
      get = `$.utils.${getter}(${byteOffset}, this${maybeDefaultArg})`;
      set = `$.utils.${setter}(${byteOffset}, value, this${maybeDefaultArg})`;
      if (whichType === schema.Type.ENUM) {
        get = `${get} as ${jsType}`;
      }
      break;
    }

    case schema.Type.DATA: {
      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getData(${offset}, this${maybeDefaultArg})`;
      set = `$.utils.copyFrom(value, $.utils.getPointer(${offset}, this))`;
      init = `$.utils.initData(${offset}, length, this)`;
      break;
    }

    case schema.Type.INTERFACE: {
      get = `new ${jsType}($.utils.getInterfaceClientOrNullAt(${offset}, this))`;
      set = `$.utils.setInterfacePointer(this.segment.message.addCap(value.client), $.utils.getPointer(${offset}, this))`;
      break;
    }

    case schema.Type.LIST: {
      const whichElementType = field.slot.type.list.elementType.which();
      let listClass = ConcreteListType[whichElementType];

      if (
        whichElementType === schema.Type.LIST ||
        whichElementType === schema.Type.STRUCT
      ) {
        listClass = `${fullClassName}._${capitalizedName}`;
      } else if (listClass === undefined) {
        throw new Error(
          format(E.GEN_UNSUPPORTED_LIST_ELEMENT_TYPE, whichElementType),
        );
      }

      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getList(${offset}, ${listClass}, this${maybeDefaultArg})`;
      set = `$.utils.copyFrom(value, $.utils.getPointer(${offset}, this))`;
      init = `$.utils.initList(${offset}, ${listClass}, length, this)`;
      if (whichElementType === schema.Type.ENUM) {
        get = `${get} as ${jsType}`;
        init = `${init} as ${jsType}`;
      }
      break;
    }

    case schema.Type.STRUCT: {
      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getStruct(${offset}, ${jsType}, this${maybeDefaultArg})`;
      set = `$.utils.copyFrom(value, $.utils.getPointer(${offset}, this))`;
      init = `$.utils.initStructAt(${offset}, ${jsType}, this)`;
      break;
    }

    case schema.Type.TEXT: {
      get = `$.utils.getText(${offset}, this${maybeDefaultArg})`;
      set = `$.utils.setText(${offset}, value, this)`;
      break;
    }

    case schema.Type.VOID: {
      break;
    }

    case "group": {
      if (hadExplicitDefault) {
        throw new Error(format(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE, "group"));
      }
      get = `$.utils.getAs(${jsType}, this)`;
      init = get;
      break;
    }

    default: {
      // TODO Maybe this should be an error?
      break;
    }
  }

  if (adopt) {
    members.push(`
      _adopt${capitalizedName}(value: $.Orphan<${jsType}>): void {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        $.utils.adopt(value, $.utils.getPointer(${offset}, this));
      }
    `);
  }

  if (disown) {
    members.push(`
      _disown${capitalizedName}(): $.Orphan<${jsType}> {
        return $.utils.disown(this.${name === "constructor" ? `$${name}` : name});
      }
    `);
  }

  if (get) {
    const docComment = extractJSDocs(
      lookupNodeSourceInfo(ctx, node)?.members.at(fieldIndex),
    );

    members.push(`
      ${docComment}
      get ${accessorName}(): ${jsType} {
        ${union ? `$.utils.testWhich(${JSON.stringify(name)}, $.utils.getUint16(${discriminantOffset * 2}, this), ${discriminantValue}, this);` : ""}
        return ${get};
      }
    `);
  }

  if (has) {
    members.push(`
      _has${capitalizedName}(): boolean {
        return !$.utils.isNull($.utils.getPointer(${offset}, this));
      }
    `);
  }

  if (init) {
    const params =
      whichType === schema.Type.DATA || whichType === schema.Type.LIST
        ? `length: number`
        : "";
    members.push(`
      _init${capitalizedName}(${params}): ${jsType} {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        return ${init};
      }
    `);
  }

  if (union) {
    members.push(`
      get _is${capitalizedName}(): boolean {
        return $.utils.getUint16(${discriminantOffset * 2}, this) === ${discriminantValue};
      }
    `);
  }

  if (set || union) {
    const param = set ? `value: ${jsType}` : `_: true`;
    members.push(`
      set ${accessorName}(${param}) {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        ${set ? `${set};` : ""}
      }
    `);
  }
}
/**
 * Generates a string representation of a default value expression for a Cap'n Proto field.
 *
 * This function handles different field types and their default value representations:
 * - Pointers (ANY_POINTER, DATA, LIST, STRUCT, INTERFACE)
 * - Text fields
 * - Boolean fields (with bit offset)
 * - Numeric types (ENUM, FLOAT32/64, INT8/16/32/64, UINT8/16/32/64)
 *
 * @param field - The Cap'n Proto field definition containing type and default value information
 * @returns A string containing the default value expression
 * @throws {Error} If the field type is not supported for default values
 */

export function generateDefaultValue(field: schema.Field): string {
  const { name, slot } = field;
  const whichSlotType = slot.type.which();
  const primitive = Primitives[whichSlotType];
  let initializer: string;

  switch (whichSlotType) {
    case schema.Type_Which.ANY_POINTER:
    case schema.Type_Which.DATA:
    case schema.Type_Which.LIST:
    case schema.Type_Which.STRUCT:
    case schema.Type_Which.INTERFACE: {
      initializer = createValueExpression(slot.defaultValue);
      break;
    }

    case schema.Type_Which.TEXT: {
      initializer = JSON.stringify(slot.defaultValue.text);
      break;
    }

    case schema.Type_Which.BOOL: {
      const value = createValueExpression(slot.defaultValue);
      const bitOffset = slot.offset % 8;
      initializer = `$.${primitive.mask}(${value}, ${bitOffset})`;
      break;
    }

    case schema.Type_Which.ENUM:
    case schema.Type_Which.FLOAT32:
    case schema.Type_Which.FLOAT64:
    case schema.Type_Which.INT16:
    case schema.Type_Which.INT32:
    case schema.Type_Which.INT64:
    case schema.Type_Which.INT8:
    case schema.Type_Which.UINT16:
    case schema.Type_Which.UINT32:
    case schema.Type_Which.UINT64:
    case schema.Type_Which.UINT8: {
      const value = createValueExpression(slot.defaultValue);
      initializer = `$.${primitive.mask}(${value})`;

      break;
    }

    default: {
      throw new Error(
        format(
          E.GEN_UNKNOWN_DEFAULT,
          whichSlotType /* s.Type_Which[whichSlotType] */,
        ),
      );
    }
  }

  return `default${util.c2t(name)}: ${initializer}`;
}

export function createConcreteListProperty(
  ctx: CodeGeneratorFileContext,
  field: schema.Field,
): string {
  const name = `_${util.c2t(field.name)}`;
  const type = getJsType(ctx, field.slot.type, true);
  return `static ${name}: ${type};`;
}

export function createUnionConstProperty(
  fullClassName: string,
  field: schema.Field,
): string {
  const name = util.c2s(field.name);
  const initializer = `${fullClassName}_Which.${name}`;

  return `static readonly ${name} = ${initializer};`;
}

export function createValueExpression(value: schema.Value): string {
  let p: capnp.Pointer;

  switch (value.which()) {
    case schema.Value.BOOL: {
      return value.bool ? `true` : `false`;
    }

    case schema.Value.ENUM: {
      return String(value.enum);
    }

    case schema.Value.FLOAT32: {
      return String(value.float32);
    }

    case schema.Value.FLOAT64: {
      return String(value.float64);
    }

    case schema.Value.INT8: {
      return String(value.int8);
    }

    case schema.Value.INT16: {
      return String(value.int16);
    }

    case schema.Value.INT32: {
      return String(value.int32);
    }

    case schema.Value.INT64: {
      return createBigIntExpression(value.int64);
    }

    case schema.Value.UINT8: {
      return String(value.uint8);
    }

    case schema.Value.UINT16: {
      return String(value.uint16);
    }

    case schema.Value.UINT32: {
      return String(value.uint32);
    }

    case schema.Value.UINT64: {
      return createBigIntExpression(value.uint64);
    }

    case schema.Value.TEXT: {
      return JSON.stringify(value.text);
    }

    case schema.Value.VOID: {
      return "undefined";
    }

    case schema.Value.ANY_POINTER: {
      p = value.anyPointer;
      break;
    }

    case schema.Value.DATA: {
      p = value.data;
      break;
    }

    case schema.Value.LIST: {
      p = value.list;
      break;
    }

    case schema.Value.STRUCT: {
      p = value.struct;
      break;
    }

    case schema.Value.INTERFACE: {
      testWhich("interface", getUint16(0, value), 17, value);
      p = getPointer(0, value);
      break;
    }
    default: {
      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, value.which()));
    }
  }

  const message = new capnp.Message();
  message.setRoot(p);

  const buf = new Uint8Array(message.toPackedArrayBuffer());

  const values: string[] = [];
  for (let i = 0; i < buf.byteLength; i++) {
    values.push(`0x${pad(buf[i].toString(16), 2)}`);
  }

  return `$.readRawPointer(new Uint8Array([${values.join(",")}]).buffer)`;
}

export function createNestedNodeProperty(node: schema.Node): string {
  const name = getDisplayNamePrefix(node);
  const initializer = getFullClassName(node);
  return `static readonly ${name} = ${initializer};`;
}
