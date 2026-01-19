// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test } from "vitest";
import { compareBuffers } from "test/utils";
import { MAX_SAFE_INTEGER, MIN_SAFE_INTEGER } from "src/constants";
import {
  getBitMask,
  getFloat32Mask,
  getFloat64Mask,
  getInt16Mask,
  getInt32Mask,
  getInt64Mask,
  getInt8Mask,
  getUint16Mask,
  getUint32Mask,
  getUint64Mask,
  getUint8Mask,
} from "src/serialization/mask";

type MaskArray<T> = Array<{ mask: number[]; val: T }>;

const BIT_MASKS = [
  { mask: [0b0000_0000], bitOffset: 5, val: false },
  { mask: [0b0010_0000], bitOffset: 5, val: true },
  { mask: [0b0000_0001], bitOffset: 0, val: true },
  { mask: [0b0010_0000], bitOffset: 13, val: true },
];

const FLOAT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0 },
  { mask: [0xdb, 0x0f, 0x49, 0x40], val: Math.PI },
  { mask: [0x00, 0x00, 0x80, 0x7f], val: Infinity },
  { mask: [0x00, 0x00, 0x80, 0xff], val: -Infinity },
  { mask: [0x00, 0x00, 0x20, 0x41], val: 10 },
];

const FLOAT_64_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], val: 0 },
  { mask: [0x18, 0x2d, 0x44, 0x54, 0xfb, 0x21, 0x09, 0x40], val: Math.PI },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x7f], val: Infinity },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0xff], val: -Infinity },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x24, 0x40], val: 10 },
];

const INT_16_MASKS = [
  { mask: [0x00, 0x00], val: 0x00_00 },
  { mask: [0x78, 0x56], val: 0x56_78 },
  { mask: [0x00, 0x80], val: -0x80_00 },
  { mask: [0xff, 0x7f], val: 0x7f_ff },
  { mask: [0xff, 0xff], val: -0x00_01 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff], val: 0xff_ff },
  { mask: [0x00, 0x80], val: 0x80_00 },
  { mask: [0x21, 0x22], val: 0xf_ff_ff_ff_ff + 0x22_22 },
];

const INT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0x00_00_00_00 },
  { mask: [0x67, 0x45, 0x23, 0x01], val: 0x01_23_45_67 },
  { mask: [0x00, 0x00, 0x00, 0x80], val: -0x80_00_00_00 },
  { mask: [0xff, 0xff, 0xff, 0x7f], val: 0x7f_ff_ff_ff },
  { mask: [0xff, 0xff, 0xff, 0xff], val: -0x00_00_00_01 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff, 0xff, 0xff], val: 0xff_ff_ff_ff },
  { mask: [0x00, 0x00, 0x00, 0x80], val: 0x80_00_00_00 },
  { mask: [0x21, 0x22, 0x00, 0x00], val: 0xf_ff_ff_ff_ff + 0x22_22 },
];

const INT_64_MASKS = [
  {
    mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    val: 0x00_00_00_00_00_00_00_00n,
  },
  {
    mask: [0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12, 0x00],
    val: 0x00_12_34_56_78_9a_bc_den,
  },
  {
    mask: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0xff],
    val: BigInt(MIN_SAFE_INTEGER),
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00],
    val: BigInt(MAX_SAFE_INTEGER),
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
    val: -0x00_00_00_00_00_00_00_01n,
  },
];

const INT_8_MASKS = [
  { mask: [0x00], val: 0x00 },
  { mask: [0x78], val: 0x78 },
  { mask: [0x80], val: -0x80 },
  { mask: [0x7f], val: 0x7f },
  { mask: [0xff], val: -0x01 },
  // Testing overflow behavior.
  { mask: [0xff], val: 0xff },
  { mask: [0x80], val: 0x80 },
  { mask: [0x21], val: 0xf_ff_ff_ff_ff + 0x22 },
];

const UINT_16_MASKS = [
  { mask: [0x00, 0x00], val: 0x00_00 },
  { mask: [0x78, 0x56], val: 0x56_78 },
  { mask: [0xff, 0xff], val: 0xff_ff },
  { mask: [0xff, 0x7f], val: 0x7f_ff },
  { mask: [0x00, 0x80], val: 0x80_00 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff], val: -0x00_01 },
  { mask: [0x00, 0x80], val: -0x80_00 },
  { mask: [0x21, 0x22], val: 0xf_ff_ff_ff_ff + 0x22_22 },
];

const UINT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0x00_00_00_00 },
  { mask: [0x78, 0x56, 0x34, 0x12], val: 0x12_34_56_78 },
  { mask: [0xff, 0xff, 0xff, 0x7f], val: 0x7f_ff_ff_ff },
  { mask: [0xff, 0xff, 0xff, 0xff], val: 0xff_ff_ff_ff },
  { mask: [0x00, 0x00, 0x00, 0x80], val: 0x80_00_00_00 },
  // Testing overflow behavior.
  { mask: [0x00, 0x00, 0x00, 0x80], val: -0x80_00_00_00 },
  { mask: [0xff, 0xff, 0xff, 0xff], val: -0x00_00_00_01 },
  { mask: [0x21, 0x22, 0x00, 0x00], val: 0xf_ff_ff_ff_ff + 0x00_00_22_22 },
];

const UINT_64_MASKS = [
  {
    mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    val: 0x00_00_00_00_00_00_00_00n,
  },
  {
    mask: [0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12, 0x00],
    val: 0x00_12_34_56_78_9a_bc_den,
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00],
    val: BigInt(MAX_SAFE_INTEGER),
  },
  {
    mask: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0xff],
    val: BigInt(MIN_SAFE_INTEGER),
  },
];

const UINT_8_MASKS = [
  { mask: [0x00], val: 0x00 },
  { mask: [0x78], val: 0x78 },
  { mask: [0x7f], val: 0x7f },
  { mask: [0xff], val: 0xff },
  { mask: [0x80], val: 0x80 },
  // Testing overflow behavior.
  { mask: [0x80], val: -0x80 },
  { mask: [0xff], val: -0x01 },
  { mask: [0x21], val: 0xf_ff_ff_ff_ff + 0x22_22 },
];

function makeMaskTest<T>(
  name: string,
  fn: (x: T) => DataView,
  testData: MaskArray<T>,
) {
  test(name, () => {
    for (const { mask, val } of testData) {
      compareBuffers(
        fn(val).buffer as ArrayBuffer,
        new Uint8Array(mask).buffer,
      );
    }
  });
}

test("getBitMask()", () => {
  for (const { bitOffset, mask, val } of BIT_MASKS) {
    compareBuffers(
      getBitMask(val, bitOffset).buffer as ArrayBuffer,
      new Uint8Array(mask).buffer,
    );
  }
});

makeMaskTest("getFloat32Mask()", getFloat32Mask, FLOAT_32_MASKS);
makeMaskTest("getFloat64Mask()", getFloat64Mask, FLOAT_64_MASKS);
makeMaskTest("getInt16Mask()", getInt16Mask, INT_16_MASKS);
makeMaskTest("getInt32Mask()", getInt32Mask, INT_32_MASKS);
makeMaskTest("getInt64Mask()", getInt64Mask, INT_64_MASKS);
makeMaskTest("getInt8Mask()", getInt8Mask, INT_8_MASKS);
makeMaskTest("getUint16Mask()", getUint16Mask, UINT_16_MASKS);
makeMaskTest("getUint32Mask()", getUint32Mask, UINT_32_MASKS);
makeMaskTest("getUint64Mask()", getUint64Mask, UINT_64_MASKS);
makeMaskTest("getUint8Mask()", getUint8Mask, UINT_8_MASKS);
