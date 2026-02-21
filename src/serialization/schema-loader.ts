// SchemaLoader - Dynamically load Cap'n Proto schemas from Node definitions

import { ObjectSize } from "./object-size";
import { Struct, StructCtor } from "./pointers/struct";
import * as utils from "./pointers/utils";
import { Node, Type } from "../capnp/schema";
import { CompositeList } from "./pointers/list/composite-list";
import { ListCtor } from "./pointers/list/list";
import {
  PRIMITIVE_LIST_CLASSES,
  PRIMITIVE_GETTERS,
  PRIMITIVE_SETTERS,
  TYPE_SIZES,
} from "./primitive-info";

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
  enumTypeId?: bigint;
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
  private enumMaps: Map<string, Map<number, string>> = new Map(); // enumTypeId -> (value -> name)
  private structEnumFields: Map<string, Map<string, bigint>> = new Map(); // structId -> (fieldName -> enumTypeId)

  /**
   * Load an enum node to enable enum name lookups.
   * Call this before loading structs that use the enum.
   */
  loadEnum(node: Node): void {
    if (!node._isEnum) {
      throw new Error(
        `Node ${node.displayName} (${node.id}) is not an enum node`,
      );
    }

    const enumId = node.id.toString();
    const valueToName = new Map<number, string>();
    const enumNode = node.enum;

    for (let i = 0; i < enumNode.enumerants.length; i++) {
      const enumerant = enumNode.enumerants.get(i);
      valueToName.set(i, enumerant.name);
    }

    this.enumMaps.set(enumId, valueToName);
  }

  /**
   * Get the name of an enum value.
   * @param enumTypeId - The ID of the enum type
   * @param value - The numeric enum value
   * @returns The enum name, or undefined if not found
   */
  getEnumName(enumTypeId: bigint, value: number): string | undefined {
    const enumMap = this.enumMaps.get(enumTypeId.toString());
    return enumMap?.get(value);
  }

  /**
   * Get the enum type ID for a field in a struct.
   * @param structId - The ID of the struct type
   * @param fieldName - The name of the field
   * @returns The enum type ID, or undefined if the field is not an enum
   */
  getFieldEnumType(structId: string, fieldName: string): bigint | undefined {
    const fields = this.structEnumFields.get(structId);
    return fields?.get(fieldName);
  }

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
    const size = new ObjectSize(
      structInfo.dataWordCount * 8,
      structInfo.pointerCount,
    );
    const fields = this.parseFields(structInfo.fields);

    // Track which fields are enums
    const enumFields = new Map<string, bigint>();
    for (const field of fields) {
      if (field.type === Type.ENUM && field.enumTypeId !== undefined) {
        enumFields.set(field.name, field.enumTypeId);
      }
    }
    if (enumFields.size > 0) {
      this.structEnumFields.set(id.toString(), enumFields);
    }

    const structCtor = this.createDynamicStruct(
      id.toString(16),
      displayName,
      size,
      fields,
    );

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
      throw new Error(
        `Schema with ID ${id} not found. Did you call loadDynamic()?`,
      );
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

      switch (type) {
        case Type.STRUCT: {
          fieldInfo.structTypeId = fieldType.struct.typeId;
          break;
        }
        case Type.ENUM: {
          fieldInfo.enumTypeId = fieldType.enum.typeId;
          break;
        }
        case Type.LIST: {
          const elementType = fieldType.list.elementType;
          const elementTypeWhich = elementType.which();
          fieldInfo.listElementType = elementTypeWhich;
          if (elementTypeWhich === Type.STRUCT) {
            fieldInfo.listElementStructTypeId = elementType.struct.typeId;
          }
          break;
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
    fields: FieldInfo[],
  ): StructCtor<any> {
    const DynamicStruct = class extends Struct {
      static readonly _capnp = { displayName, id, size };
      toString(): string {
        return `${displayName}_${super.toString()}`;
      }
    } satisfies StructCtor<any>;

    for (const field of fields) {
      this.addFieldAccessor(DynamicStruct.prototype, field);
    }

    return DynamicStruct;
  }

  /**
   * Add getter and setter for a field to the prototype
   */
  private addFieldAccessor(prototype: any, field: FieldInfo): void {
    const schemas = this.schemas;
    const descriptor: PropertyDescriptor = {
      enumerable: true,
      configurable: true,
    };

    const primitiveGetter = PRIMITIVE_GETTERS.get(field.type);
    if (primitiveGetter) {
      // Primitive type
      const byteOffset =
        field.type === Type.BOOL
          ? field.offset
          : field.offset * (TYPE_SIZES.get(field.type) || 8);
      descriptor.get = function (this: Struct) {
        return primitiveGetter(byteOffset, this);
      };
      const primitiveSetter = PRIMITIVE_SETTERS.get(field.type);
      if (primitiveSetter) {
        descriptor.set = function (this: Struct, value: any) {
          primitiveSetter(byteOffset, value, this);
        };
      }
    } else {
      switch (field.type) {
        case Type.TEXT: {
          descriptor.get = function (this: Struct) {
            return utils.getText(field.offset, this);
          };
          descriptor.set = function (this: Struct, value: string) {
            utils.setText(field.offset, value, this);
          };
          break;
        }
        case Type.DATA: {
          descriptor.get = function (this: Struct) {
            return utils.getData(field.offset, this);
          };
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
          descriptor.get = function (this: Struct) {
            return utils.getPointer(field.offset, this);
          };
        }
      }
    }

    Object.defineProperty(prototype, field.name, descriptor);
  }

  /**
   * Create a getter function for a list field
   */
  private createListGetter(
    field: FieldInfo,
    schemas: Map<string, LoadedSchema>,
  ): (this: Struct) => any {
    const { listElementType, listElementStructTypeId } = field;

    // Struct list - resolve constructor at runtime
    if (
      listElementType === Type.STRUCT &&
      listElementStructTypeId !== undefined
    ) {
      let cachedListClass: ListCtor<any> | null = null;
      return function (this: Struct) {
        if (!cachedListClass) {
          const elementSchema = schemas.get(listElementStructTypeId.toString());
          if (!elementSchema) {
            throw new Error(
              `Schema for list element type ${listElementStructTypeId} not found`,
            );
          }
          cachedListClass = CompositeList(elementSchema.structCtor);
        }
        return utils.getList(field.offset, cachedListClass, this);
      };
    }

    // Primitive list
    if (listElementType === undefined) {
      return function (this: Struct) {
        return utils.getPointer(field.offset, this);
      };
    }

    const listClass = PRIMITIVE_LIST_CLASSES.get(listElementType);
    if (listClass) {
      return function (this: Struct) {
        return utils.getList(field.offset, listClass, this);
      };
    }

    // Fallback
    return function (this: Struct) {
      return utils.getPointer(field.offset, this);
    };
  }

  /**
   * Create a getter function for a struct field
   */
  private createStructGetter(
    field: FieldInfo,
    schemas: Map<string, LoadedSchema>,
  ): (this: Struct) => any {
    const { structTypeId } = field;

    if (structTypeId !== undefined) {
      let cachedStructCtor: StructCtor<any> | null = null;
      return function (this: Struct) {
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

    return function (this: Struct) {
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
