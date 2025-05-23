// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { decToHex, hexToDec } from "hex2dec";
import { pad } from "../util";

export function c2s(s: string): string {
  return splitCamel(s)
    .map((x) => x.toUpperCase())
    .join("_");
}

export function c2t(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

export function d2h(d: string): string {
  let h = decToHex(d)!.slice(2);
  let neg = false;

  if (h[0] === "-") {
    h = h.slice(1);

    neg = true;
  }

  return neg ? `-${pad(h, 16)}` : pad(h, 16);
}

export function decToHexBytes(d: string): string[] {
  let h = d2h(d);
  const neg = h[0] === "-";
  const out = neg ? ["-"] : [];

  if (neg) h = h.slice(1);

  for (let i = 0; i < h.length; i += 2) {
    // eslint-disable-next-line unicorn/prefer-string-slice
    out.push(h.substring(i, 2));
  }

  return out;
}

export function splitCamel(s: string): string[] {
  let wasLo = false;
  // eslint-disable-next-line unicorn/no-array-reduce
  return s.split("").reduce((a: string[], c: string) => {
    const lo = c.toUpperCase() !== c;
    const up = c.toLowerCase() !== c;

    if (a.length === 0 || (wasLo && up)) {
      a.push(c);
    } else {
      const i = a.length - 1;
      a[i] = a[i] + c;
    }

    wasLo = lo;

    return a;
  }, []);
}

export function hexToBigInt(h: string): bigint {
  return BigInt(hexToDec(h)!);
}
