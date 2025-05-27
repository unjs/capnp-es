// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { DEFAULT_TRAVERSE_LIMIT, DEFAULT_BUFFER_SIZE } from "../constants";
import {
  MSG_INVALID_FRAME_HEADER,
  MSG_SEGMENT_OUT_OF_BOUNDS,
  MSG_SEGMENT_TOO_SMALL,
} from "../errors";
import type { Client } from "../rpc/client";
import { dumpBuffer, format, padToWord } from "../util";
import {
  AnyArena,
  Arena,
  MultiSegmentArena,
  SingleSegmentArena,
  ArenaKind,
} from "./arena";
import { pack, unpack } from "./packing";
import { Pointer, StructCtor, PointerType, Struct } from "./pointers";
import { Segment } from "./segment";
import { getTargetStructSize, validate } from "./pointers/pointer.utils";
import { resize, initStruct } from "./pointers/struct.utils";
import { copyFrom } from "./pointers/pointer.utils";

export interface _Message {
  readonly arena: AnyArena;
  segments: Segment[];
  traversalLimit: number;
  capTable?: Array<Client | null>;
}

export class Message {
  static readonly allocateSegment = allocateSegment;
  static readonly dump = dump;
  static readonly getRoot = getRoot;
  static readonly getSegment = getSegment;
  static readonly initRoot = initRoot;
  static readonly readRawPointer = readRawPointer;
  static readonly toArrayBuffer = toArrayBuffer;
  static readonly toPackedArrayBuffer = toPackedArrayBuffer;

  readonly _capnp: _Message;

  /**
   * A Cap'n Proto message.
   *
   * SECURITY WARNING: In Node.js do not pass a Buffer's internal array buffer into this constructor. Pass the buffer
   * directly and everything will be fine. If not, your message will potentially be initialized with random memory
   * contents!
   *
   * The constructor method creates a new Message, optionally using a provided arena for segment allocation, or a buffer
   * to read from.
   *
   * @param src The source for the message.
   * A value of `undefined` will cause the message to initialize with a single segment arena only big enough for the
   * root pointer; it will expand as you go. This is a reasonable choice for most messages.
   *
   * Passing an arena will cause the message to use that arena for its segment allocation. Contents will be accepted
   * as-is.
   *
   * Passing an array buffer view (like `DataView`, `Uint8Array` or `Buffer`) will create a **copy** of the source
   * buffer; beware of the potential performance cost!
   *
   * @param packed Whether or not the message is packed. If `true` (the default), the message will be
   * unpacked.
   *
   * @param singleSegment If true, `src` will be treated as a message consisting of a single segment without
   * a framing header.
   *
   */
  constructor(
    src?: AnyArena | ArrayBufferView | ArrayBuffer,
    packed = true,
    singleSegment = false,
  ) {
    this._capnp = initMessage(src, packed, singleSegment);

    if (src) {
      preallocateSegments(this);
    }
  }

  allocateSegment(byteLength: number): Segment {
    return allocateSegment(byteLength, this);
  }

  /**
   * Copies the contents of this message into an identical message with its own ArrayBuffers.
   *
   * @returns A copy of this message.
   */
  copy(): Message {
    return copy(this);
  }

  /**
   * Create a pretty-printed string dump of this message; incredibly useful for debugging.
   *
   * WARNING: Do not call this method on large messages!
   *
   * @returns A big steaming pile of pretty hex digits.
   */
  dump(): string {
    return dump(this);
  }

  /**
   * Get a struct pointer for the root of this message. This is primarily used when reading a message; it will not
   * overwrite existing data.
   *
   * @param RootStruct The struct type to use as the root.
   * @returns A struct representing the root of the message.
   */
  getRoot<T extends Struct>(RootStruct: StructCtor<T>): T {
    return getRoot(RootStruct, this);
  }

  /**
   * Get a segment by its id.
   *
   * This will lazily allocate the first segment if it doesn't already exist.
   *
   * @param id The segment id.
   * @returns The requested segment.
   */

  getSegment(id: number): Segment {
    return getSegment(id, this);
  }

  /**
   * Initialize a new message using the provided struct type as the root.
   *
   * @param RootStruct The struct type to use as the root.
   * @returns An initialized struct pointing to the root of the message.
   */
  initRoot<T extends Struct>(RootStruct: StructCtor<T>): T {
    return initRoot(RootStruct, this);
  }

  /**
   * Set the root of the message to a copy of the given pointer. Used internally
   * to make copies of pointers for default values.
   *
   * @param src The source pointer to copy.
   */
  setRoot(src: Pointer): void {
    setRoot(src, this);
  }

  /**
   * Combine the contents of this message's segments into a single array buffer and prepend a stream framing header
   * containing information about the following segment data.
   *
   * @returns An ArrayBuffer with the contents of this message.
   */
  toArrayBuffer(): ArrayBuffer {
    return toArrayBuffer(this);
  }

  /**
   * Like `toArrayBuffer()`, but also applies the packing algorithm to the output. This is typically what you want to
   * use if you're sending the message over a network link or other slow I/O interface where size matters.
   *
   * @returns A packed message.
   */
  toPackedArrayBuffer(): ArrayBuffer {
    return toPackedArrayBuffer(this);
  }

  addCap(client: Client | null): number {
    if (!this._capnp.capTable) {
      this._capnp.capTable = [];
    }
    const id = this._capnp.capTable.length;
    this._capnp.capTable.push(client);
    return id;
  }

  toString(): string {
    return `Message_arena:${this._capnp.arena}`;
  }
}

export interface CreateMessageOptions {
  packed?: boolean;
  singleSegment?: boolean;
}

export function initMessage(
  src?: AnyArena | ArrayBufferView | ArrayBuffer,
  packed = true,
  singleSegment = false,
): _Message {
  if (src === undefined) {
    return {
      arena: new SingleSegmentArena(),
      segments: [],
      traversalLimit: DEFAULT_TRAVERSE_LIMIT,
    };
  }

  if (isAnyArena(src)) {
    return { arena: src, segments: [], traversalLimit: DEFAULT_TRAVERSE_LIMIT };
  }

  let buf = src;

  if (isArrayBufferView(buf)) {
    buf = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  }

  if (packed) {
    buf = unpack(buf);
  }

  if (singleSegment) {
    return {
      arena: new SingleSegmentArena(buf),
      segments: [],
      traversalLimit: DEFAULT_TRAVERSE_LIMIT,
    };
  }

  return {
    arena: new MultiSegmentArena(getFramedSegments(buf)),
    segments: [],
    traversalLimit: DEFAULT_TRAVERSE_LIMIT,
  };
}

/**
 * Given an _unpacked_ message with a segment framing header, this will generate an ArrayBuffer for each segment in
 * the message.
 *
 * This method is not typically called directly, but can be useful in certain cases.
 *
 * @param message An unpacked message with a framing header.
 * @returns An array of buffers containing the segment data.
 */
export function getFramedSegments(message: ArrayBuffer): ArrayBuffer[] {
  const dv = new DataView(message);

  const segmentCount = dv.getUint32(0, true) + 1;

  const segments = Array.from({ length: segmentCount }) as ArrayBuffer[];

  let byteOffset = 4 + segmentCount * 4;
  byteOffset += byteOffset % 8;

  if (byteOffset + segmentCount * 4 > message.byteLength) {
    throw new Error(MSG_INVALID_FRAME_HEADER);
  }

  for (let i = 0; i < segmentCount; i++) {
    const byteLength = dv.getUint32(4 + i * 4, true) * 8;

    if (byteOffset + byteLength > message.byteLength) {
      throw new Error(MSG_INVALID_FRAME_HEADER);
    }

    segments[i] = message.slice(byteOffset, byteOffset + byteLength);

    byteOffset += byteLength;
  }

  return segments;
}

/**
 * This method is called on messages that were constructed with existing data to prepopulate the segments array with
 * everything we can find in the arena. Each segment will have it's `byteLength` set to the size of its buffer.
 *
 * Technically speaking, the message's segments will be "full" after calling this function. Calling this on your own
 * may void your warranty.
 *
 * @param m The message to allocate.
 */
export function preallocateSegments(m: Message): void {
  const numSegments = Arena.getNumSegments(m._capnp.arena);

  // if (numSegments < 1) throw new Error(MSG_NO_SEGMENTS_IN_ARENA);

  m._capnp.segments = Array.from({ length: numSegments }) as Segment[];

  for (let i = 0; i < numSegments; i++) {
    // Set up each segment so that they're fully allocated to the extents of the existing buffers.

    if (i === 0 && Arena.getBuffer(i, m._capnp.arena).byteLength < 8) {
      // This is not a valid message if it can't fit a single pointer.
      throw new Error(MSG_SEGMENT_TOO_SMALL);
    }

    const buffer = Arena.getBuffer(i, m._capnp.arena);
    const segment = new Segment(i, m, buffer, buffer.byteLength);

    m._capnp.segments[i] = segment;
  }
}

function isArrayBufferView(
  src: ArrayBuffer | ArrayBufferView,
): src is ArrayBufferView {
  return (src as { byteOffset?: number }).byteOffset !== undefined;
}

function isAnyArena(o: unknown): o is AnyArena {
  return (o as { kind?: ArenaKind }).kind !== undefined;
}

export function allocateSegment(byteLength: number, m: Message): Segment {
  const res = Arena.allocate(byteLength, m._capnp.segments, m._capnp.arena);
  let s: Segment;

  if (res.id === m._capnp.segments.length) {
    // Note how we're only allowing new segments in if they're exactly the next one in the array. There is no logical
    // reason for segments to be created out of order.

    s = new Segment(res.id, m, res.buffer);

    m._capnp.segments.push(s);
  } else if (res.id < 0 || res.id > m._capnp.segments.length) {
    throw new Error(format(MSG_SEGMENT_OUT_OF_BOUNDS, res.id, m));
  } else {
    s = m._capnp.segments[res.id];
    s.replaceBuffer(res.buffer);
  }

  return s;
}

export function dump(m: Message): string {
  let r = "";

  if (m._capnp.segments.length === 0) {
    return "================\nNo Segments\n================\n";
  }

  for (let i = 0; i < m._capnp.segments.length; i++) {
    r += `================\nSegment #${i}\n================\n`;

    const { buffer, byteLength } = m._capnp.segments[i];
    const b = new Uint8Array(buffer, 0, byteLength);

    r += dumpBuffer(b);
  }

  return r;
}

export function getRoot<T extends Struct>(
  RootStruct: StructCtor<T>,
  m: Message,
): T {
  const root = new RootStruct(m.getSegment(0), 0);

  validate(PointerType.STRUCT, root);

  const ts = getTargetStructSize(root);

  // Make sure the underlying pointer is actually big enough to hold the data and pointers as specified in the schema.
  // If not a shallow copy of the struct contents needs to be made before returning.
  if (
    ts.dataByteLength < RootStruct._capnp.size.dataByteLength ||
    ts.pointerLength < RootStruct._capnp.size.pointerLength
  ) {
    resize(RootStruct._capnp.size, root);
  }

  return root;
}

export function getSegment(id: number, m: Message): Segment {
  const segmentLength = m._capnp.segments.length;

  if (id === 0 && segmentLength === 0) {
    // Segment zero is special. If we have no segments in the arena we'll want to allocate a new one and leave room
    // for the root pointer.

    const arenaSegments = Arena.getNumSegments(m._capnp.arena);

    if (arenaSegments === 0) {
      allocateSegment(DEFAULT_BUFFER_SIZE, m);
    } else {
      // Okay, the arena already has a buffer we can use. This is totally fine.

      m._capnp.segments[0] = new Segment(
        0,
        m,
        Arena.getBuffer(0, m._capnp.arena),
      );
    }

    if (!m._capnp.segments[0].hasCapacity(8)) {
      throw new Error(MSG_SEGMENT_TOO_SMALL);
    }

    // This will leave room for the root pointer.

    m._capnp.segments[0].allocate(8);

    return m._capnp.segments[0];
  }

  if (id < 0 || id >= segmentLength) {
    throw new Error(format(MSG_SEGMENT_OUT_OF_BOUNDS, id, m));
  }

  return m._capnp.segments[id];
}

export function initRoot<T extends Struct>(
  RootStruct: StructCtor<T>,
  m: Message,
): T {
  const root = new RootStruct(m.getSegment(0), 0);

  initStruct(RootStruct._capnp.size, root);

  return root;
}

/**
 * Read a pointer in raw form (a packed message with framing headers). Does not
 * care or attempt to validate the input beyond parsing the message
 * segments.
 *
 * This is typically used by the compiler to load default values, but can be
 * useful to work with messages with an unknown schema.
 *
 * @param data The raw data to read.
 * @returns A root pointer.
 */
export function readRawPointer(data: ArrayBuffer): Pointer {
  return new Pointer(new Message(data).getSegment(0), 0);
}

export function setRoot(src: Pointer, m: Message): void {
  copyFrom(src, new Pointer(m.getSegment(0), 0));
}

export function toArrayBuffer(m: Message): ArrayBuffer {
  const streamFrame = getStreamFrame(m);

  // Make sure the first segment is allocated.

  if (m._capnp.segments.length === 0) {
    getSegment(0, m);
  }

  const { segments } = m._capnp;

  // Add space for the stream framing.

  const totalLength =
    streamFrame.byteLength +
    segments.reduce((l, s) => l + padToWord(s.byteLength), 0);
  const out = new Uint8Array(new ArrayBuffer(totalLength));
  let o = streamFrame.byteLength;

  out.set(new Uint8Array(streamFrame));

  for (const s of segments) {
    const segmentLength = padToWord(s.byteLength);
    out.set(new Uint8Array(s.buffer, 0, segmentLength), o);

    o += segmentLength;
  }

  return out.buffer;
}

export function toPackedArrayBuffer(m: Message): ArrayBuffer {
  const streamFrame = pack(getStreamFrame(m));

  // Make sure the first segment is allocated.

  if (m._capnp.segments.length === 0) {
    m.getSegment(0);
  }

  // NOTE: A copy operation can be avoided here if we capture the intermediate array and use that directly in the copy
  // loop below, rather than have `pack()` copy it to an ArrayBuffer just to have to copy it again later. If the
  // intermediate array can be avoided altogether that's even better!
  const segments = m._capnp.segments.map((s) =>
    pack(s.buffer, 0, padToWord(s.byteLength)),
  );

  const totalLength =
    streamFrame.byteLength + segments.reduce((l, s) => l + s.byteLength, 0);
  const out = new Uint8Array(new ArrayBuffer(totalLength));
  let o = streamFrame.byteLength;

  out.set(new Uint8Array(streamFrame));

  for (const s of segments) {
    out.set(new Uint8Array(s), o);

    o += s.byteLength;
  }

  return out.buffer;
}

export function getStreamFrame(m: Message): ArrayBuffer {
  const { length } = m._capnp.segments;

  if (length === 0) {
    // Don't bother allocating the first segment, just return a single zero word for the frame header.

    return new Float64Array(1).buffer;
  }

  const frameLength = 4 + length * 4 + (1 - (length % 2)) * 4;
  const out = new DataView(new ArrayBuffer(frameLength));

  out.setUint32(0, length - 1, true);

  for (const [i, s] of m._capnp.segments.entries()) {
    out.setUint32(i * 4 + 4, s.byteLength / 8, true);
  }

  return out.buffer;
}
export function copy(m: Message): Message {
  return new Message(Arena.copy(m._capnp.arena));
}
