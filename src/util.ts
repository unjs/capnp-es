// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { TextEncoder } from "node:util";
import { MAX_BUFFER_DUMP_BYTES, MAX_INT32, MAX_UINT32 } from "./constants";
import { RANGE_INT32_OVERFLOW, RANGE_UINT32_OVERFLOW } from "./errors";

/**
 * Dump a hex string from the given buffer.
 *
 * @export
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} A hexadecimal string representing the buffer.
 */
export function bufferToHex(buffer: ArrayBufferLike): string {
  const a = new Uint8Array(buffer);
  const h: string[] = [];

  for (let i = 0; i < a.byteLength; i++) {
    h.push(pad(a[i].toString(16), 2));
  }

  return `[${h.join(" ")}]`;
}

/**
 * Throw an error if the provided value cannot be represented as a 32-bit integer.
 *
 * @export
 * @param {number} value The number to check.
 * @returns {number} The same number if it is valid.
 */
export function checkInt32(value: number): number {
  if (value > MAX_INT32 || value < -MAX_INT32) {
    throw new RangeError(RANGE_INT32_OVERFLOW);
  }

  return value;
}

export function checkUint32(value: number): number {
  if (value < 0 || value > MAX_UINT32) {
    throw new RangeError(RANGE_UINT32_OVERFLOW);
  }

  return value;
}

export function dumpBuffer(buffer: ArrayBuffer | ArrayBufferView): string {
  const b =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const byteLength = Math.min(b.byteLength, MAX_BUFFER_DUMP_BYTES);

  let r = format("\n=== buffer[%d] ===", byteLength);

  for (let j = 0; j < byteLength; j += 16) {
    r += `\n${pad(j.toString(16), 8)}: `;
    let s = "";
    let k;

    for (k = 0; k < 16 && j + k < b.byteLength; k++) {
      const v = b[j + k];

      r += `${pad(v.toString(16), 2)} `;

      // Printable ASCII range.

      s += v > 31 && v < 255 ? String.fromCharCode(v) : "·";

      if (k === 7) {
        r += " ";
      }
    }

    r += `${" ".repeat((17 - k) * 3)}${s}`;
  }

  r += "\n";

  if (byteLength !== b.byteLength) {
    r += format("=== (truncated %d bytes) ===\n", b.byteLength - byteLength);
  }

  return r;
}

/**
 * Encode a JavaScript string (UCS-2) to a UTF-8 encoded string inside a Uint8Array.
 *
 * @param {string} src The input string.
 * @returns {Uint8Array} A UTF-8 encoded buffer with the string's contents.
 */
export function encodeUtf8(src: string): Uint8Array {
  return new TextEncoder().encode(src);
}

/**
 * Decode an UTF-8 encoded string inside a Uint8Array.
 *
 * @param {string} src The input string.
 * @returns {Uint8Array} A UTF-8 encoded buffer with the string's contents.
 */
export function decodeUtf8(src: Uint8Array): string {
  return new TextDecoder().decode(src);
}

/**
 * Produce a `printf`-style string. Nice for providing arguments to `assert` without paying the cost for string
 * concatenation up front. Precision is supported for floating point numbers.
 *
 * @param {string} s The format string. Supported format specifiers: b, c, d, f, j, o, s, x, and X.
 * @param {...any} args Values to be formatted in the string. Arguments beyond what are consumed by the format string
 * are ignored.
 * @returns {string} The formatted string.
 */
export function format(s: string, ...args: unknown[]): string {
  const n = s.length;
  let arg: unknown;
  let argIndex = 0;
  let c: string;
  let escaped = false;
  let i = 0;
  let leadingZero = false;
  let precision: number | null;
  let result = "";

  function nextArg() {
    return args[argIndex++];
  }

  function slurpNumber() {
    let digits = "";

    while (/\d/.test(s[i])) {
      digits += s[i++];
      c = s[i];
    }

    return digits.length > 0 ? Number.parseInt(digits, 10) : null;
  }

  for (; i < n; ++i) {
    c = s[i];

    if (escaped) {
      escaped = false;

      if (c === ".") {
        leadingZero = false;

        c = s[++i];
      } else if (c === "0" && s[i + 1] === ".") {
        leadingZero = true;

        i += 2;
        c = s[i];
      } else {
        leadingZero = true;
      }

      precision = slurpNumber();

      switch (c) {
        case "a": {
          // number in hex with padding
          result +=
            "0x" + pad(Number.parseInt(String(nextArg()), 10).toString(16), 8);

          break;
        }

        case "b": {
          // number in binary
          result += Number.parseInt(String(nextArg()), 10).toString(2);

          break;
        }

        case "c": {
          // character
          arg = nextArg();

          result +=
            typeof arg === "string" || arg instanceof String
              ? arg
              : String.fromCharCode(Number.parseInt(String(arg), 10));

          break;
        }

        case "d": {
          // number in decimal
          result += Number.parseInt(String(nextArg()), 10);

          break;
        }

        case "f": {
          // floating point number
          const tmp = Number.parseFloat(String(nextArg())).toFixed(
            precision || 6,
          );

          result += leadingZero ? tmp : tmp.replace(/^0/, "");

          break;
        }
        case "j": {
          // JSON
          result += JSON.stringify(nextArg());

          break;
        }

        case "o": {
          // number in octal
          result += "0" + Number.parseInt(String(nextArg()), 10).toString(8);

          break;
        }

        case "s": {
          // string
          result += nextArg();

          break;
        }

        case "x": {
          // lowercase hexadecimal
          result += "0x" + Number.parseInt(String(nextArg()), 10).toString(16);

          break;
        }

        case "X": {
          // uppercase hexadecimal
          result +=
            "0x" +
            Number.parseInt(String(nextArg()), 10).toString(16).toUpperCase();

          break;
        }

        default: {
          result += c;

          break;
        }
      }
    } else if (c === "%") {
      escaped = true;
    } else {
      result += c;
    }
  }

  return result;
}

export function pad(v: string, width: number, pad = "0"): string {
  return v.length >= width
    ? v
    : Array.from({ length: width - v.length + 1 }).join(pad) + v;
}

/**
 * Add padding to a number to make it divisible by 8. Typically used to pad byte sizes so they align to a word boundary.
 *
 * @export
 * @param {number} size The number to pad.
 * @returns {number} The padded number.
 */

export function padToWord(size: number): number {
  return (size + 7) & ~7;
}
