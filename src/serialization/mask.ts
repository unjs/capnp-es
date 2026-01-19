// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { INVARIANT_UNREACHABLE_CODE } from "../errors";

type DataViewSetter<T> = (
  byteOffset: number,
  value: T,
  littleEndian?: boolean,
) => void;

function _makePrimitiveMaskFn<T>(
  byteLength: number,
  setter: DataViewSetter<T>,
): (x: T) => DataView {
  return (x: T): DataView => {
    const dv = new DataView(new ArrayBuffer(byteLength));
    setter.call(dv, 0, x, true);
    return dv;
  };
}

export const getFloat32Mask = _makePrimitiveMaskFn(
  4,
  DataView.prototype.setFloat32,
);
export const getFloat64Mask = _makePrimitiveMaskFn(
  8,
  DataView.prototype.setFloat64,
);
export const getInt16Mask = _makePrimitiveMaskFn(
  2,
  DataView.prototype.setInt16,
);
export const getInt32Mask = _makePrimitiveMaskFn(
  4,
  DataView.prototype.setInt32,
);
export const getInt64Mask = _makePrimitiveMaskFn(
  8,
  DataView.prototype.setBigInt64,
);
export const getInt8Mask = _makePrimitiveMaskFn(1, DataView.prototype.setInt8);
export const getUint16Mask = _makePrimitiveMaskFn(
  2,
  DataView.prototype.setUint16,
);
export const getUint32Mask = _makePrimitiveMaskFn(
  4,
  DataView.prototype.setUint32,
);
export const getUint64Mask = _makePrimitiveMaskFn(
  8,
  DataView.prototype.setBigUint64,
);
export const getUint8Mask = _makePrimitiveMaskFn(
  1,
  DataView.prototype.setUint8,
);

export function getBitMask(value: boolean, bitOffset: number): DataView {
  const dv = new DataView(new ArrayBuffer(1));

  if (!value) {
    return dv;
  }

  dv.setUint8(0, 1 << (bitOffset % 8));
  return dv;
}

export function getVoidMask(): void {
  throw new Error(INVARIANT_UNREACHABLE_CODE);
}
