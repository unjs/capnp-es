// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { MAX_DEPTH } from "../../constants";
import { ObjectSize } from "../object-size";
import { Segment } from "../segment";
import { _Pointer, _PointerCtor, Pointer } from "./pointer";
import { getContent } from "./pointer.utils";

export interface _StructCtor extends _PointerCtor {
  readonly id: string;
  readonly size: ObjectSize;
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
   * @param segment The segment the pointer resides in.
   * @param byteOffset The offset from the beginning of the segment to the beginning of the pointer data.
   * @param depthLimit The nesting depth limit for this object.
   * @param compositeIndex If set, then this pointer is actually a reference to a composite list
   * (`this._getPointerTargetType() === PointerType.LIST`), and this number is used as the index of the struct within
   * the list. It is not valid to call `initStruct()` on a composite struct – the struct contents are initialized when
   * the list pointer is initialized.
   */
  constructor(
    segment: Segment,
    byteOffset: number,
    depthLimit = MAX_DEPTH,
    compositeIndex?: number,
  ) {
    super(segment, byteOffset, depthLimit);

    this._capnp.compositeIndex = compositeIndex;
    this._capnp.compositeList = compositeIndex !== undefined;
  }

  static [Symbol.toStringTag](): string {
    return this._capnp.displayName;
  }

  [Symbol.toStringTag](): string {
    return (
      `Struct_${super.toString()}` +
      `${this._capnp.compositeIndex === undefined ? "" : `,ci:${this._capnp.compositeIndex}`}` +
      ` > ${getContent(this).toString()}`
    );
  }
}

export class AnyStruct extends Struct {
  static readonly _capnp = {
    displayName: "AnyStruct",
    id: "0",
    size: new ObjectSize(0, 0),
  };
}
