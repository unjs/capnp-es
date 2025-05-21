// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

// Perform some bit gymnastics to determine the native endian format.

const tmpWord = new DataView(new ArrayBuffer(8));
new Uint16Array(tmpWord.buffer)[0] = 0x01_02;

/** Default size (in bytes) for newly allocated segments. */
export const DEFAULT_BUFFER_SIZE = 4096;

export const DEFAULT_DECODE_LIMIT = 64 << 20; // 64 MiB

/**
 * Limit to how deeply nested pointers are allowed to be. The root struct of a message will start at this value, and it
 * is decremented as pointers are dereferenced.
 */
export const DEFAULT_DEPTH_LIMIT = 64;

/**
 * Limit to the number of **bytes** that can be traversed in a single message. This is necessary to prevent certain
 * classes of DoS attacks where maliciously crafted data can be self-referencing in a way that wouldn't trigger the
 * depth limit.
 *
 * For this reason, it is advised to cache pointers into variables and not constantly dereference them since the
 * message's traversal limit gets decremented each time.
 */
export const DEFAULT_TRAVERSE_LIMIT = 64 << 20; // 64 MiB

/**
 * When allocating array buffers dynamically (while packing or in certain Arena implementations) the previous buffer's
 * size is multiplied by this number to determine the next buffer's size. This is chosen to keep both time spent
 * reallocating and wasted memory to a minimum.
 *
 * Smaller numbers would save memory at the expense of CPU time.
 */
export const GROWTH_FACTOR = 1.5;

/** A bitmask applied to obtain the size of a list pointer. */
export const LIST_SIZE_MASK = 0x00_00_00_07;

/** Maximum number of bytes to dump at once when dumping array buffers to string. */
export const MAX_BUFFER_DUMP_BYTES = 8192;

/** The maximum value for a 32-bit integer. */
export const MAX_INT32 = 0x7f_ff_ff_ff;

/** The maximum value for a 32-bit unsigned integer. */
export const MAX_UINT32 = 0xff_ff_ff_ff;

/** The largest integer that can be precisely represented in JavaScript. */
export const MAX_SAFE_INTEGER = 9_007_199_254_740_991;

/** Maximum limit on the number of segments in a message stream. */
export const MAX_STREAM_SEGMENTS = 512;

/** The smallest integer that can be precisely represented in JavaScript. */
export const MIN_SAFE_INTEGER = -9_007_199_254_740_991;

/** Minimum growth increment for a SingleSegmentArena. */
export const MIN_SINGLE_SEGMENT_GROWTH = 4096;

/**
 * This will be `true` if the machine running this code stores numbers natively in little-endian format. This is useful
 * for some numeric type conversions when the endianness does not affect the output. Using the native endianness for
 * these operations is _slightly_ faster.
 */
export const NATIVE_LITTLE_ENDIAN = tmpWord.getUint8(0) === 0x02;

/**
 * When packing a message, this is the number of zero bytes required after a SPAN (0xff) tag is written to the packed
 * message before the span is terminated.
 *
 * This little detail is left up to the implementation because it can be tuned for performance. Setting this to a higher
 * value may help with messages that contain a ton of text/data.
 *
 * It is imperative to never set this below 1 or else BAD THINGS. You have been warned.
 */
export const PACK_SPAN_THRESHOLD = 2;

/**
 * How far to travel into a nested pointer structure during a deep copy; when this limit is exhausted the copy
 * operation will throw an error.
 */
export const POINTER_COPY_LIMIT = 32;

/** A bitmask for looking up the double-far flag on a far pointer. */
export const POINTER_DOUBLE_FAR_MASK = 0x00_00_00_04;

/** A bitmask for looking up the pointer type. */
export const POINTER_TYPE_MASK = 0x00_00_00_03;

/** Used for some 64-bit conversions, equal to Math.pow(2, 32). */
export const VAL32 = 0x1_00_00_00_00;

/** The maximum value allowed for depth traversal limits. */
export const MAX_DEPTH = MAX_INT32;

/** The maximum byte length for a single segment. */
export const MAX_SEGMENT_LENGTH = MAX_UINT32;
