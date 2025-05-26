// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import {
  LIST_SIZE_MASK,
  POINTER_DOUBLE_FAR_MASK,
  POINTER_TYPE_MASK,
} from "../../constants";
import { bufferToHex, format, padToWord } from "../../util";
import { ListElementSize } from "../list-element-size";
import {
  ObjectSize,
  getByteLength,
  padToWord as padObjectToWord,
  getWordLength,
  getDataWordLength,
} from "../object-size";
import { Segment } from "../segment";
import { Orphan } from "./orphan";
import { Message } from "../message";
import {
  PTR_TRAVERSAL_LIMIT_EXCEEDED,
  PTR_DEPTH_LIMIT_EXCEEDED,
  PTR_INVALID_LIST_SIZE,
  PTR_INVALID_POINTER_TYPE,
  PTR_INVALID_FAR_TARGET,
  TYPE_COMPOSITE_SIZE_UNDEFINED,
  PTR_WRONG_POINTER_TYPE,
  PTR_WRONG_LIST_TYPE,
  INVARIANT_UNREACHABLE_CODE,
} from "../../errors";
import { Pointer, PointerType } from "./pointer";

export function adopt<T extends Pointer>(src: Orphan<T>, p: T): void {
  src._moveTo(p);
}

/**
 * Convert a pointer to an Orphan, zeroing out the pointer and leaving its content untouched. If the content is no
 * longer needed, call `disown()` on the orphaned pointer to erase the contents as well.
 *
 * Call `adopt()` on the orphan with the new target pointer location to move it back into the message; the orphan
 * object is then invalidated after adoption (can only adopt once!).
 *
 * @param p The pointer to turn into an Orphan.
 * @returns An orphaned pointer.
 */

export function disown<T extends Pointer>(p: T): Orphan<T> {
  return new Orphan(p);
}

export function dump(p: Pointer): string {
  return bufferToHex(p.segment.buffer.slice(p.byteOffset, p.byteOffset + 8));
}

/**
 * Get the total number of bytes required to hold a list of the provided size with the given length, rounded up to the
 * nearest word.
 *
 * @param elementSize A number describing the size of the list elements.
 * @param length The length of the list.
 * @param compositeSize The size of each element in a composite list; required if
 * `elementSize === ListElementSize.COMPOSITE`.
 * @returns The number of bytes required to hold an element of that size, or `NaN` if that is undefined.
 */

export function getListByteLength(
  elementSize: ListElementSize,
  length: number,
  compositeSize?: ObjectSize,
): number {
  switch (elementSize) {
    case ListElementSize.BIT: {
      return padToWord((length + 7) >>> 3);
    }

    case ListElementSize.BYTE:
    case ListElementSize.BYTE_2:
    case ListElementSize.BYTE_4:
    case ListElementSize.BYTE_8:
    case ListElementSize.POINTER:
    case ListElementSize.VOID: {
      return padToWord(getListElementByteLength(elementSize) * length);
    }

    /* istanbul ignore next */
    case ListElementSize.COMPOSITE: {
      if (compositeSize === undefined) {
        throw new Error(format(PTR_INVALID_LIST_SIZE, Number.NaN));
      }

      return length * padToWord(getByteLength(compositeSize));
    }

    /* istanbul ignore next */
    default: {
      throw new Error(PTR_INVALID_LIST_SIZE);
    }
  }
}

/**
 * Get the number of bytes required to hold a list element of the provided size. `COMPOSITE` elements do not have a
 * fixed size, and `BIT` elements are packed into exactly a single bit, so these both return `NaN`.
 *
 * @param elementSize A number describing the size of the list elements.
 * @returns The number of bytes required to hold an element of that size, or `NaN` if that is undefined.
 */

export function getListElementByteLength(elementSize: ListElementSize): number {
  switch (elementSize) {
    /* istanbul ignore next */
    case ListElementSize.BIT: {
      return Number.NaN;
    }

    case ListElementSize.BYTE: {
      return 1;
    }

    case ListElementSize.BYTE_2: {
      return 2;
    }

    case ListElementSize.BYTE_4: {
      return 4;
    }

    case ListElementSize.BYTE_8:
    case ListElementSize.POINTER: {
      return 8;
    }

    /* istanbul ignore next */
    case ListElementSize.COMPOSITE: {
      // Caller has to figure it out based on the tag word.

      return Number.NaN;
    }

    /* istanbul ignore next */
    case ListElementSize.VOID: {
      return 0;
    }

    /* istanbul ignore next */
    default: {
      throw new Error(format(PTR_INVALID_LIST_SIZE, elementSize));
    }
  }
}

/**
 * Add an offset to the pointer's offset and return a new Pointer for that address.
 *
 * @param offset The number of bytes to add to the offset.
 * @param p The pointer to add from.
 * @returns A new pointer to the address.
 */

export function add(offset: number, p: Pointer): Pointer {
  return new Pointer(p.segment, p.byteOffset + offset, p._capnp.depthLimit);
}

/**
 * Replace a pointer with a deep copy of the pointer at `src` and all of its contents.
 *
 * @param src The pointer to copy.
 * @param p The pointer to copy into.
 */

export function copyFrom(src: Pointer, p: Pointer): void {
  // If the pointer is the same then this is a noop.

  if (p.segment === src.segment && p.byteOffset === src.byteOffset) {
    return;
  }

  // Make sure we erase this pointer's contents before moving on. If src is null, that's all we do.

  erase(p); // noop if null

  if (isNull(src)) return;

  switch (getTargetPointerType(src)) {
    case PointerType.STRUCT: {
      copyFromStruct(src, p);

      break;
    }

    case PointerType.LIST: {
      copyFromList(src, p);

      break;
    }

    case PointerType.OTHER: {
      copyFromInterface(src, p);
      break;
    }

    /* istanbul ignore next */
    default: {
      throw new Error(
        format(PTR_INVALID_POINTER_TYPE, getTargetPointerType(p)),
      );
    }
  }
}

/**
 * Recursively erase a pointer, any far pointers/landing pads/tag words, and the content it points to.
 *
 * Note that this will leave "holes" of zeroes in the message, since the space cannot be reclaimed. With packing this
 * will have a negligible effect on the final message size.
 *
 * FIXME: This may need protection against infinite recursion...
 *
 * @param p The pointer to erase.
 */

export function erase(p: Pointer): void {
  if (isNull(p)) return;

  // First deal with the contents.

  let c: Pointer;

  switch (getTargetPointerType(p)) {
    case PointerType.STRUCT: {
      const size = getTargetStructSize(p);
      c = getContent(p);

      // Wipe the data section.

      c.segment.fillZeroWords(c.byteOffset, size.dataByteLength / 8);

      // Iterate over all the pointers and nuke them.

      for (let i = 0; i < size.pointerLength; i++) {
        erase(add(i * 8, c));
      }

      break;
    }
    case PointerType.LIST: {
      const elementSize = getTargetListElementSize(p);
      const length = getTargetListLength(p);
      let contentWords = padToWord(
        length * getListElementByteLength(elementSize),
      );
      c = getContent(p);

      if (elementSize === ListElementSize.POINTER) {
        for (let i = 0; i < length; i++) {
          erase(
            new Pointer(
              c.segment,
              c.byteOffset + i * 8,
              p._capnp.depthLimit - 1,
            ),
          );
        }

        // Calling erase on each pointer takes care of the content, nothing left to do here.

        break;
      } else if (elementSize === ListElementSize.COMPOSITE) {
        // Read some stuff from the tag word.
        const tag = add(-8, c);
        const compositeSize = getStructSize(tag);
        const compositeByteLength = getByteLength(compositeSize);
        contentWords = getOffsetWords(tag);

        // Kill the tag word.
        c.segment.setWordZero(c.byteOffset - 8);

        // Recursively erase each pointer.
        for (let i = 0; i < length; i++) {
          for (let j = 0; j < compositeSize.pointerLength; j++) {
            erase(
              new Pointer(
                c.segment,
                c.byteOffset + i * compositeByteLength + j * 8,
                p._capnp.depthLimit - 1,
              ),
            );
          }
        }
      }

      c.segment.fillZeroWords(c.byteOffset, contentWords);

      break;
    }
    case PointerType.OTHER: {
      // No content.

      break;
    }

    default: {
      throw new Error(
        format(PTR_INVALID_POINTER_TYPE, getTargetPointerType(p)),
      );
    }
  }

  erasePointer(p);
}

/**
 * Set the pointer (and far pointer landing pads, if applicable) to zero. Does not touch the pointer's content.
 *
 * @param p The pointer to erase.
 */

export function erasePointer(p: Pointer): void {
  if (getPointerType(p) === PointerType.FAR) {
    const landingPad = followFar(p);

    if (isDoubleFar(p)) {
      // Kill the double-far tag word.

      landingPad.segment.setWordZero(landingPad.byteOffset + 8);
    }

    // Kill the landing pad.

    landingPad.segment.setWordZero(landingPad.byteOffset);
  }

  // Finally! Kill the pointer itself...

  p.segment.setWordZero(p.byteOffset);
}

/**
 * Interpret the pointer as a far pointer, returning its target segment and offset.
 *
 * @param p The pointer to read from.
 * @returns A pointer to the far target.
 */

export function followFar(p: Pointer): Pointer {
  const targetSegment = p.segment.message.getSegment(
    p.segment.getUint32(p.byteOffset + 4),
  );
  const targetWordOffset = p.segment.getUint32(p.byteOffset) >>> 3;

  return new Pointer(
    targetSegment,
    targetWordOffset * 8,
    p._capnp.depthLimit - 1,
  );
}

/**
 * If the pointer address references a far pointer, follow it to the location where the actual pointer data is written.
 * Otherwise, returns the pointer unmodified.
 *
 * @param p The pointer to read from.
 * @returns A new pointer representing the target location, or `p` if it is not a far pointer.
 */
export function followFars(p: Pointer): Pointer {
  if (getPointerType(p) === PointerType.FAR) {
    const landingPad = followFar(p);

    if (isDoubleFar(p)) {
      landingPad.byteOffset += 8;
    }

    return landingPad;
  }

  return p;
}

export function getCapabilityId(p: Pointer): number {
  return p.segment.getUint32(p.byteOffset + 4);
}

function isCompositeList(p: Pointer): boolean {
  return (
    getTargetPointerType(p) === PointerType.LIST &&
    getTargetListElementSize(p) === ListElementSize.COMPOSITE
  );
}

/**
 * Obtain the location of the pointer's content, following far pointers as needed.
 * If the pointer is a struct pointer and `compositeIndex` is set, it will be offset by a multiple of the struct's size.
 *
 * @param p The pointer to read from.
 * @param ignoreCompositeIndex If true, will not follow the composite struct pointer's composite index and
 * instead return a pointer to the parent list's contents (also the beginning of the first struct).
 * @returns A pointer to the beginning of the pointer's content.
 */
export function getContent(
  p: Pointer,
  ignoreCompositeIndex?: boolean,
): Pointer {
  let c: Pointer;

  if (isDoubleFar(p)) {
    const landingPad = followFar(p);
    c = new Pointer(
      p.segment.message.getSegment(getFarSegmentId(landingPad)),
      getOffsetWords(landingPad) * 8,
    );
  } else {
    const target = followFars(p);
    c = new Pointer(
      target.segment,
      target.byteOffset + 8 + getOffsetWords(target) * 8,
    );
  }

  if (isCompositeList(p)) {
    c.byteOffset += 8;
  }

  if (!ignoreCompositeIndex && p._capnp.compositeIndex !== undefined) {
    // Seek backwards by one word so we can read the struct size off the tag word.

    c.byteOffset -= 8;

    // Seek ahead by `compositeIndex` multiples of the struct's total size.

    c.byteOffset +=
      8 +
      p._capnp.compositeIndex *
        getByteLength(padObjectToWord(getStructSize(c)));
  }

  return c;
}

/**
 * Read the target segment ID from a far pointer.
 *
 * @param p The pointer to read from.
 * @returns The target segment ID.
 */
export function getFarSegmentId(p: Pointer): number {
  return p.segment.getUint32(p.byteOffset + 4);
}

/**
 * Get a number indicating the size of the list's elements.
 *
 * @param p The pointer to read from.
 * @returns The size of the list's elements.
 */
export function getListElementSize(p: Pointer): ListElementSize {
  return p.segment.getUint32(p.byteOffset + 4) & LIST_SIZE_MASK;
}

/**
 * Get the number of elements in a list pointer. For composite lists, it instead represents the total number of words in
 * the list (not counting the tag word).
 *
 * This method does **not** attempt to distinguish between composite and non-composite lists. To get the correct
 * length for composite lists use `getTargetListLength()` instead.
 *
 * @param p The pointer to read from.
 * @returns The length of the list, or total number of words for composite lists.
 */
export function getListLength(p: Pointer): number {
  return p.segment.getUint32(p.byteOffset + 4) >>> 3;
}

/**
 * Get the offset (in words) from the end of a pointer to the start of its content. For struct pointers, this is the
 * beginning of the data section, and for list pointers it is the location of the first element. The value should
 * always be zero for interface pointers.
 *
 * @param p The pointer to read from.
 * @returns The offset, in words, from the end of the pointer to the start of the data section.
 */
export function getOffsetWords(p: Pointer): number {
  const o = p.segment.getInt32(p.byteOffset);

  // Far pointers only have 29 offset bits.
  return o & 2 ? o >> 3 : o >> 2;
}

/**
 * Look up the pointer's type.
 *
 * @param p The pointer to read from.
 * @returns The type of pointer.
 */
export function getPointerType(p: Pointer): PointerType {
  return p.segment.getUint32(p.byteOffset) & POINTER_TYPE_MASK;
}

/**
 * Read the number of data words from this struct pointer.
 *
 * @param p The pointer to read from.
 * @returns The number of data words in the struct.
 */
export function getStructDataWords(p: Pointer): number {
  return p.segment.getUint16(p.byteOffset + 4);
}

/**
 * Read the number of pointers contained in this struct pointer.
 *
 * @param p The pointer to read from.
 * @returns The number of pointers in this struct.
 */
export function getStructPointerLength(p: Pointer): number {
  return p.segment.getUint16(p.byteOffset + 6);
}

/**
 * Get an object describing this struct pointer's size.
 *
 * @param p The pointer to read from.
 * @returns The size of the struct.
 */
export function getStructSize(p: Pointer): ObjectSize {
  return new ObjectSize(getStructDataWords(p) * 8, getStructPointerLength(p));
}

/**
 * Get a pointer to this pointer's composite list tag word, following far pointers as needed.
 *
 * @param p The pointer to read from.
 * @returns A pointer to the list's composite tag word.
 */
export function getTargetCompositeListTag(p: Pointer): Pointer {
  const c = getContent(p);

  // The composite list tag is always one word before the content.

  c.byteOffset -= 8;

  return c;
}

/**
 * Get the object size for the target composite list, following far pointers as needed.
 *
 * @param p The pointer to read from.
 * @returns An object describing the size of each struct in the list.
 */
export function getTargetCompositeListSize(p: Pointer): ObjectSize {
  return getStructSize(getTargetCompositeListTag(p));
}

/**
 * Get the size of the list elements referenced by this pointer, following far pointers if necessary.
 *
 * @param p The pointer to read from.
 * @returns The size of the elements in the list.
 */
export function getTargetListElementSize(p: Pointer): ListElementSize {
  return getListElementSize(followFars(p));
}

/**
 * Get the length of the list referenced by this pointer, following far pointers if necessary. If the list is a
 * composite list, it will look up the tag word and read the length from there.
 *
 * @param p The pointer to read from.
 * @returns The number of elements in the list.
 */
export function getTargetListLength(p: Pointer): number {
  const t = followFars(p);

  if (getListElementSize(t) === ListElementSize.COMPOSITE) {
    // The content is prefixed by a tag word; it's a struct pointer whose offset contains the list's length.

    return getOffsetWords(getTargetCompositeListTag(p));
  }

  return getListLength(t);
}

/**
 * Get the type of a pointer, following far pointers if necessary. For non-far pointers this is equivalent to calling
 * `getPointerType()`.
 *
 * The target of a far pointer can never be another far pointer, and this method will throw if such a situation is
 * encountered.
 *
 * @param p The pointer to read from.
 * @returns The type of pointer referenced by this pointer.
 */
export function getTargetPointerType(p: Pointer): PointerType {
  const t = getPointerType(followFars(p));

  if (t === PointerType.FAR) throw new Error(format(PTR_INVALID_FAR_TARGET, p));

  return t;
}

/**
 * Get the size of the struct referenced by a pointer, following far pointers if necessary.
 *
 * @param p The pointer to read from.
 * @returns The size of the struct referenced by this pointer.
 */
export function getTargetStructSize(p: Pointer): ObjectSize {
  return getStructSize(followFars(p));
}

/**
 * Initialize a pointer to point at the data in the content segment. If the content segment is not the same as the
 * pointer's segment, this will allocate and write far pointers as needed. Nothing is written otherwise.
 *
 * The return value includes a pointer to write the pointer's actual data to (the eventual far target), and the offset
 * value (in words) to use for that pointer. In the case of double-far pointers this offset will always be zero.
 *
 * @param contentSegment The segment containing this pointer's content.
 * @param contentOffset The offset within the content segment for the beginning of this pointer's content.
 * @param p The pointer to initialize.
 * @returns An object containing a pointer (where the pointer data should be written), and
 * the value to use as the offset for that pointer.
 */
export function initPointer(
  contentSegment: Segment,
  contentOffset: number,
  p: Pointer,
): PointerAllocationResult {
  if (p.segment !== contentSegment) {
    // Need a far pointer.

    if (!contentSegment.hasCapacity(8)) {
      // GAH! Not enough space in the content segment for a landing pad so we need a double far pointer.

      const landingPad = p.segment.allocate(16);

      setFarPointer(true, landingPad.byteOffset / 8, landingPad.segment.id, p);
      setFarPointer(false, contentOffset / 8, contentSegment.id, landingPad);

      landingPad.byteOffset += 8;

      return new PointerAllocationResult(landingPad, 0);
    }

    // Allocate a far pointer landing pad in the target segment.

    const landingPad = contentSegment.allocate(8);

    if (landingPad.segment.id !== contentSegment.id) {
      throw new Error(INVARIANT_UNREACHABLE_CODE);
    }

    setFarPointer(false, landingPad.byteOffset / 8, landingPad.segment.id, p);

    return new PointerAllocationResult(
      landingPad,
      (contentOffset - landingPad.byteOffset - 8) / 8,
    );
  }

  return new PointerAllocationResult(p, (contentOffset - p.byteOffset - 8) / 8);
}

/**
 * Check if the pointer is a double-far pointer.
 *
 * @param p The pointer to read from.
 * @returns `true` if it is a double-far pointer, `false` otherwise.
 */
export function isDoubleFar(p: Pointer): boolean {
  return (
    getPointerType(p) === PointerType.FAR &&
    (p.segment.getUint32(p.byteOffset) & POINTER_DOUBLE_FAR_MASK) !== 0
  );
}

/**
 * Quickly check to see if the pointer is "null". A "null" pointer is a zero word, equivalent to an empty struct
 * pointer.
 *
 * @param p The pointer to read from.
 * @returns `true` if the pointer is "null".
 */
export function isNull(p: Pointer): boolean {
  return p.segment.isWordZero(p.byteOffset);
}

/**
 * Relocate a pointer to the given destination, ensuring that it points to the same content. This will create far
 * pointers as needed if the content is in a different segment than the destination. After the relocation the source
 * pointer will be erased and is no longer valid.
 *
 * @param dst The desired location for the `src` pointer. Any existing contents will be erased before
 * relocating!
 * @param src The pointer to relocate.
 */
export function relocateTo(dst: Pointer, src: Pointer): void {
  const t = followFars(src);
  const lo = t.segment.getUint8(t.byteOffset) & 0x03; // discard the offset
  const hi = t.segment.getUint32(t.byteOffset + 4);

  // Make sure anything dst was pointing to is wiped out.
  erase(dst);

  const res = initPointer(
    t.segment,
    t.byteOffset + 8 + getOffsetWords(t) * 8,
    dst,
  );

  // Keep the low 2 bits and write the new offset.
  res.pointer.segment.setUint32(
    res.pointer.byteOffset,
    lo | (res.offsetWords << 2),
  );
  // Keep the high 32 bits intact.
  res.pointer.segment.setUint32(res.pointer.byteOffset + 4, hi);

  erasePointer(src);
}

/**
 * Write a far pointer.
 *
 * @param doubleFar Set to `true` if this is a double far pointer.
 * @param offsetWords The offset, in words, to the target pointer.
 * @param segmentId The segment the target pointer is located in.
 * @param p The pointer to write to.
 */
export function setFarPointer(
  doubleFar: boolean,
  offsetWords: number,
  segmentId: number,
  p: Pointer,
): void {
  const A = PointerType.FAR;
  const B = doubleFar ? 1 : 0;
  const C = offsetWords;
  const D = segmentId;

  p.segment.setUint32(p.byteOffset, A | (B << 2) | (C << 3));
  p.segment.setUint32(p.byteOffset + 4, D);
}

/**
 * Write a raw interface pointer.
 *
 * @param capId The capability ID.
 * @param p The pointer to write to.
 */
export function setInterfacePointer(capId: number, p: Pointer): void {
  p.segment.setUint32(p.byteOffset, PointerType.OTHER);
  p.segment.setUint32(p.byteOffset + 4, capId);
}

/**
 * Reads a raw interface pointer
 *
 * @param p The pointer to read.
 * @returns The capability ID.
 */
export function getInterfacePointer(p: Pointer): number {
  return p.segment.getUint32(p.byteOffset + 4);
}

/**
 * Write a raw list pointer.
 *
 * @param offsetWords The number of words from the end of this pointer to the beginning of the list content.
 * @param size The size of each element in the list.
 * @param length The number of elements in the list.
 * @param p The pointer to write to.
 * @param compositeSize For composite lists this describes the size of each element in this list. This
 * is required for composite lists.
 */
export function setListPointer(
  offsetWords: number,
  size: ListElementSize,
  length: number,
  p: Pointer,
  compositeSize?: ObjectSize,
): void {
  const A = PointerType.LIST;
  const B = offsetWords;
  const C = size;
  let D = length;

  if (size === ListElementSize.COMPOSITE) {
    if (compositeSize === undefined) {
      throw new TypeError(TYPE_COMPOSITE_SIZE_UNDEFINED);
    }

    D *= getWordLength(compositeSize);
  }

  p.segment.setUint32(p.byteOffset, A | (B << 2));
  p.segment.setUint32(p.byteOffset + 4, C | (D << 3));
}

/**
 * Write a raw struct pointer.
 *
 * @param offsetWords The number of words from the end of this pointer to the beginning of the struct's data
 * section.
 * @param size An object describing the size of the struct.
 * @param p The pointer to write to.
 */
export function setStructPointer(
  offsetWords: number,
  size: ObjectSize,
  p: Pointer,
): void {
  const A = PointerType.STRUCT;
  const B = offsetWords;
  const C = getDataWordLength(size);
  const D = size.pointerLength;

  p.segment.setUint32(p.byteOffset, A | (B << 2));
  p.segment.setUint16(p.byteOffset + 4, C);
  p.segment.setUint16(p.byteOffset + 6, D);
}

/**
 * Read some bits off a pointer to make sure it has the right pointer data.
 *
 * @param pointerType The expected pointer type.
 * @param p The pointer to validate.
 * @param elementSize For list pointers, the expected element size. Leave this
 * undefined for struct pointers.
 */
export function validate(
  pointerType: PointerType,
  p: Pointer,
  elementSize?: ListElementSize,
): void {
  if (isNull(p)) {
    return;
  }

  const t = followFars(p);

  // Check the pointer type.

  const A = t.segment.getUint32(t.byteOffset) & POINTER_TYPE_MASK;

  if (A !== pointerType) {
    throw new Error(format(PTR_WRONG_POINTER_TYPE, p, pointerType));
  }

  // Check the list element size, if provided.

  if (elementSize !== undefined) {
    const C = t.segment.getUint32(t.byteOffset + 4) & LIST_SIZE_MASK;

    if (C !== elementSize) {
      throw new Error(
        format(PTR_WRONG_LIST_TYPE, p, ListElementSize[elementSize]),
      );
    }
  }
}

export function copyFromInterface(src: Pointer, dst: Pointer): void {
  const srcCapId = getInterfacePointer(src);
  if (srcCapId < 0) {
    // trace("copyFromInterface: src has no capId");
    return;
  }

  const srcCapTable = src.segment.message._capnp.capTable;
  if (!srcCapTable) {
    // trace("copyFromInterface: src pointer's message has no cap table");
    return;
  }

  const client = srcCapTable[srcCapId];
  if (!client) {
    // trace("copyFromInterface: src capId is not mapped to a client");
    return;
  }

  const dstCapId = dst.segment.message.addCap(client);
  // trace("copyFromInterface: src capId %d => dst capId %d", srcCapId, dstCapId);
  setInterfacePointer(dstCapId, dst);
}

export function copyFromList(src: Pointer, dst: Pointer): void {
  if (dst._capnp.depthLimit <= 0) {
    throw new Error(PTR_DEPTH_LIMIT_EXCEEDED);
  }

  const srcContent = getContent(src);
  const srcElementSize = getTargetListElementSize(src);
  const srcLength = getTargetListLength(src);
  let srcCompositeSize;
  let srcStructByteLength;
  let dstContent;

  if (srcElementSize === ListElementSize.POINTER) {
    dstContent = dst.segment.allocate(srcLength << 3);

    // Recursively copy each pointer in the list.
    for (let i = 0; i < srcLength; i++) {
      const srcPtr = new Pointer(
        srcContent.segment,
        srcContent.byteOffset + (i << 3),
        src._capnp.depthLimit - 1,
      );
      const dstPtr = new Pointer(
        dstContent.segment,
        dstContent.byteOffset + (i << 3),
        dst._capnp.depthLimit - 1,
      );

      copyFrom(srcPtr, dstPtr);
    }
  } else if (srcElementSize === ListElementSize.COMPOSITE) {
    srcCompositeSize = padObjectToWord(getTargetCompositeListSize(src));
    srcStructByteLength = getByteLength(srcCompositeSize);

    dstContent = dst.segment.allocate(
      getByteLength(srcCompositeSize) * srcLength + 8,
    );

    // Copy the tag word.

    dstContent.segment.copyWord(
      dstContent.byteOffset,
      srcContent.segment,
      srcContent.byteOffset - 8,
    );

    // Copy the entire contents, including all pointers. This should be more efficient than making `srcLength`
    // copies to skip the pointer sections, and we're about to rewrite all those pointers anyway.

    // PERF: Skip this step if the composite struct only contains pointers.
    if (srcCompositeSize.dataByteLength > 0) {
      const wordLength = getWordLength(srcCompositeSize) * srcLength;

      dstContent.segment.copyWords(
        dstContent.byteOffset + 8,
        srcContent.segment,
        srcContent.byteOffset,
        wordLength,
      );
    }

    // Recursively copy all the pointers in each struct.
    for (let i = 0; i < srcLength; i++) {
      for (let j = 0; j < srcCompositeSize.pointerLength; j++) {
        const offset =
          i * srcStructByteLength + srcCompositeSize.dataByteLength + (j << 3);

        const srcPtr = new Pointer(
          srcContent.segment,
          srcContent.byteOffset + offset,
          src._capnp.depthLimit - 1,
        );
        const dstPtr = new Pointer(
          dstContent.segment,
          dstContent.byteOffset + offset + 8,
          dst._capnp.depthLimit - 1,
        );

        copyFrom(srcPtr, dstPtr);
      }
    }
  } else {
    const byteLength = padToWord(
      srcElementSize === ListElementSize.BIT
        ? (srcLength + 7) >>> 3
        : getListElementByteLength(srcElementSize) * srcLength,
    );
    const wordLength = byteLength >>> 3;

    dstContent = dst.segment.allocate(byteLength);

    // Copy all of the list contents word-by-word.
    dstContent.segment.copyWords(
      dstContent.byteOffset,
      srcContent.segment,
      srcContent.byteOffset,
      wordLength,
    );
  }

  // Initialize the list pointer.
  const res = initPointer(dstContent.segment, dstContent.byteOffset, dst);
  setListPointer(
    res.offsetWords,
    srcElementSize,
    srcLength,
    res.pointer,
    srcCompositeSize,
  );
}

export function copyFromStruct(src: Pointer, dst: Pointer): void {
  if (dst._capnp.depthLimit <= 0) {
    throw new Error(PTR_DEPTH_LIMIT_EXCEEDED);
  }

  const srcContent = getContent(src);
  const srcSize = getTargetStructSize(src);
  const srcDataWordLength = getDataWordLength(srcSize);

  // Allocate space for the destination content.
  const dstContent = dst.segment.allocate(getByteLength(srcSize));

  // Copy the data section.
  dstContent.segment.copyWords(
    dstContent.byteOffset,
    srcContent.segment,
    srcContent.byteOffset,
    srcDataWordLength,
  );

  // Copy the pointer section.
  for (let i = 0; i < srcSize.pointerLength; i++) {
    const offset = srcSize.dataByteLength + i * 8;

    const srcPtr = new Pointer(
      srcContent.segment,
      srcContent.byteOffset + offset,
      src._capnp.depthLimit - 1,
    );
    const dstPtr = new Pointer(
      dstContent.segment,
      dstContent.byteOffset + offset,
      dst._capnp.depthLimit - 1,
    );

    copyFrom(srcPtr, dstPtr);
  }

  // Don't touch dst if it's already initialized as a composite list pointer. With composite struct pointers there's
  // no pointer to copy here and we've already copied the contents.
  if (dst._capnp.compositeList) {
    return;
  }

  // Initialize the struct pointer.
  const res = initPointer(dstContent.segment, dstContent.byteOffset, dst);
  setStructPointer(res.offsetWords, srcSize, res.pointer);
}

/**
 * Track the allocation of a new Pointer object.
 *
 * This will decrement an internal counter tracking how many bytes have been traversed in the message so far. After
 * a certain limit, this method will throw an error in order to prevent a certain class of DoS attacks.
 *
 * @param message The message the pointer belongs to.
 * @param p The pointer being allocated.
 */

export function trackPointerAllocation(message: Message, p: Pointer): void {
  message._capnp.traversalLimit -= 8;

  if (message._capnp.traversalLimit <= 0) {
    throw new Error(format(PTR_TRAVERSAL_LIMIT_EXCEEDED, p));
  }
}

/**
 * This is used as the return value for `Pointer.prototype.initPointer`. Turns out using a class in V8 for multiple
 * return values is faster than using an array or anonymous object.
 *
 * http://jsben.ch/#/zTdbD
 */
export class PointerAllocationResult {
  constructor(
    public readonly pointer: Pointer,
    public readonly offsetWords: number,
  ) {}
}
