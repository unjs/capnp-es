// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import ts, { factory as f } from "typescript";
import * as s from "../capnp/schema";
import { format } from "../util";

import {
  createBigIntExpression,
  createClassExtends,
  createConcreteListProperty,
  createConstProperty,
  createExpressionBlock,
  createMethod,
  createNestedNodeProperty,
  createUnionConstProperty,
  createValueExpression,
} from "./ast-creators";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import {
  ASYNC,
  BOOLEAN_TYPE,
  CAPNP,
  ConcreteListType,
  EXPORT,
  LENGTH,
  NUMBER_TYPE,
  Primitive,
  QUESTION_TOKEN,
  READONLY,
  STATIC,
  STRING_TYPE,
  UTILS,
  THIS,
  TS_FILE_ID,
  VALUE,
  VOID_TYPE,
  ANY_TYPE,
  OBJECT_SIZE,
  BIGINT,
} from "./constants";
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

export function generateCapnpImport(ctx: CodeGeneratorFileContext): void {
  // Look for the special importPath annotation on the file to see if we need a different import path for capnp-es.

  const fileNode = lookupNode(ctx, ctx.file);
  const tsFileId = util.hexToBigInt(TS_FILE_ID);
  // This may be undefined if ts.capnp is not imported; fine, we'll just use the default.
  const tsAnnotationFile = ctx.nodes.find((n) => n.id === tsFileId);
  // We might not find the importPath annotation; that's definitely a bug but let's move on.
  const tsImportPathAnnotation =
    tsAnnotationFile &&
    tsAnnotationFile.nestedNodes.find((n) => n.name === "importPath");
  // There may not necessarily be an import path annotation on the file node. That's fine.
  const importAnnotation =
    tsImportPathAnnotation &&
    fileNode.annotations.find((a) => a.id === tsImportPathAnnotation.id);
  const importPath =
    importAnnotation === undefined ? "capnp-es" : importAnnotation.value.text;

  // import * as capnp from '${importPath}';
  ctx.statements.push(
    f.createImportDeclaration(
      undefined,
      f.createImportClause(false, undefined, f.createNamespaceImport(CAPNP)),
      f.createStringLiteral(importPath),
    ),
  );
}

export function generateNestedImports(ctx: CodeGeneratorFileContext): void {
  for (const i of ctx.imports) {
    const name = i.name;
    let importPath: string;

    if (name.startsWith("/capnp/")) {
      importPath = `capnp-es/capnp/${name.slice(7).replace(/\.capnp$/, "")}`;
    } else {
      importPath = name.replace(/\.capnp$/, ".js");
      if (importPath[0] !== ".") {
        importPath = `./${importPath}`;
      }
    }

    const imports = getImportNodes(ctx, lookupNode(ctx, i))
      .map((n) => getFullClassName(n))
      .join(", ");

    if (imports.length === 0) continue;

    const importStatement = `import { ${imports} } from "${importPath}"`;

    ctx.statements.push(
      f.createExpressionStatement(f.createIdentifier(importStatement)),
    );
  }
}

export function generateConcreteListInitializer(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  field: s.Field,
): void {
  const left = f.createPropertyAccessExpression(
    f.createIdentifier(fullClassName),
    `_${util.c2t(field.name)}`,
  );
  const right = f.createIdentifier(getConcreteListType(ctx, field.slot.type));

  ctx.statements.push(
    f.createExpressionStatement(f.createAssignment(left, right)),
  );
}

export function generateDefaultValue(field: s.Field): ts.PropertyAssignment {
  const name = field.name;
  const slot = field.slot;
  const whichSlotType = slot.type.which();
  const p = Primitive[whichSlotType];
  let initializer;

  switch (whichSlotType) {
    case s.Type_Which.ANY_POINTER:
    case s.Type_Which.DATA:
    case s.Type_Which.LIST:
    case s.Type_Which.STRUCT:
    case s.Type_Which.INTERFACE: {
      initializer = createValueExpression(slot.defaultValue);

      break;
    }

    case s.Type_Which.TEXT: {
      initializer = f.createStringLiteral(slot.defaultValue.text);

      break;
    }

    case s.Type_Which.BOOL: {
      initializer = f.createCallExpression(
        f.createPropertyAccessExpression(CAPNP, p.mask),
        undefined,
        [
          createValueExpression(slot.defaultValue),
          f.createNumericLiteral((slot.offset % 8).toString()),
        ],
      );

      break;
    }

    case s.Type_Which.ENUM:
    case s.Type_Which.FLOAT32:
    case s.Type_Which.FLOAT64:
    case s.Type_Which.INT16:
    case s.Type_Which.INT32:
    case s.Type_Which.INT64:
    case s.Type_Which.INT8:
    case s.Type_Which.UINT16:
    case s.Type_Which.UINT32:
    case s.Type_Which.UINT64:
    case s.Type_Which.UINT8: {
      initializer = f.createCallExpression(
        f.createPropertyAccessExpression(CAPNP, p.mask),
        undefined,
        [createValueExpression(slot.defaultValue)],
      );

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

  return f.createPropertyAssignment(`default${util.c2t(name)}`, initializer);
}

export function generateFileId(ctx: CodeGeneratorFileContext): void {
  // export const _capnpFileId = BigInt('0xabcdef');
  const fileId = f.createCallExpression(BIGINT, undefined, [
    f.createStringLiteral(`0x${ctx.file.id.toString(16)}`),
  ]);
  ctx.statements.push(
    f.createVariableStatement(
      [EXPORT],
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            "_capnpFileId",
            undefined,
            undefined,
            fileId,
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );
}

export function generateNode(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);

  if (ctx.generatedNodeIds.includes(nodeIdHex)) return;

  ctx.generatedNodeIds.push(nodeIdHex);

  /** An array of group structs formed as children of this struct. They appear before the struct node in the file. */
  const groupNodes = ctx.nodes.filter(
    (n) => n.scopeId === nodeId && n._isStruct && n.struct.isGroup,
  );
  /**
   * An array of nodes that are nested within this node; these must appear first since those symbols will be
   * referenced in the node's class definition.
   */
  const nestedNodes = node.nestedNodes.map((n) => lookupNode(ctx, n));

  for (const n of nestedNodes) generateNode(ctx, n);
  for (const n of groupNodes) generateNode(ctx, n);

  const whichNode = node.which();

  switch (whichNode) {
    case s.Node.STRUCT: {
      generateStructNode(ctx, node, false);

      break;
    }

    case s.Node.CONST: {
      // Const nodes are generated along with the containing class, ignore these.

      break;
    }

    case s.Node.ENUM: {
      generateEnumNode(
        ctx,
        getFullClassName(node),
        node.enum.enumerants.toArray(),
      );

      break;
    }

    case s.Node.INTERFACE: {
      generateStructNode(ctx, node, true);

      break;
    }

    case s.Node.ANNOTATION: {
      break;
    }

    // case s.Node.FILE:
    default: {
      throw new Error(
        format(
          E.GEN_NODE_UNKNOWN_TYPE,
          whichNode /* s.Node_Which[whichNode] */,
        ),
      ); // TODO
    }
  }
}

const listLengthParameterName = "length";

export function generateStructFieldMethods(
  ctx: CodeGeneratorFileContext,
  members: ts.ClassElement[],
  node: s.Node,
  field: s.Field,
  fieldIndex: number,
): void {
  let jsType: string;
  let whichType: s.Type_Which | string;

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
  let jsTypeReference = f.createTypeReferenceNode(jsType);

  const isInterface = whichType === s.Type.INTERFACE;
  if (isInterface) {
    jsType = `${jsType}$Client`;
    jsTypeReference = f.createTypeReferenceNode(jsType);
  }

  const discriminantOffset = node.struct.discriminantOffset;
  const name = field.name;
  const properName = util.c2t(name);
  const hadExplicitDefault = field._isSlot && field.slot.hadExplicitDefault;
  const discriminantValue = field.discriminantValue;
  const fullClassName = getFullClassName(node);
  const union = discriminantValue !== s.Field.NO_DISCRIMINANT;
  const offset = (field._isSlot && field.slot.offset) || 0;
  const offsetLiteral = f.createNumericLiteral(offset.toString());
  /** $.utils.getPointer(0, this) */
  const getPointer = f.createCallExpression(
    f.createPropertyAccessExpression(UTILS, "getPointer"),
    undefined,
    [offsetLiteral, THIS],
  );
  /** $.utils.copyFrom(value, $.utils.getPointer(0, this)) */
  const copyFromValue = f.createCallExpression(
    f.createPropertyAccessExpression(UTILS, "copyFrom"),
    undefined,
    [VALUE, getPointer],
  );
  /** capnp.Orphan<Foo> */
  const orphanType = f.createTypeReferenceNode("$.Orphan", [jsTypeReference]);
  const discriminantOffsetLiteral = f.createNumericLiteral(
    (discriminantOffset * 2).toString(),
  );
  const discriminantValueLiteral = f.createNumericLiteral(
    discriminantValue.toString(),
  );
  /** $.utils.getUint16(0, this) */
  const getDiscriminant = f.createCallExpression(
    f.createPropertyAccessExpression(UTILS, "getUint16"),
    undefined,
    [discriminantOffsetLiteral, THIS],
  );
  /** $.utils.setUint16(0, this) */
  const setDiscriminant = f.createCallExpression(
    f.createPropertyAccessExpression(UTILS, "setUint16"),
    undefined,
    [discriminantOffsetLiteral, discriminantValueLiteral, THIS],
  );
  const defaultValue = hadExplicitDefault
    ? f.createIdentifier(`${fullClassName}._capnp.default${properName}`)
    : undefined;

  let adopt = false;
  let disown = false;
  let init;
  let has = false;
  let get;
  let set;
  let getArgs: ts.Expression[];
  let setArgs: ts.Expression[];

  switch (whichType) {
    case s.Type.ANY_POINTER: {
      getArgs = [offsetLiteral, THIS];

      if (defaultValue) {
        getArgs.push(defaultValue);
      }

      adopt = true;
      disown = true;
      /** $.utils.getPointer(0, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getPointer"),
        undefined,
        getArgs,
      );
      has = true;
      /** $.utils.copyFrom(value, $.utils.getPointer(0, this)) */
      set = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "copyFrom"),
        undefined,
        [VALUE, get],
      );

      break;
    }

    case s.Type.BOOL:
    case s.Type.ENUM:
    case s.Type.FLOAT32:
    case s.Type.FLOAT64:
    case s.Type.INT16:
    case s.Type.INT32:
    case s.Type.INT64:
    case s.Type.INT8:
    case s.Type.UINT16:
    case s.Type.UINT32:
    case s.Type.UINT64:
    case s.Type.UINT8: {
      const { byteLength, getter, setter } = Primitive[whichType as number];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = f.createNumericLiteral(
        (offset * byteLength).toString(),
      );
      getArgs = [byteOffset, THIS];
      setArgs = [byteOffset, VALUE, THIS];

      if (defaultValue) {
        getArgs.push(defaultValue);
        setArgs.push(defaultValue);
      }

      /** $.utils.getXYZ(0, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, getter),
        undefined,
        getArgs,
      );
      /** $.utils.setXYZ(0, value, this) */
      set = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, setter),
        undefined,
        setArgs,
      );

      if (whichType === s.Type.ENUM) {
        get = f.createAsExpression(get, jsTypeReference);
      }

      break;
    }
    case s.Type.DATA: {
      getArgs = [offsetLiteral, THIS];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** $.utils.getData(0, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getData"),
        undefined,
        getArgs,
      );
      has = true;
      /** $.utils.initData(0, length, this) */
      init = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "initData"),
        undefined,
        [offsetLiteral, LENGTH, THIS],
      );
      set = copyFromValue;

      break;
    }

    case s.Type.INTERFACE: {
      // new SomeInterface$Client(undefinedS.getInterfaceClientOrNullAt(0, this));
      {
        const client = f.createCallExpression(
          f.createPropertyAccessExpression(UTILS, "getInterfaceClientOrNullAt"),
          undefined, // typeParams
          [offsetLiteral, THIS],
        );
        const newClient = f.createNewExpression(
          f.createIdentifier(jsType),
          undefined, // typeParams
          [client],
        );
        get = newClient;
      }

      {
        const message = f.createPropertyAccessExpression(
          f.createPropertyAccessExpression(THIS, f.createIdentifier("segment")),
          f.createIdentifier("message"),
        );
        const capId = f.createCallExpression(
          f.createPropertyAccessExpression(message, "addCap"),
          undefined, // typeParams
          [
            f.createPropertyAccessExpression(
              f.createIdentifier("value"),
              "client",
            ),
          ],
        );
        const ptr = f.createCallExpression(
          f.createPropertyAccessExpression(UTILS, "getPointer"),
          undefined, // typeParams
          [offsetLiteral, THIS],
        );

        set = f.createCallExpression(
          f.createPropertyAccessExpression(UTILS, "setInterfacePointer"),
          undefined, // typeParams
          [capId, ptr],
        );
      }
      break;
    }

    case s.Type.LIST: {
      const whichElementType = field.slot.type.list.elementType.which();
      let listClass = ConcreteListType[whichElementType];

      if (
        whichElementType === s.Type.LIST ||
        whichElementType === s.Type.STRUCT
      ) {
        listClass = `${fullClassName}._${properName}`;
      } else if (listClass === void 0) {
        /* istanbul ignore next */
        throw new Error(
          format(E.GEN_UNSUPPORTED_LIST_ELEMENT_TYPE, whichElementType),
        );
      }

      const listClassIdentifier = f.createIdentifier(listClass);

      getArgs = [offsetLiteral, listClassIdentifier, THIS];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** $.utils.getList(0, Myutils._Foo, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getList"),
        undefined,
        getArgs,
      );
      if (whichElementType === s.Type.ENUM) {
        get = f.createAsExpression(get, jsTypeReference);
      }
      has = true;
      /** $.utils.initList(0, Myutils._Foo, length, this) */
      init = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "initList"),
        undefined,
        [
          offsetLiteral,
          listClassIdentifier,
          f.createIdentifier(listLengthParameterName),
          THIS,
        ],
      );
      if (whichElementType === s.Type.ENUM) {
        init = f.createAsExpression(init, jsTypeReference);
      }
      set = copyFromValue;

      break;
    }
    case s.Type.STRUCT: {
      const structType = f.createIdentifier(
        getJsType(ctx, field.slot.type, false),
      );

      getArgs = [offsetLiteral, structType, THIS];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** $.utils.getStruct(0, Foo, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getStruct"),
        undefined,
        getArgs,
      );
      has = true;
      /** $.utils.initStruct(0, Foo, this) */
      init = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "initStructAt"),
        undefined,
        [offsetLiteral, structType, THIS],
      );
      set = copyFromValue;

      break;
    }
    case s.Type.TEXT: {
      getArgs = [offsetLiteral, THIS];

      if (defaultValue) getArgs.push(defaultValue);

      /** $.utils.getText(0, this) */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getText"),
        undefined,
        getArgs,
      );
      /** $.utils.setText(0, value, this) */
      set = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "setText"),
        undefined,
        [offsetLiteral, VALUE, THIS],
      );

      break;
    }

    case s.Type.VOID: {
      break;
    }

    case "group": {
      if (hadExplicitDefault) {
        throw new Error(format(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE, "group"));
      }

      const groupType = f.createIdentifier(jsType);

      /** $.utils.getAs(Foo, this); */
      get = f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getAs"),
        undefined,
        [groupType, THIS],
      );
      init = get;

      break;
    }
    default: {
      // TODO Maybe this should be an error?

      break;
    }
  }

  // _adoptFoo(value: capnp.Orphan<Foo>): void { $.utils.adopt(value, this._getPointer(3)); }}
  if (adopt) {
    const parameters = [
      f.createParameterDeclaration(
        undefined,
        undefined,
        VALUE,
        undefined,
        orphanType,
        undefined,
      ),
    ];
    const expressions = [
      f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "adopt"),
        undefined,
        [VALUE, getPointer],
      ),
    ];

    if (union) expressions.unshift(setDiscriminant);

    members.push(
      createMethod(`_adopt${properName}`, parameters, VOID_TYPE, expressions),
    );
  }

  // _disownFoo(): capnp.Orphan<Foo> { return $.utils.disown(this.foo); }
  if (disown) {
    const getter = f.createPropertyAccessExpression(
      THIS,
      name === "constructor" ? `$${name}` : name,
    );
    const expressions = [
      f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "disown"),
        undefined,
        [getter],
      ),
    ];

    members.push(
      createMethod(`_disown${properName}`, [], orphanType, expressions),
    );
  }

  // get foo(): FooType { ... }
  if (get) {
    const expressions = [get];

    if (union) {
      expressions.unshift(
        f.createCallExpression(
          f.createPropertyAccessExpression(UTILS, "testWhich"),
          undefined,
          [
            f.createStringLiteral(name),
            getDiscriminant,
            discriminantValueLiteral,
            THIS,
          ],
        ),
      );
    }

    const d = f.createGetAccessorDeclaration(
      [],
      // Avoid generating invalid "get constructor()"
      name === "constructor" ? `$${name}` : name,
      [],
      jsTypeReference,
      createExpressionBlock(expressions, true),
    );

    try {
      attachJSDocs(d, lookupNodeSourceInfo(ctx, node)?.members.at(fieldIndex));
    } catch {
      // ignore
    }

    members.push(d);
  }

  // hasFoo(): boolean { ... }
  if (has) {
    // !$.utils.isNull(this._getPointer(8));
    const expressions = [
      f.createLogicalNot(
        f.createCallExpression(
          f.createPropertyAccessExpression(UTILS, "isNull"),
          undefined,
          [getPointer],
        ),
      ),
    ];

    members.push(
      createMethod(`_has${properName}`, [], BOOLEAN_TYPE, expressions),
    );
  }

  // _initFoo(): FooType { ... } / _initFoo(length: number): $.List<FooElementType> { ... }
  if (init) {
    const parameters =
      whichType === s.Type.DATA || whichType === s.Type.LIST
        ? [
            f.createParameterDeclaration(
              undefined,
              undefined,
              listLengthParameterName,
              undefined,
              NUMBER_TYPE,
              undefined,
            ),
          ]
        : [];
    const expressions = [init];

    if (union) expressions.unshift(setDiscriminant);

    members.push(
      createMethod(
        `_init${properName}`,
        parameters,
        jsTypeReference,
        expressions,
      ),
    );
  }

  // isFoo(): boolean { ... }
  if (union) {
    const left = f.createCallExpression(
      f.createPropertyAccessExpression(UTILS, "getUint16"),
      undefined,
      [discriminantOffsetLiteral, THIS],
    );
    const right = discriminantValueLiteral;
    const expressions = [
      f.createBinaryExpression(
        left,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        right,
      ),
    ];

    // members.push(
    //   createMethod(`is${properName}`, [], BOOLEAN_TYPE, expressions),
    // );
    // get isFoo() { return $.utils.getUint16(12, this) === 1; }
    members.push(
      f.createGetAccessorDeclaration(
        [],
        `_is${properName}`,
        [],
        BOOLEAN_TYPE,
        createExpressionBlock(expressions, true),
      ),
    );
  }

  // set foo(value: FooType): void { ... }
  if (set || union) {
    const expressions = [];
    const parameters = [];

    if (set) {
      expressions.unshift(set);

      parameters.unshift(
        f.createParameterDeclaration(
          undefined,
          undefined,
          VALUE,
          undefined,
          jsTypeReference,
          undefined,
        ),
      );
    }

    if (union) {
      expressions.unshift(setDiscriminant);
    }

    if (parameters.length === 0) {
      parameters.unshift(
        f.createParameterDeclaration(
          undefined,
          undefined,
          "_",
          undefined,
          f.createTypeReferenceNode("true"),
        ),
      );
    }

    members.push(
      f.createSetAccessorDeclaration(
        [],
        name === "constructor" ? `$${name}` : name,
        parameters,
        createExpressionBlock(expressions, false),
      ),
    );
  }
}

export function generateStructNode(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
  interfaceNode: boolean,
): void {
  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node.nestedNodes
    .map((n) => lookupNode(ctx, n))
    .filter((n) => !n._isConst && !n._isAnnotation);
  const nodeId = node.id;
  const nodeIdHex = nodeId.toString(16);
  const struct = node.which() === s.Node.STRUCT ? node.struct : undefined;
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
  // const groups = ctx.nodes.filter(
  //   (n) => n.getScopeId().equals(nodeId) && n.isStruct() && n.getStruct().getIsGroup());
  const hasUnnamedUnion = discriminantCount !== 0;

  if (hasUnnamedUnion) {
    generateEnumNode(ctx, fullClassName + "_Which", unionFields);
  }

  const members: ts.ClassElement[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(...consts.map((n) => createConstProperty(n)));

  // static readonly WHICH = MyStruct_Which.WHICH;
  members.push(
    ...unionFields.map((f) => createUnionConstProperty(fullClassName, f)),
  );

  // static readonly NestedStruct = MyStruct_NestedStruct;
  members.push(...nestedNodes.map((n) => createNestedNodeProperty(n)));

  // static readonly Client = MyInterface$Client;
  // static readonly Server = MyInterface$Server;
  if (interfaceNode) {
    members.push(
      f.createPropertyDeclaration(
        [STATIC, READONLY],
        "Client",
        undefined,
        undefined,
        f.createIdentifier(`${fullClassName}$Client`),
      ),
    );
    members.push(
      f.createPropertyDeclaration(
        [STATIC, READONLY],
        "Server",
        undefined,
        undefined,
        f.createIdentifier(`${fullClassName}$Server`),
      ),
    );
  }

  const defaultValues: ts.PropertyAssignment[] = [];
  for (const index of fieldIndexInCodeOrder) {
    const field = fields[index];
    if (
      field._isSlot &&
      field.slot.hadExplicitDefault &&
      field.slot.type.which() !== s.Type.VOID
    ) {
      defaultValues.push(generateDefaultValue(field));
    }
  }

  // static reaodnly _capnp = { displayName: 'MyStruct', id: '4732bab4310f81', size = new undefinedO(8, 8) };
  members.push(
    f.createPropertyDeclaration(
      [STATIC, READONLY],
      "_capnp",
      undefined,
      undefined,
      f.createObjectLiteralExpression(
        [
          f.createPropertyAssignment(
            "displayName",
            f.createStringLiteral(displayNamePrefix),
          ),
          f.createPropertyAssignment("id", f.createStringLiteral(nodeIdHex)),
          f.createPropertyAssignment(
            "size",
            f.createNewExpression(OBJECT_SIZE, undefined, [
              f.createNumericLiteral(dataByteLength.toString()),
              f.createNumericLiteral(pointerCount.toString()),
            ]),
          ),
          f.createPropertyAssignment(
            "fields",
            f.createArrayLiteralExpression(
              fields.map((field) => f.createStringLiteral(field.name)),
            ),
          ),
          ...defaultValues,
        ],
        true,
      ),
    ),
  );

  // private static _ConcreteListClass: MyStruct_ConcreteListClass;
  members.push(...concreteLists.map((f) => createConcreteListProperty(ctx, f)));

  // get foo() { ... } initFoo() { ... } set foo() { ... }
  for (const index of fieldIndexInCodeOrder) {
    const field = fields[index];
    generateStructFieldMethods(ctx, members, node, field, index);
  }

  // toString(): string { return 'MyStruct_' + super.toString(); }
  // const toStringExpression = f.createBinaryExpression(
  //   f.createStringLiteral(`${fullClassName}_`),
  //   ts.SyntaxKind.PlusToken,
  //   f.createCallExpression(f.createIdentifier("super.toString"), undefined, []),
  // );
  // members.push(createMethod("toString", [], STRING_TYPE, [toStringExpression]));

  if (hasUnnamedUnion) {
    // which(): MyStruct_Which { return $.utils.getUint16(12, this); }
    const whichExpression = f.createAsExpression(
      f.createCallExpression(
        f.createPropertyAccessExpression(UTILS, "getUint16"),
        undefined,
        [f.createNumericLiteral((discriminantOffset * 2).toString()), THIS],
      ),
      f.createTypeReferenceNode(`${fullClassName}_Which`, undefined),
    );
    members.push(
      createMethod(
        "which",
        [],
        f.createTypeReferenceNode(`${fullClassName}_Which`, undefined),
        [whichExpression],
      ),
    );
  }

  const c = f.createClassDeclaration(
    [EXPORT],
    fullClassName,
    undefined,
    [createClassExtends(interfaceNode ? "$.Interface" : "$.Struct")],
    members,
  );

  // Add jsdoc comments to the class.
  try {
    attachJSDocs(c, lookupNodeSourceInfo(ctx, node));
  } catch {
    // Ignore
  }

  // Make sure the interface classes are generated first.

  if (interfaceNode) {
    generateInterfaceClasses(ctx, node);
  }

  ctx.statements.push(c);

  // Write out the concrete list type initializer after all the class definitions. It can't be initialized within the
  // class's static initializer because the nested type might not be defined yet.
  // FIXME: This might be solvable with topological sorting?

  ctx.concreteLists.push(
    ...concreteLists.map<[string, s.Field]>((f) => [fullClassName, f]),
  );
}

export function generateEnumNode(
  ctx: CodeGeneratorFileContext,
  className: string,
  fields: s.Enumerant[] | s.Field[],
): void {
  const members = fields.sort(compareCodeOrder).map((e, index) => {
    const key = f.createIdentifier(util.c2s(e.name));
    const val = f.createNumericLiteral(
      ((e as s.Field).discriminantValue || index).toString(),
    );
    return f.createPropertyAssignment(key, val);
  });

  // export const MyEnum = { FOO: 1, BAR: 2 } as const
  const d = f.createVariableStatement(
    [EXPORT],
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          className,
          undefined,
          undefined,
          f.createAsExpression(
            f.createObjectLiteralExpression(members, true),
            f.createTypeReferenceNode("const", undefined),
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  // export type MyEnum = (typeof MyEnum)[keyof typeof MyEnum]
  const t = f.createTypeAliasDeclaration(
    [EXPORT],
    className,
    undefined,
    f.createIndexedAccessTypeNode(
      f.createTypeQueryNode(f.createIdentifier(className)),
      f.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        f.createTypeQueryNode(f.createIdentifier(className)),
      ),
    ),
  );

  ctx.statements.push(d, t);
}

export function getImportNodes(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): s.Node[] {
  return (
    lookupNode(ctx, node)
      .nestedNodes.filter((n) => hasNode(ctx, n))
      .map((n) => lookupNode(ctx, n))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce(
        (a, n) => [...a, n, ...getImportNodes(ctx, n)],
        new Array<s.Node>(),
      )
      .filter((n) => lookupNode(ctx, n)._isStruct || lookupNode(ctx, n)._isEnum)
  );
}

function attachJSDocs(
  d: ts.Declaration,
  sourceInfo?: s.Node_SourceInfo | s.Node_SourceInfo_Member,
) {
  const docComment = sourceInfo?.docComment;
  if (!docComment) {
    return;
  }
  ts.addSyntheticLeadingComment(
    d,
    ts.SyntaxKind.MultiLineCommentTrivia,
    "*\n" +
      docComment
        .toString()
        .split("\n")
        .map((l) => `* ${l}`)
        .join("\n"),
    true,
  );
}

// ---- RPC stuff ----

export function generateInterfaceClasses(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  // Generate the parameter and result structs first
  generateMethodStructs(ctx, node);

  // Now generate the client & server classes
  generateClient(ctx, node);
  generateServer(ctx, node);
}

export function generateMethodStructs(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  for (const method of node.interface.methods) {
    const paramNode = lookupNode(ctx, method.paramStructType);
    const resultNode = lookupNode(ctx, method.resultStructType);
    generateNode(ctx, paramNode);
    generateNode(ctx, resultNode);
    generateResultPromise(ctx, resultNode);
  }
}

export function generateServer(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  // TODO: handle superclasses
  const fullClassName = getFullClassName(node);
  const serverName = `${fullClassName}$Server`;
  const serverTargetName = `${serverName}$Target`;
  const clientName = `${fullClassName}$Client`;

  // Generate the `Foobar$Server$Target` interface
  {
    const elements = node.interface.methods.map<ts.TypeElement>((method) => {
      const paramTypeName = getFullClassName(
        lookupNode(ctx, method.paramStructType),
      );
      const resultTypeName = getFullClassName(
        lookupNode(ctx, method.resultStructType),
      );

      return f.createMethodSignature(
        undefined, // modifiers
        method.name, // name
        undefined, // questionToken
        undefined, // typeParams
        [
          f.createParameterDeclaration(
            undefined, // modifiers
            undefined, // dotDotToken
            "params", // name
            undefined, // questionToken
            f.createTypeReferenceNode(paramTypeName, undefined), // type,
            undefined, // initializer
          ),
          f.createParameterDeclaration(
            undefined, // modifiers
            undefined, // dotDotToken
            "results", // name
            undefined, // questionToken
            f.createTypeReferenceNode(resultTypeName, undefined), // type,
            undefined, // initializer
          ),
        ], // params
        f.createTypeReferenceNode("Promise", [VOID_TYPE]), // type
      );
    });

    ctx.statements.push(
      f.createInterfaceDeclaration(
        [EXPORT], // modifiers
        serverTargetName, // name
        undefined, // typeParams
        undefined, // heritageClauses
        elements,
      ),
    );
  }

  const members: ts.ClassElement[] = [];

  members.push(
    f.createPropertyDeclaration(
      [READONLY], // modifiers
      "target", // name
      undefined, // questionOrExclamationmark
      f.createTypeReferenceNode(serverTargetName, undefined), // type
      undefined, // initializer
    ),
  );

  // Generate server constructor
  {
    const serverMethods: ts.Expression[] = [];

    let index = 0;
    for (const method of node.interface.methods) {
      serverMethods.push(
        f.createObjectLiteralExpression(
          [
            f.createSpreadAssignment(
              f.createElementAccessExpression(
                f.createPropertyAccessExpression(
                  f.createIdentifier(clientName),
                  "methods",
                ),
                index++,
              ),
            ),
            f.createPropertyAssignment(
              "impl",
              f.createPropertyAccessExpression(
                f.createIdentifier("target"),
                method.name,
              ),
            ),
          ],
          true, // multiline
        ),
      );
    }

    members.push(
      f.createConstructorDeclaration(
        undefined, // modifiers
        [
          f.createParameterDeclaration(
            undefined, // modifiers
            undefined, // dotDotToken
            "target", // name
            undefined, // questionToken
            f.createTypeReferenceNode(serverTargetName, undefined), // type
            undefined, // initializer
          ),
        ], // parameters
        f.createBlock(
          [
            f.createExpressionStatement(
              f.createCallExpression(
                f.createIdentifier("super"),
                undefined, // typeArguments
                [
                  f.createIdentifier("target"),
                  f.createArrayLiteralExpression(
                    serverMethods,
                    true /* multiline */,
                  ),
                ], // arguments
              ),
            ),
            f.createExpressionStatement(
              f.createAssignment(
                f.createPropertyAccessExpression(THIS, "target"),
                f.createIdentifier("target"),
              ),
            ),
          ],
          true, // multiline
        ), // body
      ),
    );
  }

  members.push(
    f.createMethodDeclaration(
      undefined, // modifiers
      undefined, // asteriskToken
      "client", // name
      undefined, // questionToken
      undefined, // typeParams
      [], // params
      f.createTypeReferenceNode(clientName, undefined), // type
      f.createBlock(
        [
          f.createReturnStatement(
            f.createNewExpression(
              f.createIdentifier(clientName),
              undefined, // typeArgs
              [THIS], // args
            ),
          ),
        ],
        false, // multiline
      ),
    ),
  );

  ctx.statements.push(
    f.createClassDeclaration(
      [EXPORT], // modifiers
      serverName, // name
      undefined, // typeParams
      [createClassExtends("$.Server")], // heritageClauses
      members, // members
    ),
  );
}

export function generateClient(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  const fullClassName = getFullClassName(node);
  const clientName = `${fullClassName}$Client`;

  // TODO: handle superclasses
  const members: ts.ClassElement[] = [];

  const ClientType = f.createTypeReferenceNode("$.Client", undefined);

  members.push(
    f.createPropertyDeclaration(
      undefined,
      "client",
      undefined,
      ClientType,
      undefined,
    ),
  );

  members.push(
    f.createPropertyDeclaration(
      [STATIC, READONLY],
      "interfaceId",
      undefined,
      f.createTypeReferenceNode("bigint", undefined),
      createBigIntExpression(node.id),
    ),
  );

  members.push(
    f.createConstructorDeclaration(
      undefined, // modifiers
      [
        f.createParameterDeclaration(
          undefined,
          undefined,
          "client",
          undefined,
          ClientType,
        ),
      ], // parameters
      f.createBlock(
        [
          f.createExpressionStatement(
            f.createAssignment(
              f.createPropertyAccessExpression(THIS, "client"),
              f.createIdentifier("client"),
            ),
          ),
        ],
        true, // multiline
      ), // body
    ),
  );

  const methodDefs: ts.Expression[] = [];
  const methodDefTypes: ts.TypeNode[] = [];

  members.push(
    f.createPropertyDeclaration(
      [STATIC, READONLY], // modifiers
      "methods", // name
      undefined, // questionOrExclamationToken
      f.createTupleTypeNode(methodDefTypes), // type
      f.createArrayLiteralExpression(
        methodDefs,
        true, // multiline
      ), // initializer
    ),
  );

  let index = 0;
  for (const method of node.interface.methods) {
    generateClientMethod(
      ctx,
      node,
      clientName,
      members,
      methodDefs,
      methodDefTypes,
      method,
      index++,
    );
  }

  ctx.statements.push(
    f.createClassDeclaration([EXPORT], clientName, undefined, [], members),
  );

  ctx.statements.push(
    f.createExpressionStatement(
      f.createCallExpression(
        f.createPropertyAccessExpression(
          f.createIdentifier("$.Registry"),
          "register",
        ),
        undefined, // typeArgs
        [
          f.createPropertyAccessExpression(
            f.createIdentifier(clientName),
            "interfaceId",
          ),
          f.createIdentifier(clientName),
        ],
      ),
    ),
  );
}

export function generateResultPromise(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
): void {
  const nodeId = node.id;

  if (ctx.generatedResultsPromiseIds.has(nodeId)) return;

  ctx.generatedResultsPromiseIds.add(nodeId);

  const resultsClassName = getFullClassName(node);
  const fullClassName = `${resultsClassName}$Promise`;

  const PipelineType = f.createTypeReferenceNode("$.Pipeline", [
    ANY_TYPE,
    ANY_TYPE,
    f.createTypeReferenceNode(resultsClassName, undefined),
  ]);

  const members: ts.ClassElement[] = [];
  members.push(
    f.createPropertyDeclaration(
      undefined,
      "pipeline",
      undefined,
      PipelineType,
      undefined,
    ),
  );

  members.push(
    f.createConstructorDeclaration(
      undefined, // modifiers
      [
        f.createParameterDeclaration(
          undefined,
          undefined,
          "pipeline",
          undefined,
          PipelineType,
        ),
      ], // parameters
      f.createBlock(
        [
          f.createExpressionStatement(
            f.createAssignment(
              f.createPropertyAccessExpression(THIS, "pipeline"),
              f.createIdentifier("pipeline"),
            ),
          ),
        ],
        true, // multiline
      ), // body
    ),
  );

  const struct = node.struct;
  const fields = struct.fields.toArray().sort(compareCodeOrder);

  const generatePromiseFieldMethod = (field: s.Field) => {
    let jsType: string;
    let isInterface = false;
    let slot: s.Field_Slot;

    if (field._isSlot) {
      slot = field.slot;
      const slotType = slot.type;
      if (slotType.which() !== s.Type.INTERFACE) {
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

    const name = field.name;
    const properName = util.c2t(name);
    const jsTypeReference = f.createTypeReferenceNode(jsType, undefined);

    {
      // const pipeline = this.pipeline.getPipeline(SlotType, offset)
      const pipeline = f.createCallExpression(
        f.createPropertyAccessExpression(
          f.createPropertyAccessExpression(THIS, "pipeline"),
          "getPipeline",
        ),
        undefined, // typeArguments
        [
          f.createIdentifier(promisedJsType),
          f.createNumericLiteral(slot.offset.toString()),
        ], // arguments
      ); // call

      // const client = pipeline.client()
      const client = f.createCallExpression(
        f.createPropertyAccessExpression(
          pipeline,
          f.createIdentifier("client"),
        ),
        undefined, // typeArguments
        undefined, // arguments
      );

      // new RemoteInterface(client)
      const remoteInterface = f.createNewExpression(
        f.createIdentifier(jsType), // expression
        undefined, // typeArguments
        [client], // argumentsArray
      );

      members.push(
        f.createMethodDeclaration(
          undefined, // modifiers
          undefined, // asteriskToken
          `get${properName}`,
          undefined,
          undefined,
          [], // parameters
          jsTypeReference,
          f.createBlock(
            [f.createReturnStatement(remoteInterface)],
            true, // multiLine
          ),
        ),
      );
    }
  };

  for (const field of fields) {
    generatePromiseFieldMethod(field);
  }

  {
    members.push(
      f.createMethodDeclaration(
        [ASYNC], // modifiers
        undefined, // asteriskToken
        `promise`,
        undefined,
        undefined,
        [], // parameters
        f.createTypeReferenceNode(
          "Promise",
          [f.createTypeReferenceNode(resultsClassName, undefined)], // typeArguments
        ),
        createExpressionBlock(
          [
            f.createAwaitExpression(
              f.createCallExpression(
                f.createPropertyAccessExpression(
                  f.createPropertyAccessExpression(THIS, "pipeline"),
                  "struct",
                ),
                undefined, // typeArguments
                undefined, // parameters
              ), // call
            ), // await
          ],
          true, // returns
          false, // allowSingleLine
        ),
      ),
    );
  }

  const c = f.createClassDeclaration(
    [EXPORT],
    fullClassName,
    undefined,
    [], // TODO: inheritance
    members,
  );

  ctx.statements.push(c);
}

export function generateClientMethod(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
  clientName: string,
  members: ts.ClassElement[],
  methodDefs: ts.Expression[],
  methodDefTypes: ts.TypeNode[],
  method: s.Method,
  index: number,
): void {
  const name = method.name;

  const paramTypeName = getFullClassName(
    lookupNode(ctx, method.paramStructType),
  );
  const resultTypeName = getFullClassName(
    lookupNode(ctx, method.resultStructType),
  );

  methodDefTypes.push(
    f.createTypeReferenceNode(
      "$.Method",
      [
        f.createTypeReferenceNode(paramTypeName, undefined),
        f.createTypeReferenceNode(resultTypeName, undefined),
      ], // typeArgs
    ),
  );
  methodDefs.push(
    f.createObjectLiteralExpression(
      [
        f.createPropertyAssignment(
          "ParamsClass",
          f.createIdentifier(paramTypeName),
        ),
        f.createPropertyAssignment(
          "ResultsClass",
          f.createIdentifier(resultTypeName),
        ),
        f.createPropertyAssignment(
          "interfaceId",
          f.createPropertyAccessExpression(
            f.createIdentifier(clientName),
            "interfaceId",
          ),
        ),
        f.createPropertyAssignment(
          "methodId",
          f.createNumericLiteral(index.toString()),
        ),
        f.createPropertyAssignment(
          "interfaceName",
          f.createStringLiteral(node.displayName),
        ),
        f.createPropertyAssignment(
          "methodName",
          f.createStringLiteral(method.name),
        ),
      ],
      true /* multiline */,
    ),
  );

  members.push(
    f.createMethodDeclaration(
      undefined, // modifiers
      undefined, // asteriskToken
      name,
      undefined, // typeParameters
      undefined, // questionToken
      [
        f.createParameterDeclaration(
          undefined, // modifiers
          undefined, // dotDotToken
          "paramsFunc",
          QUESTION_TOKEN, // questionToken
          f.createFunctionTypeNode(
            undefined, // typeParameters
            [
              f.createParameterDeclaration(
                undefined, // modifiers
                undefined, // dotDotToken
                "params", // name
                undefined, // questionToken
                f.createTypeReferenceNode(paramTypeName, undefined), // type
              ),
            ],
            VOID_TYPE, // type
          ),
        ),
      ], // parameters
      f.createTypeReferenceNode(`${resultTypeName}$Promise`, undefined),
      f.createBlock(
        [
          f.createVariableStatement(
            undefined, // modifiers
            f.createVariableDeclarationList(
              [
                f.createVariableDeclaration(
                  "answer",
                  undefined,
                  undefined,
                  f.createCallExpression(
                    f.createPropertyAccessExpression(
                      f.createPropertyAccessExpression(THIS, "client"),
                      "call",
                    ),
                    undefined, // typeArgs
                    [
                      f.createObjectLiteralExpression(
                        [
                          f.createPropertyAssignment(
                            "method",
                            f.createElementAccessExpression(
                              f.createPropertyAccessExpression(
                                f.createIdentifier(clientName),
                                "methods",
                              ),
                              index,
                            ),
                          ),
                          f.createPropertyAssignment(
                            "paramsFunc",
                            f.createIdentifier("paramsFunc"),
                          ),
                        ],
                        true, // multiline
                      ),
                    ],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ), // const answer = ...

          f.createVariableStatement(
            undefined, // modifiers
            f.createVariableDeclarationList(
              [
                f.createVariableDeclaration(
                  "pipeline",
                  undefined,
                  undefined,
                  f.createNewExpression(
                    f.createIdentifier("$.Pipeline"),
                    undefined, // typeArgs
                    [
                      f.createIdentifier(resultTypeName),
                      f.createIdentifier("answer"),
                    ],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ), // const pipeline = ...

          f.createReturnStatement(
            f.createNewExpression(
              f.createIdentifier(`${resultTypeName}$Promise`),
              undefined, // typeArguments
              [f.createIdentifier("pipeline")],
            ),
          ),
        ],
        true, // multiline
      ),
    ),
  );
}
