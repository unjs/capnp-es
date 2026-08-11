// Runtime primitive type maps for schema-loader.
// Note: compiler/constants.ts has analogous data as strings for code generation;
// these use actual function references and class constructors for runtime use.

import { Type } from "../capnp/schema";
import { Struct } from "./pointers/struct";
import * as utils from "./pointers/utils";
import * as masks from "./mask";
import { ListCtor } from "./pointers/list/list";
import { BoolList } from "./pointers/list/bool-list";
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

export const PRIMITIVE_LIST_CLASSES = new Map<number, ListCtor<any>>([
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

export const TYPE_SIZES = new Map<number, number>([
  [Type.BOOL, 0], // Special case: bit offset
  [Type.INT8, 1],
  [Type.UINT8, 1],
  [Type.INT16, 2],
  [Type.UINT16, 2],
  [Type.INT32, 4],
  [Type.UINT32, 4],
  [Type.INT64, 8],
  [Type.UINT64, 8],
  [Type.FLOAT32, 4],
  [Type.FLOAT64, 8],
  [Type.ENUM, 2], // Enums are 16-bit unsigned integers
]);

export const PRIMITIVE_GETTERS = new Map<
  number,
  (offset: number, s: Struct) => any
>([
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

export const PRIMITIVE_SETTERS = new Map<
  number,
  (offset: number, value: any, s: Struct) => void
>([
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

export const PRIMITIVE_MASK_FUNCTIONS = new Map<
  number,
  (...args: any[]) => DataView
>([
  [Type.BOOL, masks.getBitMask],
  [Type.INT8, masks.getInt8Mask],
  [Type.INT16, masks.getInt16Mask],
  [Type.INT32, masks.getInt32Mask],
  [Type.INT64, masks.getInt64Mask],
  [Type.UINT8, masks.getUint8Mask],
  [Type.UINT16, masks.getUint16Mask],
  [Type.UINT32, masks.getUint32Mask],
  [Type.UINT64, masks.getUint64Mask],
  [Type.FLOAT32, masks.getFloat32Mask],
  [Type.FLOAT64, masks.getFloat64Mask],
  [Type.ENUM, masks.getUint16Mask], // Enums are uint16
]);
