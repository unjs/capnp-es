// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { MAX_SEGMENT_LENGTH, NATIVE_LITTLE_ENDIAN } from "../constants";
import { SEG_REPLACEMENT_BUFFER_TOO_SMALL, SEG_SIZE_OVERFLOW } from "../errors";
import { format, padToWord } from "../util";
import { Message } from "./message";
import { Pointer } from "./pointers";

export class Segment implements DataView {
  buffer: ArrayBuffer;

  /** The number of bytes currently allocated in the segment. */
  byteLength: number;

  /**
   * This value should always be zero. It's only here to satisfy the DataView interface.
   *
   * In the future the Segment implementation (or a child class) may allow accessing the buffer from a nonzero offset,
   * but that adds a lot of extra arithmetic.
   */
  byteOffset: number;

  readonly [Symbol.toStringTag] = "Segment" as "DataView";
  private _dv: DataView;

  constructor(
    public readonly id: number,
    public readonly message: Message,
    buffer: ArrayBuffer,
    byteLength = 0,
  ) {
    this.message = message;
    this.buffer = buffer;
    this._dv = new DataView(buffer);

    this.byteOffset = 0;
    this.byteLength = byteLength;
  }

  /**
   * Attempt to allocate the requested number of bytes in this segment. If this segment is full this method will return
   * a pointer to freshly allocated space in another segment from the same message.
   *
   * @param byteLength The number of bytes to allocate, will be rounded up to the nearest word.
   * @returns A pointer to the newly allocated space.
   */
  allocate(byteLength: number): Pointer {
    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    let segment: Segment = this;

    byteLength = padToWord(byteLength);

    if (byteLength > MAX_SEGMENT_LENGTH - 8) {
      throw new Error(format(SEG_SIZE_OVERFLOW, byteLength));
    }

    if (!segment.hasCapacity(byteLength)) {
      segment = segment.message.allocateSegment(byteLength);
    }

    const byteOffset = segment.byteLength;

    segment.byteLength += byteLength;

    return new Pointer(segment, byteOffset);
  }

  /**
   * Quickly copy a word (8 bytes) from `srcSegment` into this one at the given offset.
   *
   * @param byteOffset The offset to write the word to.
   * @param srcSegment The segment to copy the word from.
   * @param srcByteOffset The offset from the start of `srcSegment` to copy from.
   */
  copyWord(
    byteOffset: number,
    srcSegment: Segment,
    srcByteOffset: number,
  ): void {
    const value = srcSegment._dv.getFloat64(
      srcByteOffset,
      NATIVE_LITTLE_ENDIAN,
    );

    this._dv.setFloat64(byteOffset, value, NATIVE_LITTLE_ENDIAN);
  }

  /**
   * Quickly copy words from `srcSegment` into this one.
   *
   * @param byteOffset The offset to start copying into.
   * @param srcSegment The segment to copy from.
   * @param srcByteOffset The start offset to copy from.
   * @param wordLength The number of words to copy.
   */
  copyWords(
    byteOffset: number,
    srcSegment: Segment,
    srcByteOffset: number,
    wordLength: number,
  ): void {
    const dst = new Float64Array(this.buffer, byteOffset, wordLength);
    const src = new Float64Array(srcSegment.buffer, srcByteOffset, wordLength);

    dst.set(src);
  }

  /**
   * Quickly fill a number of words in the buffer with zeroes.
   *
   * @param byteOffset The first byte to set to zero.
   * @param wordLength The number of words (not bytes!) to zero out.
   */
  fillZeroWords(byteOffset: number, wordLength: number): void {
    new Float64Array(this.buffer, byteOffset, wordLength).fill(0);
  }

  getBigInt64(byteOffset: number, littleEndian?: boolean): bigint {
    return this._dv.getBigInt64(byteOffset, littleEndian);
  }

  getBigUint64(byteOffset: number, littleEndian?: boolean): bigint {
    return this._dv.getBigUint64(byteOffset, littleEndian);
  }

  /**
   * Get the total number of bytes available in this segment (the size of its underlying buffer).
   *
   * @returns The total number of bytes this segment can hold.
   */
  getCapacity(): number {
    return this.buffer.byteLength;
  }

  /**
   * Read a float16 value out of this segment.
   *
   * NOTE: Non functional, added to allow compilation with TS 5.9+
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getFloat16(_byteOffset: number): number {
    throw new Error("Not implemented");
  }

  /**
   * Read a float32 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getFloat32(byteOffset: number): number {
    return this._dv.getFloat32(byteOffset, true);
  }

  /**
   * Read a float64 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getFloat64(byteOffset: number): number {
    return this._dv.getFloat64(byteOffset, true);
  }

  /**
   * Read an int16 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getInt16(byteOffset: number): number {
    return this._dv.getInt16(byteOffset, true);
  }

  /**
   * Read an int32 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getInt32(byteOffset: number): number {
    return this._dv.getInt32(byteOffset, true);
  }

  /**
   * Read an int64 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getInt64(byteOffset: number): bigint {
    return this._dv.getBigInt64(byteOffset, true);
  }

  /**
   * Read an int8 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getInt8(byteOffset: number): number {
    return this._dv.getInt8(byteOffset);
  }

  /**
   * Read a uint16 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getUint16(byteOffset: number): number {
    return this._dv.getUint16(byteOffset, true);
  }

  /**
   * Read a uint32 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getUint32(byteOffset: number): number {
    return this._dv.getUint32(byteOffset, true);
  }

  /**
   * Read a uint64 value (as a bigint) out of this segment.
   * NOTE: this does not copy the memory region, so updates to the underlying buffer will affect the returned value!
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getUint64(byteOffset: number): bigint {
    return this._dv.getBigUint64(byteOffset, true);
  }

  /**
   * Read a uint8 value out of this segment.
   *
   * @param byteOffset The offset in bytes to the value.
   * @returns The value.
   */
  getUint8(byteOffset: number): number {
    return this._dv.getUint8(byteOffset);
  }

  hasCapacity(byteLength: number): boolean {
    // capacity - allocated >= requested
    return this.buffer.byteLength - this.byteLength >= byteLength;
  }

  /**
   * Quickly check the word at the given offset to see if it is equal to zero.
   *
   * PERF_V8: Fastest way to do this is by reading the whole word as a `number` (float64) in the _native_ endian format
   * and see if it's zero.
   *
   * Benchmark: http://jsben.ch/#/Pjooc
   *
   * @param byteOffset The offset to the word.
   * @returns `true` if the word is zero.
   */
  isWordZero(byteOffset: number): boolean {
    return this._dv.getFloat64(byteOffset, NATIVE_LITTLE_ENDIAN) === 0;
  }

  /**
   * Swap out this segment's underlying buffer with a new one. It's assumed that the new buffer has the same content but
   * more free space, otherwise all existing pointers to this segment will be hilariously broken.
   *
   * @param buffer The new buffer to use.
   */
  replaceBuffer(buffer: ArrayBuffer): void {
    if (this.buffer === buffer) {
      return;
    }

    if (buffer.byteLength < this.byteLength) {
      throw new Error(SEG_REPLACEMENT_BUFFER_TOO_SMALL);
    }

    this._dv = new DataView(buffer);
    this.buffer = buffer;
  }

  setBigInt64(byteOffset: number, value: bigint, littleEndian?: boolean): void {
    this._dv.setBigInt64(byteOffset, value, littleEndian);
  }

  /** WARNING: This function is not yet implemented.  */

  setBigUint64(
    byteOffset: number,
    value: bigint,
    littleEndian?: boolean,
  ): void {
    this._dv.setBigUint64(byteOffset, value, littleEndian);
  }

  /**
   * Write a float16 value to the specified offset.
   *
   * NOTE: Non functional, added to allow compilation with TS 5.9+
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setFloat16(_byteOffset: number, _val: number): void {
    throw new Error("Not implemented");
  }

  /**
   * Write a float32 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setFloat32(byteOffset: number, val: number): void {
    this._dv.setFloat32(byteOffset, val, true);
  }

  /**
   * Write an float64 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setFloat64(byteOffset: number, val: number): void {
    this._dv.setFloat64(byteOffset, val, true);
  }

  /**
   * Write an int16 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setInt16(byteOffset: number, val: number): void {
    this._dv.setInt16(byteOffset, val, true);
  }

  /**
   * Write an int32 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setInt32(byteOffset: number, val: number): void {
    this._dv.setInt32(byteOffset, val, true);
  }

  /**
   * Write an int8 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setInt8(byteOffset: number, val: number): void {
    this._dv.setInt8(byteOffset, val);
  }

  /**
   * Write an int64 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setInt64(byteOffset: number, val: bigint): void {
    this._dv.setBigInt64(byteOffset, val, true);
  }

  /**
   * Write a uint16 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setUint16(byteOffset: number, val: number): void {
    this._dv.setUint16(byteOffset, val, true);
  }

  /**
   * Write a uint32 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setUint32(byteOffset: number, val: number): void {
    this._dv.setUint32(byteOffset, val, true);
  }

  /**
   * Write a uint64 value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setUint64(byteOffset: number, val: bigint): void {
    this._dv.setBigUint64(byteOffset, val, true);
  }

  /**
   * Write a uint8 (byte) value to the specified offset.
   *
   * @param byteOffset The offset from the beginning of the buffer.
   * @param val The value to store.
   */
  setUint8(byteOffset: number, val: number): void {
    this._dv.setUint8(byteOffset, val);
  }

  /**
   * Write a zero word (8 bytes) to the specified offset. This is slightly faster than calling `setUint64` or
   * `setFloat64` with a zero value.
   *
   * Benchmark: http://jsben.ch/#/dUdPI
   *
   * @param byteOffset The offset of the word to set to zero.
   */
  setWordZero(byteOffset: number): void {
    this._dv.setFloat64(byteOffset, 0, NATIVE_LITTLE_ENDIAN);
  }

  toString(): string {
    return format(
      "Segment_id:%d,off:%a,len:%a,cap:%a",
      this.id,
      this.byteLength,
      this.byteOffset,
      this.buffer.byteLength,
    );
  }
}
