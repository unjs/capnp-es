// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { PACK_SPAN_THRESHOLD } from "../constants";
import { MSG_PACK_NOT_WORD_ALIGNED } from "../errors";

/**
 * When packing a message there are two tags that are interpreted in a special way: `0x00` and `0xff`.
 *
 * @enum {number}
 */

const enum PackedTag {
  /**
   * The tag is followed by a single byte which indicates a count of consecutive zero-valued words, minus 1. E.g. if the
   * tag 0x00 is followed by 0x05, the sequence unpacks to 6 words of zero.
   *
   * Or, put another way: the tag is first decoded as if it were not special. Since none of the bits are set, it is
   * followed by no bytes and expands to a word full of zeros. After that, the next byte is interpreted as a count of
   * additional words that are also all-zero.
   */
  ZERO = 0x00,

  /**
   * The tag is followed by the bytes of the word (as if it weren’t special), but after those bytes is another byte with
   * value N. Following that byte is N unpacked words that should be copied directly.
   *
   * These unpacked words may contain zeroes; in this implementation PACK_SPAN_THRESHOLD (or more) zero bytes within a
   * single word of a span terminates that span.
   *
   * The purpose of this rule is to minimize the impact of packing on data that doesn’t contain any zeros – in
   * particular, long text blobs. Because of this rule, the worst-case space overhead of packing is 2 bytes per 2 KiB of
   * input (256 words = 2KiB).
   */
  SPAN = 0xff,

  /**
   * A randomly chosen non-ZERO, non-SPAN tag that proves useful in state initiation.
   *
   */
  NONZERO_NONSPAN = 0x77,
}

/**
 * Compute the Hamming weight (number of bits set to 1) of a number. Used to figure out how many bytes follow a tag byte
 * while computing the size of a packed message.
 *
 * WARNING: Using this with floating point numbers will void your warranty.
 *
 * @param x A real integer.
 * @returns The hamming weight (integer).
 */
export function getHammingWeight(x: number): number {
  // Thanks, HACKMEM!

  let w = x - ((x >> 1) & 0x55_55_55_55);
  w = (w & 0x33_33_33_33) + ((w >> 2) & 0x33_33_33_33);
  return (((w + (w >> 4)) & 0x0f_0f_0f_0f) * 0x01_01_01_01) >> 24;
}

export type byte = number;

/**
 * Compute the tag byte from the 8 bytes of a 64-bit word.
 *
 * @param a The first byte.
 * @param b The second byte.
 * @param c The third byte.
 * @param d The fourth byte.
 * @param e The fifth byte.
 * @param f The sixth byte.
 * @param g The seventh byte.
 * @param h The eighth byte (phew!).
 * @returns The tag byte.
 */
export function getTagByte(
  a: byte,
  b: byte,
  c: byte,
  d: byte,
  e: byte,
  f: byte,
  g: byte,
  h: byte,
): number {
  // Yes, it's pretty. Don't touch it.

  return (
    (a === 0 ? 0 : 0b0000_0001) |
    (b === 0 ? 0 : 0b0000_0010) |
    (c === 0 ? 0 : 0b0000_0100) |
    (d === 0 ? 0 : 0b0000_1000) |
    (e === 0 ? 0 : 0b0001_0000) |
    (f === 0 ? 0 : 0b0010_0000) |
    (g === 0 ? 0 : 0b0100_0000) |
    (h === 0 ? 0 : 0b1000_0000)
  );
}

/**
 * Efficiently calculate the length of a packed Cap'n Proto message.
 *
 *
 * @param packed The packed message.
 * @returns The length of the unpacked message in bytes.
 */

export function getUnpackedByteLength(packed: ArrayBuffer): number {
  const p = new Uint8Array(packed);
  let wordCount = 0;
  let lastTag = PackedTag.NONZERO_NONSPAN;

  for (let i = 0; i < p.byteLength; ) {
    const tag = p[i];

    if (lastTag === PackedTag.ZERO) {
      wordCount += tag;

      i++;

      lastTag = PackedTag.NONZERO_NONSPAN;
    } else if (lastTag === PackedTag.SPAN) {
      wordCount += tag;

      i += tag * 8 + 1;

      lastTag = PackedTag.NONZERO_NONSPAN;
    } else {
      wordCount++;

      i += getHammingWeight(tag) + 1;

      lastTag = tag;
    }
  }

  return wordCount * 8;
}

/**
 * Compute the number of zero bytes that occur in a given 64-bit word, provided as eight separate bytes.
 *
 * @param a The first byte.
 * @param b The second byte.
 * @param c The third byte.
 * @param d The fourth byte.
 * @param e The fifth byte.
 * @param f The sixth byte.
 * @param g The seventh byte.
 * @param h The eighth byte (phew!).
 * @returns The number of these bytes that are zero.
 */

export function getZeroByteCount(
  a: byte,
  b: byte,
  c: byte,
  d: byte,
  e: byte,
  f: byte,
  g: byte,
  h: byte,
): number {
  return (
    (a === 0 ? 1 : 0) +
    (b === 0 ? 1 : 0) +
    (c === 0 ? 1 : 0) +
    (d === 0 ? 1 : 0) +
    (e === 0 ? 1 : 0) +
    (f === 0 ? 1 : 0) +
    (g === 0 ? 1 : 0) +
    (h === 0 ? 1 : 0)
  );
}

/**
 * Pack a section of a Cap'n Proto message into a compressed format. This will efficiently compress zero bytes (which
 * are common in idiomatic Cap'n Proto messages) into a compact form.
 *
 * For stream-framed messages this is called once for the frame header and once again for each segment in the message.
 *
 * The returned array buffer is trimmed to the exact size of the packed message with a single copy operation at the end.
 * This should be decent on CPU time but does require quite a lot of memory (a normal array is filled up with each
 * packed byte until the packing is complete).
 *
 * @param unpacked The message to pack.
 * @param byteOffset Starting byte offset to read bytes from, defaults to 0.
 * @param byteLength Total number of bytes to read, defaults to the remainder of the buffer contents.
 * @returns A packed version of the message.
 */

export function pack(
  unpacked: ArrayBuffer,
  byteOffset = 0,
  byteLength?: number,
): ArrayBuffer {
  if (unpacked.byteLength % 8 !== 0) {
    throw new Error(MSG_PACK_NOT_WORD_ALIGNED);
  }

  const src = new Uint8Array(unpacked, byteOffset, byteLength);

  // TODO: Maybe we should do this with buffers? This costs more than 8x the final compressed size in temporary RAM.

  const dst: number[] = [];

  let lastTag = PackedTag.NONZERO_NONSPAN;

  /** This is where we need to remember to write the SPAN tag (0xff). */

  let spanWordCountOffset = 0;

  /** How many words have been copied during the current range. */

  let rangeWordCount = 0;

  for (
    let srcByteOffset = 0;
    srcByteOffset < src.byteLength;
    srcByteOffset += 8
  ) {
    /** Read in the entire word. Yes, this feels silly but it's fast! */

    const a = src[srcByteOffset];
    const b = src[srcByteOffset + 1];
    const c = src[srcByteOffset + 2];
    const d = src[srcByteOffset + 3];
    const e = src[srcByteOffset + 4];
    const f = src[srcByteOffset + 5];
    const g = src[srcByteOffset + 6];
    const h = src[srcByteOffset + 7];

    const tag = getTagByte(a, b, c, d, e, f, g, h);

    /** If this is true we'll skip the normal word write logic after the switch statement. */

    let skipWriteWord = true;

    switch (lastTag) {
      case PackedTag.ZERO: {
        // We're writing a range of words with all zeroes in them. See if we need to bail out of the fast path.

        if (tag !== PackedTag.ZERO || rangeWordCount >= 0xff) {
          // There's a bit in there or we got too many zeroes. Damn, we need to bail.

          dst.push(rangeWordCount);
          rangeWordCount = 0;

          skipWriteWord = false;
        } else {
          // Kay, let's quickly inc this and go.

          rangeWordCount++;
        }

        break;
      }

      case PackedTag.SPAN: {
        // We're writing a span of nonzero words.

        const zeroCount = getZeroByteCount(a, b, c, d, e, f, g, h);

        // See if we need to bail now.

        if (zeroCount >= PACK_SPAN_THRESHOLD || rangeWordCount >= 0xff) {
          // Alright, time to get packing again. Write the number of words we skipped to the beginning of the span.

          dst[spanWordCountOffset] = rangeWordCount;
          rangeWordCount = 0;

          // We have to write this word normally.

          skipWriteWord = false;
        } else {
          // Just write this word verbatim.

          dst.push(a, b, c, d, e, f, g, h);

          rangeWordCount++;
        }

        break;
      }
      default: {
        // Didn't get a special tag last time, let's write this as normal.

        skipWriteWord = false;

        break;
      }
    }

    // A goto is fast, idk why people keep hatin'.
    if (skipWriteWord) {
      continue;
    }

    dst.push(tag);
    lastTag = tag;

    if (a !== 0) dst.push(a);
    if (b !== 0) dst.push(b);
    if (c !== 0) dst.push(c);
    if (d !== 0) dst.push(d);
    if (e !== 0) dst.push(e);
    if (f !== 0) dst.push(f);
    if (g !== 0) dst.push(g);
    if (h !== 0) dst.push(h);

    // Record the span tag offset if needed, making sure to actually leave room for it.

    if (tag === PackedTag.SPAN) {
      spanWordCountOffset = dst.length;

      dst.push(0);
    }
  }

  // We're done. If we were writing a range let's finish it.

  if (lastTag === PackedTag.ZERO) {
    dst.push(rangeWordCount);
  } else if (lastTag === PackedTag.SPAN) {
    dst[spanWordCountOffset] = rangeWordCount;
  }

  return new Uint8Array(dst).buffer;
}

/**
 * Unpack a compressed Cap'n Proto message into a new ArrayBuffer.
 *
 * Unlike the `pack` function, this is able to efficiently determine the exact size needed for the output buffer and
 * runs considerably more efficiently.
 *
 * @param packed An array buffer containing the packed message.
 * @returns The unpacked message.
 */

export function unpack(packed: ArrayBuffer): ArrayBuffer {
  // We have no choice but to read the packed buffer one byte at a time.

  const src = new Uint8Array(packed);
  const dst = new Uint8Array(new ArrayBuffer(getUnpackedByteLength(packed)));

  /** The last tag byte that we've seen - it starts at a "neutral" value. */

  let lastTag = PackedTag.NONZERO_NONSPAN;

  for (
    let srcByteOffset = 0, dstByteOffset = 0;
    srcByteOffset < src.byteLength;
  ) {
    const tag = src[srcByteOffset];

    if (lastTag === PackedTag.ZERO) {
      // We have a span of zeroes. New array buffers are guaranteed to be initialized to zero so we just seek ahead.

      dstByteOffset += tag * 8;

      srcByteOffset++;

      lastTag = PackedTag.NONZERO_NONSPAN;
    } else if (lastTag === PackedTag.SPAN) {
      // We have a span of unpacked bytes. Copy them verbatim from the source buffer.

      const spanByteLength = tag * 8;

      dst.set(
        src.subarray(srcByteOffset + 1, srcByteOffset + 1 + spanByteLength),
        dstByteOffset,
      );

      dstByteOffset += spanByteLength;
      srcByteOffset += 1 + spanByteLength;

      lastTag = PackedTag.NONZERO_NONSPAN;
    } else {
      // Okay, a normal tag. Let's read past the tag and copy bytes that have a bit set in the tag.

      srcByteOffset++;

      for (let i = 1; i <= 0b1000_0000; i <<= 1) {
        // We only need to actually touch `dst` if there's a nonzero byte (it's already initialized to zeroes).

        if ((tag & i) !== 0) {
          dst[dstByteOffset] = src[srcByteOffset++];
        }

        dstByteOffset++;
      }

      lastTag = tag;
    }
  }

  return dst.buffer;
}
