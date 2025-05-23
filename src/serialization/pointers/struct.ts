// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { MAX_DEPTH } from "../../constants";
import type { AnyArena } from "../arena";
import { Message } from "../message";
import { ObjectSize } from "../object-size";
import { Segment } from "../segment";
import { _Pointer, _PointerCtor, Pointer } from "./pointer";

export interface _StructCtor extends _PointerCtor {
  readonly id: string;
  readonly size: ObjectSize;
  readonly fields?: string[];
}

export interface StructCtor<T extends Struct> {
  readonly _capnp: _StructCtor;

  new (
    segment: Segment,
    byteOffset: number,
    depthLimit?: number,
    compositeIndex?: number,
  ): T;
}

export interface _Struct extends _Pointer {
  compositeIndex?: number;
}

export class Struct extends Pointer<_Struct> {
  static readonly _capnp = {
    displayName: "Struct" as string,
  };

  /**
   * Create a new pointer to a struct.
   *
   * @constructor {Struct}
   * @param {Segment} segment The segment the pointer resides in.
   * @param {number} byteOffset The offset from the beginning of the segment to the beginning of the pointer data.
   * @param {any} [depthLimit=MAX_DEPTH] The nesting depth limit for this object.
   * @param {number} [compositeIndex] If set, then this pointer is actually a reference to a composite list
   * (`this._getPointerTargetType() === PointerType.LIST`), and this number is used as the index of the struct within
   * the list. It is not valid to call `initStruct()` on a composite struct – the struct contents are initialized when
   * the list pointer is initialized.
   */

  constructor(
    segment: Segment,
    byteOffset: number,
    depthLimit: number = MAX_DEPTH,
    compositeIndex?: number,
  ) {
    super(segment, byteOffset, depthLimit);

    this._capnp.compositeIndex = compositeIndex;
    this._capnp.compositeList = compositeIndex !== undefined;
  }

  static init<T extends Struct>(
    this: new (
      segment: Segment,
      byteOffset: number,
      depthLimit?: number,
      compositeIndex?: number,
    ) => T,
    src?: AnyArena | ArrayBufferView | ArrayBuffer,
    opts?: { packed?: boolean; singleSegment?: boolean },
  ): T {
    const msg = new Message(src, opts?.packed, opts?.singleSegment);
    return msg.getRoot(this as StructCtor<T>);
  }

  static [Symbol.toStringTag](): string {
    return this._capnp.displayName;
  }

  toJSON() {
    const fieldNames =
      (this.constructor as StructCtor<Struct>)._capnp.fields || [];
    const fields = Object.fromEntries(
      fieldNames.map((name) => {
        let val;
        try {
          val = this[name as keyof this];
        } catch {
          // Ignore
        }
        return [name, val];
      }),
    );
    return fields;
  }
}

export class AnyStruct extends Struct {
  static readonly _capnp = {
    displayName: "AnyStruct",
    id: "0",
    size: new ObjectSize(0, 0),
  };
}
