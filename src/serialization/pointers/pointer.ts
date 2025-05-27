// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { MAX_DEPTH } from "../../constants";
import { format } from "../../util";
import { Segment } from "../segment";
import {
  PTR_DEPTH_LIMIT_EXCEEDED,
  PTR_OFFSET_OUT_OF_BOUNDS,
} from "../../errors";
import { dump, trackPointerAllocation } from "./pointer.utils";

export interface _PointerCtor {
  readonly displayName: string;
}

export interface PointerCtor<T extends Pointer> {
  readonly _capnp: _PointerCtor;

  new (segment: Segment, byteOffset: number, depthLimit?: number): T;
}

export enum PointerType {
  STRUCT = 0,
  LIST = 1,
  FAR = 2,
  OTHER = 3,
}

export interface _Pointer {
  compositeIndex?: number;

  compositeList: boolean;

  /**
   * A number that is decremented as nested pointers are traversed. When this hits zero errors will be thrown.
   */
  depthLimit: number;
}

/**
 * A pointer referencing a single byte location in a segment. This is typically used for Cap'n Proto pointers, but is
 * also sometimes used to reference an offset to a pointer's content or tag words.
 */
export class Pointer<T extends _Pointer = _Pointer> {
  static readonly _capnp: _PointerCtor = {
    displayName: "Pointer" as string,
  };

  readonly _capnp: T;

  /** Offset, in bytes, from the start of the segment to the beginning of this pointer. */
  byteOffset: number;

  /**
   * The starting segment for this pointer's data. In the case of a far pointer, the actual content this pointer is
   * referencing will be in another segment within the same message.
   */
  segment: Segment;

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {
    this._capnp = { compositeList: false, depthLimit } as T;
    this.segment = segment;
    this.byteOffset = byteOffset;

    if (depthLimit < 1) {
      throw new Error(format(PTR_DEPTH_LIMIT_EXCEEDED, this));
    }

    // Make sure we keep track of all pointer allocations; there's a limit per message (prevent DoS).
    trackPointerAllocation(segment.message, this);

    // NOTE: It's okay to have a pointer to the end of the segment; you'll see this when creating pointers to the
    // beginning of the content of a newly-allocated composite list with zero elements. Unlike other language
    // implementations buffer over/underflows are not a big issue since all buffer access is bounds checked in native
    // code anyway.
    if (byteOffset < 0 || byteOffset > segment.byteLength) {
      throw new Error(format(PTR_OFFSET_OUT_OF_BOUNDS, byteOffset));
    }
  }

  [Symbol.toStringTag](): string {
    return format("Pointer_%d", this.segment.id);
  }

  toString(): string {
    return format("->%d@%a%s", this.segment.id, this.byteOffset, dump(this));
  }
}
