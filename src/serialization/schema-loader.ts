// SchemaLoader - Dynamically load Cap'n Proto schemas from Node definitions

import { ObjectSize } from "./object-size";
import { Struct, StructCtor } from "./pointers/struct";
import * as utils from "./pointers/utils";
import { Node, Type } from "../capnp/schema";
import { CompositeList } from "./pointers/list/composite-list";
import { Float32List } from "./pointers/list/float32-list";
import { Float64List } from "./pointers/list/float64-list";
import { Int8List } from "./pointers/list/int8-list";
import { Int16List } from "./pointers/list/int16-list";
import { Int32List } from "./pointers/list/int32-list";
import { Int64List } from "./pointers/list/int64-list";
import { Uint8List } from "./pointers/list/uint8-list";
import { Uint16List } from "./pointers/list/uint16-list";
import { Uint32List } from "./pointers/list/uint32-list";
import { Uint64List } from "./pointers/list/uint64-list";
import { TextList } from "./pointers/list/text-list";
import { DataList } from "./pointers/list/data-list";
import { BoolList } from "./pointers/list/bool-list";
import { ListCtor } from "./pointers/list/list";

// Lookup maps for primitive types
const PRIMITIVE_LIST_CLASSES = new Map<number, ListCtor<any>>([
  [Type.BOOL, BoolList],
  [Type.INT8, Int8List],
  [Type.INT16, Int16List],
  [Type.INT32, Int32List],
  [Type.INT64, Int64List],
  [Type.UINT8, Uint8List],
  [Type.UINT16, Uint16List],
  [Type.UINT32, Uint32List],
  [Type.UINT64, Uint64List],
  [Type.FLOAT32, Float32List],
  [Type.FLOAT64, Float64List],
  [Type.TEXT, TextList],
  [Type.DATA, DataList],
]);

const TYPE_SIZES = new Map<number, number>([
  [Type.BOOL, 0], // Special case: bit offset
  [Type.INT8, 1], [Type.UINT8, 1],
  [Type.INT16, 2], [Type.UINT16, 2],
  [Type.INT32, 4], [Type.UINT32, 4],
  [Type.INT64, 8], [Type.UINT64, 8],
  [Type.FLOAT32, 4], [Type.FLOAT64, 8],
  [Type.ENUM, 2], // Enums are 16-bit unsigned integers
]);

const PRIMITIVE_GETTERS = new Map<number, (offset: number, s: Struct) => any>([
  [Type.BOOL, utils.getBit],
  [Type.INT8, utils.getInt8],
  [Type.INT16, utils.getInt16],
  [Type.INT32, utils.getInt32],
  [Type.INT64, utils.getInt64],
  [Type.UINT8, utils.getUint8],
  [Type.UINT16, utils.getUint16],
  [Type.UINT32, utils.getUint32],
  [Type.UINT64, utils.getUint64],
  [Type.FLOAT32, utils.getFloat32],
  [Type.FLOAT64, utils.getFloat64],
  [Type.ENUM, utils.getUint16], // Enums are uint16
]);

const PRIMITIVE_SETTERS = new Map<number, (offset: number, value: any, s: Struct) => void>([
  [Type.BOOL, utils.setBit],
  [Type.INT8, utils.setInt8],
  [Type.INT16, utils.setInt16],
  [Type.INT32, utils.setInt32],
  [Type.INT64, utils.setInt64],
  [Type.UINT8, utils.setUint8],
  [Type.UINT16, utils.setUint16],
  [Type.UINT32, utils.setUint32],
  [Type.UINT64, utils.setUint64],
  [Type.FLOAT32, utils.setFloat32],
  [Type.FLOAT64, utils.setFloat64],
  [Type.ENUM, utils.setUint16], // Enums are uint16
]);

/**
 * Information about a loaded schema
 */
export interface LoadedSchema {
  id: bigint;
  displayName: string;
  size: ObjectSize;
  structCtor: StructCtor<any>;
}

/**
 * Information about a field in a schema
 */
interface FieldInfo {
  name: string;
  offset: number;
  type: number; // Type enum value
  structTypeId?: bigint;
  listElementType?: number;
  listElementStructTypeId?: bigint;
}

/**
 * SchemaLoader allows loading Cap'n Proto schemas dynamically from Node objects
 * and creating struct constructors that can be used to decode messages.
 *
 * This is similar to pycapnp's SchemaLoader.
 *
 * @example
 * ```typescript
 * const loader = new SchemaLoader();
 *
 * // Load schema nodes
 * for (const node of schemaNodes) {
 *   loader.loadDynamic(node);
 * }
 *
 * // Get a schema and use it to decode a message
 * const schema = loader.get(schemaId);
 * const message = new Message(messageBytes);
 * const decoded = message.getRoot(schema.structCtor);
 * ```
 */
export class SchemaLoader {
  private schemas: Map<string, LoadedSchema> = new Map();

  /**
   * Load a schema node dynamically.
   */
  loadDynamic(node: Node): LoadedSchema {
    const id = node.id;
    const displayName = node.displayName.split(":").at(-1) || node.displayName;

    if (!node._isStruct) {
      throw new Error(`Node ${displayName} (${id}) is not a struct`);
    }

    const structInfo = node.struct;
    const size = new ObjectSize(structInfo.dataWordCount * 8, structInfo.pointerCount);
    const fields = this.parseFields(structInfo.fields);
    const structCtor = this.createDynamicStruct(id.toString(16), displayName, size, fields);

    const schema: LoadedSchema = { id, displayName, size, structCtor };
    this.schemas.set(id.toString(), schema);
    return schema;
  }

  /**
   * Get a loaded schema by its ID.
   */
  get(id: bigint): LoadedSchema {
    const schema = this.schemas.get(id.toString());
    if (!schema) {
      throw new Error(`Schema with ID ${id} not found. Did you call loadDynamic()?`);
    }
    return schema;
  }

  /**
   * Get a loaded schema by its display name.
   */
  getByName(name: string): LoadedSchema | undefined {
    for (const schema of this.schemas.values()) {
      if (schema.displayName === name) {
        return schema;
      }
    }
    return undefined;
  }

  /**
   * Parse field information from a Field list
   */
  private parseFields(fieldsList: any): FieldInfo[] {
    const fields: FieldInfo[] = [];

    for (let i = 0; i < fieldsList.length; i++) {
      const field = fieldsList.get(i);
      if (!field._isSlot) continue;

      const slot = field.slot;
      const fieldType = slot.type;
      const type = fieldType.which();

      const fieldInfo: FieldInfo = {
        name: field.name,
        offset: slot.offset,
        type,
      };

      if (type === Type.STRUCT) {
        fieldInfo.structTypeId = fieldType.struct.typeId;
      } else if (type === Type.LIST) {
        const elementType = fieldType.list.elementType;
        const elementTypeWhich = elementType.which();
        fieldInfo.listElementType = elementTypeWhich;
        if (elementTypeWhich === Type.STRUCT) {
          fieldInfo.listElementStructTypeId = elementType.struct.typeId;
        }
      }

      fields.push(fieldInfo);
    }

    return fields;
  }

  /**
   * Create a dynamic struct constructor from schema information
   */
  private createDynamicStruct(
    id: string,
    displayName: string,
    size: ObjectSize,
    fields: FieldInfo[]
  ): StructCtor<any> {
    const DynamicStruct = class extends Struct {
      static readonly _capnp = { displayName, id, size };
      toString(): string {
        return `${displayName}_${super.toString()}`;
      }
    };

    for (const field of fields) {
      this.addFieldAccessor(DynamicStruct.prototype, field);
    }

    return DynamicStruct as StructCtor<any>;
  }

  /**
   * Add getter and setter for a field to the prototype
   */
  private addFieldAccessor(prototype: any, field: FieldInfo): void {
    const schemas = this.schemas;
    const descriptor: PropertyDescriptor = { enumerable: true, configurable: true };

    const primitiveGetter = PRIMITIVE_GETTERS.get(field.type);
    if (primitiveGetter) {
      // Primitive type
      const byteOffset = field.type === Type.BOOL ? field.offset : field.offset * (TYPE_SIZES.get(field.type) || 8);
      descriptor.get = function(this: Struct) {
        return primitiveGetter(byteOffset, this);
      };
      const primitiveSetter = PRIMITIVE_SETTERS.get(field.type);
      if (primitiveSetter) {
        descriptor.set = function(this: Struct, value: any) {
          primitiveSetter(byteOffset, value, this);
        };
      }
    } else {
      switch (field.type) {
        case Type.TEXT: {
          descriptor.get = function(this: Struct) { return utils.getText(field.offset, this); };
          descriptor.set = function(this: Struct, value: string) { utils.setText(field.offset, value, this); };
          break;
        }
        case Type.DATA: {
          descriptor.get = function(this: Struct) { return utils.getData(field.offset, this); };
          break;
        }
        case Type.LIST: {
          descriptor.get = this.createListGetter(field, schemas);
          break;
        }
        case Type.STRUCT: {
          descriptor.get = this.createStructGetter(field, schemas);
          break;
        }
        default: {
          descriptor.get = function(this: Struct) { return utils.getPointer(field.offset, this); };
        }
      }
    }

    Object.defineProperty(prototype, field.name, descriptor);
  }

  /**
   * Create a getter function for a list field
   */
  private createListGetter(field: FieldInfo, schemas: Map<string, LoadedSchema>): (this: Struct) => any {
    const { listElementType, listElementStructTypeId } = field;

    // Struct list - resolve constructor at runtime
    if (listElementType === Type.STRUCT && listElementStructTypeId !== undefined) {
      let cachedListClass: ListCtor<any> | null = null;
      return function(this: Struct) {
        if (!cachedListClass) {
          const elementSchema = schemas.get(listElementStructTypeId.toString());
          if (!elementSchema) {
            throw new Error(`Schema for list element type ${listElementStructTypeId} not found`);
          }
          cachedListClass = CompositeList(elementSchema.structCtor);
        }
        return utils.getList(field.offset, cachedListClass, this);
      };
    }

    // Primitive list
    if (listElementType === undefined) {
      return function(this: Struct) {
        return utils.getPointer(field.offset, this);
      };
    }

    const listClass = PRIMITIVE_LIST_CLASSES.get(listElementType);
    if (listClass) {
      return function(this: Struct) {
        return utils.getList(field.offset, listClass, this);
      };
    }

    // Fallback
    return function(this: Struct) {
      return utils.getPointer(field.offset, this);
    };
  }

  /**
   * Create a getter function for a struct field
   */
  private createStructGetter(field: FieldInfo, schemas: Map<string, LoadedSchema>): (this: Struct) => any {
    const { structTypeId } = field;

    if (structTypeId !== undefined) {
      let cachedStructCtor: StructCtor<any> | null = null;
      return function(this: Struct) {
        if (!cachedStructCtor) {
          const schema = schemas.get(structTypeId.toString());
          if (!schema) {
            throw new Error(`Schema for struct type ${structTypeId} not found`);
          }
          cachedStructCtor = schema.structCtor;
        }
        return utils.getStruct(field.offset, cachedStructCtor, this);
      };
    }

    return function(this: Struct) {
      return utils.getPointer(field.offset, this);
    };
  }

  /**
   * Convert a struct instance to a plain JavaScript object.
   */
  toObject(struct: Struct): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const key of Object.keys(Object.getPrototypeOf(struct))) {
      try {
        const value = (struct as any)[key];
        if (typeof value === "function" || value === undefined) {
          continue;
        }
        obj[key] = value;
      } catch {
        obj[key] = null;
      }
    }
    return obj;
  }
}
