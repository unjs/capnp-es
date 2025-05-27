// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { ListElementSize } from "../list-element-size";
import { List } from "./list/list";
import { validate, getContent } from "./pointer.utils";
import { Pointer, PointerType } from "./pointer";

/**
 * A generic blob of bytes. Can be converted to a DataView or Uint8Array to access its contents using `toDataView()` and
 * `toUint8Array()`. Use `copyBuffer()` to copy an entire buffer at once.
 */
export class Data extends List<number> {
  static fromPointer(pointer: Pointer): Data {
    validate(PointerType.LIST, pointer, ListElementSize.BYTE);

    return this._fromPointerUnchecked(pointer);
  }

  protected static _fromPointerUnchecked(pointer: Pointer): Data {
    return new this(
      pointer.segment,
      pointer.byteOffset,
      pointer._capnp.depthLimit,
    );
  }

  /**
   * Copy the contents of `src` into this Data pointer. If `src` is smaller than the length of this pointer then the
   * remaining bytes will be zeroed out. Extra bytes in `src` are ignored.
   *
   * @param src The source buffer.
   */
  // TODO: Would be nice to have a way to zero-copy a buffer by allocating a new segment into the message with that
  // buffer data.
  copyBuffer(src: ArrayBuffer | ArrayBufferView): void {
    const c = getContent(this);

    const dstLength = this.length;
    const srcLength = src.byteLength;

    const i =
      src instanceof ArrayBuffer
        ? new Uint8Array(src)
        : new Uint8Array(
            src.buffer,
            src.byteOffset,
            Math.min(dstLength, srcLength),
          );

    const o = new Uint8Array(c.segment.buffer, c.byteOffset, this.length);

    o.set(i);

    if (dstLength > srcLength) {
      o.fill(0, srcLength, dstLength);
    }
  }

  /**
   * Read a byte from the specified offset.
   *
   * @param byteOffset The byte offset to read.
   * @returns The byte value.
   */
  get(byteOffset: number): number {
    const c = getContent(this);
    return c.segment.getUint8(c.byteOffset + byteOffset);
  }

  /**
   * Write a byte at the specified offset.
   *
   * @param byteOffset The byte offset to set.
   * @param value The byte value to set.
   */

  set(byteOffset: number, value: number): void {
    const c = getContent(this);
    c.segment.setUint8(c.byteOffset + byteOffset, value);
  }

  /**
   * Creates a **copy** of the underlying buffer data and returns it as an ArrayBuffer.
   *
   * To obtain a reference to the underlying buffer instead, use `toUint8Array()` or `toDataView()`.
   *
   * @returns A copy of this data buffer.
   */

  toArrayBuffer(): ArrayBuffer {
    const c = getContent(this);
    return c.segment.buffer.slice(c.byteOffset, c.byteOffset + this.length);
  }

  /**
   * Convert this Data pointer to a DataView representing the pointer's contents.
   *
   * WARNING: The DataView references memory from a message segment, so do not venture outside the bounds of the
   * DataView or else BAD THINGS.
   *
   * @returns A live reference to the underlying buffer.
   */

  toDataView(): DataView {
    const c = getContent(this);
    return new DataView(c.segment.buffer, c.byteOffset, this.length);
  }

  [Symbol.toStringTag](): string {
    return `Data_${super.toString()}`;
  }

  /**
   * Convert this Data pointer to a Uint8Array representing the pointer's contents.
   *
   * WARNING: The Uint8Array references memory from a message segment, so do not venture outside the bounds of the
   * Uint8Array or else BAD THINGS.
   *
   * @returns A live reference to the underlying buffer.
   */

  toUint8Array(): Uint8Array {
    const c = getContent(this);
    return new Uint8Array(c.segment.buffer, c.byteOffset, this.length);
  }
}
