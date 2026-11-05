// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import {
  DEFAULT_BUFFER_SIZE,
  MIN_SINGLE_SEGMENT_GROWTH,
} from "../../constants";
import { SEG_GET_NON_ZERO_SINGLE, SEG_NOT_WORD_ALIGNED } from "../../errors";
import { format, padToWord } from "../../util";
import { Segment } from "../segment";
import { ArenaAllocationResult } from "./arena-allocation-result";
import { ArenaKind } from "./arena-kind";

export class SingleSegmentArena {
  static readonly allocate = allocate;
  static readonly getBuffer = getBuffer;
  static readonly getNumSegments = getNumSegments;

  buffer: ArrayBuffer;
  readonly kind = ArenaKind.SINGLE_SEGMENT;

  constructor(buffer = new ArrayBuffer(DEFAULT_BUFFER_SIZE)) {
    if ((buffer.byteLength & 7) !== 0) {
      throw new Error(format(SEG_NOT_WORD_ALIGNED, buffer.byteLength));
    }

    this.buffer = buffer;
  }

  toString(): string {
    return format("SingleSegmentArena_len:%x", this.buffer.byteLength);
  }
}

export function allocate(
  minSize: number,
  segments: Segment[],
  s: SingleSegmentArena,
): ArenaAllocationResult {
  const srcBuffer = segments.length > 0 ? segments[0].buffer : s.buffer;

  minSize =
    minSize < MIN_SINGLE_SEGMENT_GROWTH
      ? MIN_SINGLE_SEGMENT_GROWTH
      : padToWord(minSize);

  // Grow by at least the current size, so that building a message from many small writes copies the buffer a
  // logarithmic number of times instead of once per write. The extra space is not part of the output:
  // `toArrayBuffer()` only copies the used part of the segment.
  s.buffer = new ArrayBuffer(
    srcBuffer.byteLength + Math.max(minSize, srcBuffer.byteLength),
  );

  // PERF: Assume that the source and destination buffers are word-aligned and use Float64Array to copy them one word
  // at a time.
  new Float64Array(s.buffer).set(new Float64Array(srcBuffer));

  return new ArenaAllocationResult(0, s.buffer);
}

export function getBuffer(id: number, s: SingleSegmentArena): ArrayBuffer {
  if (id !== 0) throw new Error(format(SEG_GET_NON_ZERO_SINGLE, id));

  return s.buffer;
}

export function getNumSegments(): number {
  return 1;
}
