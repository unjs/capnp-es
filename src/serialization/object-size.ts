// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import * as util from "../util";

/**
 * A simple object that describes the size of a struct.
 *
 * @export
 * @class ObjectSize
 */
export class ObjectSize {
  /**
   * Creates a new ObjectSize instance.
   *
   * @param dataByteLength - The number of bytes in the data section of the struct
   * @param pointerLength - The number of pointers in the pointer section of the struct
   */
  constructor(
    public readonly dataByteLength: number,
    public readonly pointerLength: number,
  ) {}

  toString(): string {
    return util.format(
      "ObjectSize_dw:%d,pc:%d",
      getDataWordLength(this),
      this.pointerLength,
    );
  }
}

export function getByteLength(o: ObjectSize): number {
  return o.dataByteLength + o.pointerLength * 8;
}

export function getDataWordLength(o: ObjectSize): number {
  return o.dataByteLength / 8;
}

export function getWordLength(o: ObjectSize): number {
  return o.dataByteLength / 8 + o.pointerLength;
}

export function padToWord(o: ObjectSize): ObjectSize {
  return new ObjectSize(util.padToWord(o.dataByteLength), o.pointerLength);
}
