// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import * as schema from "../capnp/schema";
import { format } from "../util";

import {
  createNestedNodeProperty,
  createUnionConstProperty,
  createValueExpression,
  createConcreteListProperty,
  createBigIntExpression,
} from "./ast-creators";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { ConcreteListType, Primitives, TS_FILE_ID } from "./constants";
import * as E from "./errors";
import {
  compareCodeOrder,
  getConcreteListType,
  getDisplayNamePrefix,
  getFullClassName,
  getJsType,
  getUnnamedUnionFields,
  hasNode,
  lookupNode,
  lookupNodeSourceInfo,
  needsConcreteListClass,
} from "./file";
import * as util from "./util";

/**
 * Generates the import statement for the capnp-es runtime library.
 *
 * This function checks for a custom import path annotation in the schema file.
 * If found, it uses that path instead of the default 'capnp-es' import.
 *
 * The import path can be customized using the ts.importPath annotation:
 *
 * ```capnp
 * using Ts = import "/capnp/ts.capnp";
 * $Ts.importPath("../custom/path/to/capnp-es");
 * ```
 *
 * @param ctx - The code generator context containing file and annotation information
 */
export function generateCapnpImport(ctx: CodeGeneratorFileContext): void {
  // Look for the special importPath annotation on the file to see if we need a different import path for capnp-es.

  const fileNode = lookupNode(ctx, ctx.file);
  const tsFileId = util.hexToBigInt(TS_FILE_ID);
  // This may be undefined if ts.capnp is not imported; fine, we'll just use the default.
  const tsAnnotationFile = ctx.nodes.find((n) => n.id === tsFileId);
  // We might not find the importPath annotation; that's definitely a bug but let's move on.
  const tsImportPathAnnotation = tsAnnotationFile?.nestedNodes.find(
    (n) => n.name === "importPath",
  );
  // There may not necessarily be an import path annotation on the file node. That's fine.
  const importAnnotation =
    tsImportPathAnnotation &&
    fileNode.annotations.find((a) => a.id === tsImportPathAnnotation.id);
  const importPath =
    importAnnotation === undefined ? "capnp-es" : importAnnotation.value.text;

  ctx.codeParts.push(`import * as $ from '${importPath}';`);
}

/**
 * Generates TypeScript import statements for nested types defined in Cap'n Proto schema files.
 *
 * @param ctx - The file context containing import information and statements
 * @param ctx.imports - List of schema files to import from
 * @param ctx.statements - Collection of TypeScript statements being generated
 */
export function generateNestedImports(ctx: CodeGeneratorFileContext): void {
  for (const imp of ctx.imports) {
    const { name } = imp;
    let importPath: string;

    if (name.startsWith("/capnp/")) {
      importPath = `capnp-es/capnp/${name.slice(7).replace(/\.capnp$/, "")}`;
    } else {
      importPath = name.replace(/\.capnp$/, ".js");
      if (importPath[0] !== ".") {
        importPath = `./${importPath}`;
      }
    }

    const importNode = lookupNode(ctx, imp);

    const imports = getImportNodes(ctx, importNode)
      .map((n) => getFullClassName(n))
      .join(", ");

    if (imports.length === 0) {
      continue;
    }

    ctx.codeParts.push(`import { ${imports} } from "${importPath}";`);
  }
}

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
        ), // TODO
      );
    }
  }

  return `default${util.c2t(name)}: ${initializer}`;
}

/**
 * Generates a unique file identifier constant for a Cap'n Proto schema file.
 *
 * @param ctx - The file context containing schema information
 */
export function generateFileId(ctx: CodeGeneratorFileContext): void {
  ctx.codeParts.push(
    `export const _capnpFileId = BigInt("0x${ctx.file.id.toString(16)}");`,
  );
}

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

  // An array of group structs formed as children of this struct.
  // They appear before the struct node in the file.
  const groupNodes = ctx.nodes.filter(
    (n) => n.scopeId === nodeId && n._isStruct && n.struct.isGroup,
  );

  // An array of nodes that are nested within this node;
  // these must appear first since those symbols will be
  // referenced in the node's class definition.
  const nestedNodes = node.nestedNodes.map((n) => lookupNode(ctx, n));

  for (const n of nestedNodes) {
    generateNode(ctx, n);
  }
  for (const n of groupNodes) {
    generateNode(ctx, n);
  }

  const whichNode = node.which();

  switch (whichNode) {
    case schema.Node.STRUCT: {
      generateStructNode(ctx, node, false);
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
        node.enum.enumerants.toArray(),
      );
      break;
    }

    case schema.Node.INTERFACE: {
      generateStructNode(ctx, node, true);
      break;
    }

    case schema.Node.ANNOTATION: {
      break;
    }

    // case s.Node.FILE:
    default: {
      throw new Error(
        format(
          E.GEN_NODE_UNKNOWN_TYPE,
          whichNode /* s.Node_Which[whichNode] */,
        ),
      );
    }
  }
}

const listLengthParameterName = "length";

/**
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
// TODO:
// - Factor default code `${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""}`
// - `$.utils.getPointer` does not seem to handle it, check.
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
  const properName = util.c2t(name);
  const hadExplicitDefault = field._isSlot && field.slot.hadExplicitDefault;
  const { discriminantValue } = field;
  const fullClassName = getFullClassName(node);
  const union = discriminantValue !== schema.Field.NO_DISCRIMINANT;
  const offset = (field._isSlot && field.slot.offset) || 0;

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
      get = `$.utils.getPointer(${offset}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
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
      const { byteLength, getter, setter } = Primitives[whichType as number];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = offset * byteLength;
      get = `$.utils.${getter}(${byteOffset}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
      set = `$.utils.${setter}(${byteOffset}, value, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
      if (whichType === schema.Type.ENUM) {
        get = `${get} as ${jsType}`;
      }
      break;
    }

    case schema.Type.DATA: {
      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getData(${offset}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
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
        listClass = `${fullClassName}._${properName}`;
      } else if (listClass === undefined) {
        throw new Error(
          format(E.GEN_UNSUPPORTED_LIST_ELEMENT_TYPE, whichElementType),
        );
      }

      adopt = true;
      disown = true;
      has = true;
      get = `$.utils.getList(${offset}, ${listClass}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
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
      get = `$.utils.getStruct(${offset}, ${jsType}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
      set = `$.utils.copyFrom(value, $.utils.getPointer(${offset}, this))`;
      init = `$.utils.initStructAt(${offset}, ${jsType}, this)`;
      break;
    }

    case schema.Type.TEXT: {
      get = `$.utils.getText(${offset}, this${hadExplicitDefault ? `, ${fullClassName}._capnp.default${properName}` : ""})`;
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
      _adopt${properName}(value: $.Orphan<${jsType}>): void {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        $.utils.adopt(value, $.utils.getPointer(${offset}, this));
      }
    `);
  }

  if (disown) {
    members.push(`
      _disown${properName}(): $.Orphan<${jsType}> {
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
      get ${name === "constructor" ? `$${name}` : name}(): ${jsType} {
        ${union ? `$.utils.testWhich(${JSON.stringify(name)}, $.utils.getUint16(${discriminantOffset * 2}, this), ${discriminantValue}, this);` : ""}
        return ${get};
      }
    `);
  }

  if (has) {
    members.push(`
      _has${properName}(): boolean {
        return !$.utils.isNull($.utils.getPointer(${offset}, this));
      }
    `);
  }

  if (init) {
    const params =
      whichType === schema.Type.DATA || whichType === schema.Type.LIST
        ? `${listLengthParameterName}: number`
        : "";
    members.push(`
      _init${properName}(${params}): ${jsType} {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        return ${init};
      }
    `);
  }

  if (union) {
    members.push(`
      get _is${properName}(): boolean {
        return $.utils.getUint16(${discriminantOffset * 2}, this) === ${discriminantValue};
      }
    `);
  }

  if (set || union) {
    const param = set ? `value: ${jsType}` : `_: true`;
    members.push(`
      set ${name === "constructor" ? `$${name}` : name}(${param}) {
        ${union ? `$.utils.setUint16(${discriminantOffset * 2}, ${discriminantValue}, this);` : ""}
        ${set ? `${set};` : ""}
      }
    `);
  }
}

/**
 * Generates TypeScript class definition for a Cap'n Proto struct or interface node.
 * Creates class members, properties, methods and nested type definitions.
 *
 * @param ctx - The file context containing schema information and output statements
 * @param node - The schema node to generate code for
 * @param interfaceNode - Whether this node represents an interface (true) or struct (false)
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
  interfaceNode: boolean,
): void {
  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node.nestedNodes
    .map((n) => lookupNode(ctx, n))
    .filter((n) => !n._isConst && !n._isAnnotation);
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);
  const struct = node.which() === schema.Node.STRUCT ? node.struct : undefined;
  const unionFields = getUnnamedUnionFields(node).sort(compareCodeOrder);

  const dataWordCount = struct ? struct.dataWordCount : 0;
  const dataByteLength = struct ? dataWordCount * 8 : 0;
  const discriminantCount = struct ? struct.discriminantCount : 0;
  const discriminantOffset = struct ? struct.discriminantOffset : 0;
  const fields = struct?.fields.toArray() ?? [];
  const pointerCount = struct ? struct.pointerCount : 0;

  // List of field indexes in code order
  const fieldIndexInCodeOrder = fields
    .map((field, fieldIndex) => ({ fieldIndex, codeOrder: field.codeOrder }))
    .sort(compareCodeOrder)
    .map(({ fieldIndex }) => fieldIndex);

  const concreteLists = fields
    .filter((f) => needsConcreteListClass(f))
    .sort(compareCodeOrder);
  const consts = ctx.nodes.filter((n) => n.scopeId === nodeId && n._isConst);
  const hasUnnamedUnion = discriminantCount !== 0;

  if (hasUnnamedUnion) {
    generateEnumNode(ctx, fullClassName + "_Which", unionFields);
  }

  const members: string[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(
    ...consts.map((node) => {
      const name = util.c2s(getDisplayNamePrefix(node));
      const value = createValueExpression(node.const.value);
      return `static readonly ${name} = ${value}`;
    }),
    ...unionFields.map((field) =>
      createUnionConstProperty(fullClassName, field),
    ),
    ...nestedNodes.map((node) => createNestedNodeProperty(node)),
  );

  if (interfaceNode) {
    members.push(`
      static readonly Client = ${fullClassName}$Client;
      static readonly Server = ${fullClassName}$Server;
      `);
  }

  const defaultValues: ts.PropertyAssignment[] = [];
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
  export class ${fullClassName} extends ${interfaceNode ? "$.Interface" : "$.Struct"} {
    ${members.join("\n")}
  }`;

  // Make sure the interface classes are generated first.

  if (interfaceNode) {
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
}

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

/**
 * Recursively collects structs and enums from a schema node and its nested nodes.
 *
 * @param ctx - The file context containing schema information
 * @param node - The root node to start collecting imports from
 * @returns Array of Node objects that can be imported (structs and enums only)
 */
export function getImportNodes(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): schema.Node[] {
  return (
    lookupNode(ctx, node)
      .nestedNodes.filter((n) => hasNode(ctx, n))
      .map((n) => lookupNode(ctx, n))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce(
        (a, n) => [...a, n, ...getImportNodes(ctx, n)],
        new Array<schema.Node>(),
      )
      .filter((n) => {
        const node = lookupNode(ctx, n);
        return node._isStruct || node._isEnum;
      })
  );
}

/**
 * Extracts JSDoc comments from a Cap'n Proto source info as a formatted string.
 *
 * @param sourceInfo - The source info containing documentation comments
 * @returns Formatted JSDoc string or undefined if no documentation exists
 */
function extractJSDocs(
  sourceInfo?: schema.Node_SourceInfo | schema.Node_SourceInfo_Member,
): string {
  const docComment = sourceInfo?.docComment;
  if (!docComment) {
    return "";
  }

  return (
    "/**\n" +
    docComment
      .toString()
      .split("\n")
      .map((l) => `* ${l}`)
      .join("\n") +
    "\n*/"
  );
}

// ---- RPC stuff ----

/**
 * Generates TypeScript classes for a Cap'n Proto RPC interface.
 *
 * This function creates all the necessary classes for an RPC interface:
 * - Parameter and result structs for each method
 * - Client class for making RPC calls
 * - Server class for implementing the interface
 *
 * The generated code follows the Cap'n Proto RPC protocol specification,
 * creating type-safe client/server implementations.
 *
 * @param ctx - The code generator context
 * @param node - The interface node to generate classes for
 */
export function generateInterfaceClasses(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  // Generate the parameter and result structs first
  generateMethodStructs(ctx, node);

  // Now generate the client & server classes
  generateClient(ctx, node);
  generateServer(ctx, node);
}

export function generateMethodStructs(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  for (const method of node.interface.methods) {
    const paramNode = lookupNode(ctx, method.paramStructType);
    const resultNode = lookupNode(ctx, method.resultStructType);
    generateNode(ctx, paramNode);
    generateNode(ctx, resultNode);
    generateResultPromise(ctx, resultNode);
  }
}

/**
 * Generates a TypeScript server implementation for a Cap'n Proto RPC interface.
 *
 * Creates a server class and target interface that implement the RPC service:
 * - Generates method signatures for all interface methods
 * - Creates a target interface that users implement to handle RPC calls
 * - Builds a server class that bridges between the RPC runtime and user implementation
 *
 * @param ctx - The code generator context
 * @param node - The interface node to generate server code for
 */
export function generateServer(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  // TODO: handle superclasses
  const fullClassName = getFullClassName(node);
  const serverName = `${fullClassName}$Server`;
  const serverTargetName = `${serverName}$Target`;
  const clientName = `${fullClassName}$Client`;

  const methodSignatures = node.interface.methods
    .map((method) => {
      const paramTypeName = getFullClassName(
        lookupNode(ctx, method.paramStructType),
      );
      const resultTypeName = getFullClassName(
        lookupNode(ctx, method.resultStructType),
      );
      return `${method.name}(params: ${paramTypeName}, results: ${resultTypeName}): Promise<void>;`;
    })
    .join("\n");

  ctx.codeParts.push(`
  export interface ${serverTargetName} {
    ${methodSignatures}
  }`);

  const members: string[] = [];

  members.push(`readonly target: ${serverTargetName};`);

  // Generate server constructor
  const codeServerMethods: string[] = [];

  let index = 0;
  for (const method of node.interface.methods) {
    codeServerMethods.push(`{
        ...${clientName}.methods[${index}],
        impl: target.${method.name}
      }`);

    index++;
  }

  members.push(`
      constructor(target: ${serverTargetName}) {
        super(target, [
          ${codeServerMethods.join(",\n")}
        ]);
        this.target = target;
      }
      client(): ${clientName} {
        return new ${clientName}(this);
      }
  `);

  ctx.codeParts.push(`
    export class ${serverName} extends $.Server {
      ${members.join("\n")}
    }
  `);
}

/**
 * Generates a TypeScript client class for a Cap'n Proto RPC interface.
 *
 * Creates a client class that provides type-safe method calls to a remote service:
 * - Generates method implementations for all interface methods
 * - Creates method metadata for the RPC runtime
 * - Handles parameter passing and promise resolution
 * - Registers the client class with the RPC registry
 *
 * @param ctx - The code generator context
 * @param node - The interface node to generate client code for
 */
export function generateClient(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  const fullClassName = getFullClassName(node);
  const clientName = `${fullClassName}$Client`;

  // TODO: handle superclasses
  const members: string[] = [];

  // Add client property
  members.push(`
    client: $.Client;
    static readonly interfaceId: bigint = ${createBigIntExpression(node.id)};
    constructor(client: $.Client) {
      this.client = client;
    }
  `);

  const methods: string[] = [];
  const methodDefs: string[] = [];
  const methodDefTypes: string[] = [];

  let index = 0;
  for (const method of node.interface.methods) {
    generateClientMethod(
      ctx,
      node,
      clientName,
      methods,
      methodDefs,
      methodDefTypes,
      method,
      index,
    );
    index++;
  }

  members.push(`
    static readonly methods:[
      ${methodDefTypes.join(",\n")}
    ] = [
      ${methodDefs.join(",\n")}
    ];
    ${methods.join("\n")}
    `);

  ctx.codeParts.push(`
    export class ${clientName} {
      ${members.join("\n")}
    }
    $.Registry.register(${clientName}.interfaceId, ${clientName});
  `);
}

/**
 * Generates a TypeScript Promise wrapper class for Cap'n Proto RPC method results.
 *
 * Creates a Promise class that handles asynchronous RPC results:
 * - Manages pipelined method calls on promised results
 * - Provides type-safe access to interface capabilities
 * - Handles promise resolution for final results
 *
 * @param ctx - The code generator context
 * @param node - The result struct node to generate promise wrapper for
 */
export function generateResultPromise(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): void {
  const nodeId = node.id;

  if (ctx.generatedResultsPromiseIds.has(nodeId)) {
    return;
  }

  ctx.generatedResultsPromiseIds.add(nodeId);

  const resultsClassName = getFullClassName(node);
  const fullClassName = `${resultsClassName}$Promise`;

  const members: string[] = [];

  members.push(`
    pipeline: $.Pipeline<any, any, ${resultsClassName}>;
    constructor(pipeline: $.Pipeline<any, any, ${resultsClassName}>) {
      this.pipeline = pipeline;
    }
  `);

  const { struct } = node;
  const fields = struct.fields.toArray().sort(compareCodeOrder);

  const generatePromiseFieldMethod = (field: schema.Field) => {
    let jsType: string;
    let isInterface = false;
    let slot: schema.Field_Slot;

    if (field._isSlot) {
      slot = field.slot;
      const slotType = slot.type;
      if (slotType.which() !== schema.Type.INTERFACE) {
        // TODO: return a Promise<jsType> for non-interface slots
        return;
      }
      isInterface = true;
      jsType = getJsType(ctx, slotType, false);
    } else if (field._isGroup) {
      // TODO: how should groups be handled?
      return;
    } else {
      throw new Error(format(E.GEN_UNKNOWN_STRUCT_FIELD, field.which()));
    }

    const promisedJsType = jsType;
    if (isInterface) {
      jsType = `${jsType}$Client`;
    }

    const { name } = field;
    const properName = util.c2t(name);

    members.push(`
      get${properName}(): ${jsType} {
        return new ${jsType}(this.pipeline.getPipeline(${promisedJsType}, ${slot.offset}).client());
      }
    `);
  };

  for (const field of fields) {
    generatePromiseFieldMethod(field);
  }

  members.push(`
    async promise(): Promise<${resultsClassName}> {
      return await this.pipeline.struct();
    }
  `);

  ctx.codeParts.push(`
    export class ${fullClassName} {
      ${members.join("\n")}
    }
  `);
}

/**
 * Generates a client method implementation for a Cap'n Proto RPC interface.
 *
 * Creates the method definition, type declaration, and implementation code for a single
 * RPC method in the client class. The generated code includes:
 * - Method type definition for TypeScript
 * - Method metadata for the RPC runtime
 * - Client-side implementation that handles parameter passing and promise resolution
 *
 * @param ctx - The code generator context
 * @param node - The interface node containing the method
 * @param clientName - Name of the client class being generated
 * @param methodsCode - Array to append method implementations to
 * @param methodDefs - Array to append method definitions to
 * @param methodDefTypes - Array to append method type declarations to
 * @param method - The RPC method definition from the schema
 * @param index - Index of this method in the interface's method list
 */
export function generateClientMethod(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
  clientName: string,
  methodsCode: string[],
  methodDefs: string[],
  methodDefTypes: string[],
  method: schema.Method,
  index: number,
): void {
  const { name } = method;

  const paramTypeName = getFullClassName(
    lookupNode(ctx, method.paramStructType),
  );
  const resultTypeName = getFullClassName(
    lookupNode(ctx, method.resultStructType),
  );

  // Add method type to methodDefTypes
  methodDefTypes.push(`$.Method<${paramTypeName}, ${resultTypeName}>`);

  // Add method definition to methodDefs
  methodDefs.push(`{
    ParamsClass: ${paramTypeName},
    ResultsClass: ${resultTypeName},
    interfaceId: ${clientName}.interfaceId,
    methodId: ${index},
    interfaceName: "${node.displayName}",
    methodName: "${method.name}"
  }`);

  // Add method implementation to members
  methodsCode.push(`
    ${name}(paramsFunc?: (params: ${paramTypeName}) => void): ${resultTypeName}$Promise {
      const answer = this.client.call({
        method: ${clientName}.methods[${index}],
        paramsFunc: paramsFunc
      });
      const pipeline = new $.Pipeline(${resultTypeName}, answer);
      return new ${resultTypeName}$Promise(pipeline);
    }
  `);
}
