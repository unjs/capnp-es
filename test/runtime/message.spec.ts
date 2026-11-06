// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, assert as t } from "vitest";
import { compareBuffers, readFileBuffer } from "test/utils";
import * as C from "src/constants";
import { Message } from "src/serialization";
import { MultiSegmentArena } from "src/serialization/arena";
import {
  getFramedSegments,
  preallocateSegments,
} from "src/serialization/message";

import { Person } from "test/fixtures/serialization-demo";
import { ListMania } from "test/fixtures/list-mania";

const SEGMENTED_PACKED = readFileBuffer(
  "test/fixtures/data/segmented-packed.bin",
);
const SEGMENTED_UNPACKED = readFileBuffer("test/fixtures/data/segmented.bin");

test("new Message(ArrayBuffer, false)", () => {
  const message = new Message(SEGMENTED_UNPACKED, false);

  compareBuffers(
    message.toArrayBuffer(),
    SEGMENTED_UNPACKED,
    "should read segmented messages",
  );
});

test("new Message(Buffer, false)", () => {
  const message = new Message(Buffer.from(SEGMENTED_UNPACKED), false);

  compareBuffers(
    message.toArrayBuffer(),
    SEGMENTED_UNPACKED,
    "should read messages from a Buffer",
  );
});

test("new Message(ArrayBuffer)", () => {
  const message = new Message(SEGMENTED_PACKED);

  compareBuffers(
    message.toArrayBuffer(),
    SEGMENTED_UNPACKED,
    "should read packed messages",
  );
});

test("new Message(Buffer)", () => {
  const message = new Message(Buffer.from(SEGMENTED_PACKED));

  compareBuffers(
    message.toArrayBuffer(),
    SEGMENTED_UNPACKED,
    "should read packed messages from a Buffer",
  );
});

test("getFramedSegments()", () => {
  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x00, // need at least 4 more bytes for an empty message
        ]).buffer,
      ),
    // "should throw when segment counts are missing",
  );

  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x01,
          0x00,
          0x00,
          0x00,
          0x00, // need at least 4 more bytes for the second segment length
        ]).buffer,
      ),
    // "should throw when there are not enough segment counts",
  );

  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x00,
          0x10,
          0x00,
          0x00,
          0x00, // should have 16 words in a single segment
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00, // but only get 2
        ]).buffer,
      ),
    // "should throw when message is truncated",
  );
});

test("Message.allocateSegment()", () => {
  const length = C.DEFAULT_BUFFER_SIZE;

  const m1 = new Message();

  m1.allocateSegment(length);
  m1.allocateSegment(length);

  t.throws(() => m1.getSegment(1));

  // Single segment arenas grow by at least their current size: 4096 -> 8192 -> 16384.

  t.equal(
    m1.getSegment(0).buffer.byteLength,
    length * 4,
    "should replace existing segments",
  );

  const m2 = new Message(new MultiSegmentArena([]));

  m2.allocateSegment(length);
  m2.allocateSegment(length);

  t.equal(
    m2.getSegment(1).buffer.byteLength,
    length,
    "should allocate new segments",
  );
});

test("single segment arena grows geometrically", () => {
  const count = 2000;
  const text = "x".repeat(1000);
  const m = new Message();
  const list = m.initRoot(ListMania)._initTextList(count);
  const segment = m.getSegment(0);

  let buffer = segment.buffer;
  let reallocations = 0;
  for (let i = 0; i < count; i++) {
    list.set(i, text);
    if (segment.buffer !== buffer) {
      buffer = segment.buffer;
      reallocations++;
    }
  }

  // Growing by the requested size only would reallocate ~500 times.
  t.isBelow(reallocations, 20);
  t.isAtMost(segment.buffer.byteLength, segment.byteLength * 2);

  // Unused capacity is not serialized.
  const out = m.toArrayBuffer();
  t.equal(out.byteLength, 8 + segment.byteLength);
  const read = new Message(out, false).getRoot(ListMania).textList;
  t.equal(read.length, count);
  t.equal(read.get(count - 1), text);
});

test("Message.copy()", () => {
  const text = "x".repeat(800);
  const m = new Message();
  const list = m.initRoot(ListMania)._initTextList(10);
  for (let i = 0; i < 10; i++) {
    list.set(i, text);
  }
  const segment = m.getSegment(0);
  t.isAbove(
    segment.buffer.byteLength,
    segment.byteLength,
    "the source should have unused capacity",
  );

  const c = m.copy();
  const copied = c.getSegment(0);

  t.equal(copied.byteLength, segment.byteLength, "should preserve used length");
  t.notEqual(copied.buffer, segment.buffer, "should own its buffer");
  compareBuffers(
    c.toArrayBuffer(),
    m.toArrayBuffer(),
    "should serialize only the used bytes",
  );
  compareBuffers(
    c.toPackedArrayBuffer(),
    m.toPackedArrayBuffer(),
    "should pack only the used bytes",
  );

  // Writing to the copy uses the spare capacity and does not touch the source.
  const buffer = copied.buffer;
  c.getRoot(ListMania).textList.set(0, "copy");
  t.equal(copied.buffer, buffer, "should reuse the spare capacity");
  t.equal(m.getRoot(ListMania).textList.get(0), text);
  t.equal(c.getRoot(ListMania).textList.get(0), "copy");
  t.equal(
    new Message(c.toArrayBuffer(), false).getRoot(ListMania).textList.get(0),
    "copy",
  );
});

test("Message.copy() of an empty message", () => {
  const c = new Message().copy();

  t.equal(c._capnp.segments.length, 0, "should not allocate segments");
  t.equal(
    c.toArrayBuffer().byteLength,
    new Message().toArrayBuffer().byteLength,
  );
});

test("Message.copy() of a multi segment message", () => {
  const m = new Message(new MultiSegmentArena([]));
  m.initRoot(ListMania)._initTextList(1).set(0, "abc");
  m.allocateSegment(C.DEFAULT_BUFFER_SIZE).allocate(16);
  t.equal(m._capnp.segments.length, 2);

  const c = m.copy();

  t.deepEqual(
    c._capnp.segments.map((s) => s.byteLength),
    m._capnp.segments.map((s) => s.byteLength),
    "should preserve used lengths",
  );
  compareBuffers(c.toArrayBuffer(), m.toArrayBuffer());
  t.equal(c.getRoot(ListMania).textList.get(0), "abc");
});

test("Message.copy() of a message read from a buffer", () => {
  const m = new Message(SEGMENTED_UNPACKED, false);

  compareBuffers(m.copy().toArrayBuffer(), SEGMENTED_UNPACKED);
});

test("Message.dump()", () => {
  const m1 = new Message(new MultiSegmentArena([]));

  t.equal(
    m1.dump(),
    `================
No Segments
================
`,
    "should print an empty message",
  );

  const m2 = new Message();

  m2.allocateSegment(16).allocate(16);

  t.equal(
    m2.dump(),
    `================
Segment #0
================

=== buffer[16] ===
00000000: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
`,
    "should print messages",
  );
});

test("Message.getSegment()", () => {
  const s = new Message(new MultiSegmentArena([])).getSegment(0);

  t.equal(s.byteLength, 8, "should preallocate segment 0");

  t.throws(
    () => new Message().getSegment(1),
    // "should throw when getting out of range segments",
  );

  t.throws(
    // this is too small to hold the root pointer
    () =>
      new Message(new MultiSegmentArena([new ArrayBuffer(2)])).getSegment(0),
    // "should throw when segment 0 is too small",
  );
});

test("Message.onCreatePointer()", () => {
  // This is why you should cache the result of `getList()` calls and use `List.toArray()` liberally...
  const m = new Message();
  m._capnp.traversalLimit = 100;
  const p = m.initRoot(Person);
  t.throws(
    () => {
      for (let i = 0; i < 101 + 1; i++) {
        p.phones;
      }
    },
    // "should throw when exceeding the pointer traversal limit",
  );
});

test("Message.toArrayBuffer()", () => {
  t.equal(
    new Message().toArrayBuffer().byteLength,
    16,
    "should allocate segment 0 before converting",
  );
});

test("Message.toPackedArrayBuffer()", () => {
  const message = new Message(SEGMENTED_UNPACKED, false);

  compareBuffers(
    message.toPackedArrayBuffer(),
    SEGMENTED_PACKED,
    "should pack messages properly",
  );
});

test("preallocateSegments()", () => {
  t.throws(
    () => {
      const message = new Message(
        new MultiSegmentArena([new ArrayBuffer(8), new ArrayBuffer(7)]),
      );

      preallocateSegments(message);
    },
    // "should throw when preallocating an empty arena",
  );
});
