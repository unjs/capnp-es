// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import {
  PTR_COMPOSITE_SIZE_UNDEFINED,
  PTR_INVALID_LIST_SIZE,
  LIST_NO_MUTABLE,
  LIST_NO_SEARCH,
} from "../../../errors";
import { format } from "../../../util";
import { ListElementSize } from "../../list-element-size";
import { ObjectSize, padToWord, getByteLength } from "../../object-size";
import { Segment } from "../../segment";
import { Pointer } from "../pointer";
import {
  getTargetListLength,
  getListElementByteLength,
  setStructPointer,
  setListPointer,
  initPointer,
} from "../pointer.utils";

export interface _ListCtor {
  readonly compositeSize?: ObjectSize;
  readonly displayName: string;
  readonly size: ListElementSize;
}

export interface ListCtor<T> {
  readonly _capnp: _ListCtor;

  new (segment: Segment, byteOffset: number, depthLimit?: number): List<T>;
}

export type ArrayCb<T, RT = boolean> = (
  this: any,
  value: T,
  index: number,
  array: T[],
) => RT;

export interface Group<T> {
  [k: string]: T;
}

/**
 * A generic list class. Implements Filterable,
 */

export class List<T> extends Pointer implements Array<T> {
  static readonly _capnp: _ListCtor = {
    displayName: "List<Generic>" as string,
    size: ListElementSize.VOID,
  };

  [n: number]: T;

  constructor(segment: Segment, byteOffset: number, depthLimit?: number) {
    super(segment, byteOffset, depthLimit);
    return new Proxy(this, List.#proxyHandler);
  }

  static #proxyHandler: ProxyHandler<List<any>> = {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (val !== undefined) {
        return val;
      }
      if (typeof prop === "string") {
        return target.get(+prop);
      }
    },
  };

  get length(): number {
    return getTargetListLength(this);
  }

  toArray(): T[] {
    const { length } = this;
    const res = Array.from({ length }) as T[];
    for (let i = 0; i < length; i++) {
      res[i] = this.at(i);
    }
    return res;
  }

  get(_index: number): T {
    throw new TypeError("Cannot get from a generic list.");
  }

  set(_index: number, _value: T): void {
    throw new TypeError("Cannot set on a generic list.");
  }

  at(index: number): T {
    return this.get(index < 0 ? this.length + index : index);
  }

  concat(other: T[]): T[] {
    const { length } = this;
    const otherLength = other.length;
    const res = Array.from({ length: length + otherLength }) as T[];
    for (let i = 0; i < length; i++) res[i] = this.at(i);
    for (let i = 0; i < otherLength; i++) res[i + length] = other.at(i)!;
    return res;
  }

  some(cb: ArrayCb<T>, _this?: any): boolean {
    for (let i = 0; i < this.length; i++) {
      if (cb.call(_this, this.at(i), i, this as unknown as T[])) {
        return true;
      }
    }
    return false;
  }

  filter(cb: ArrayCb<T>, _this?: any): T[] {
    const res: T[] = [];
    for (let i = 0; i < this.length; i++) {
      const value = this.at(i);
      if (cb.call(_this, value, i, this as unknown as T[])) {
        res.push(value);
      }
    }
    return res;
  }

  find(cb: ArrayCb<T>, _this?: any): T | undefined {
    for (let i = 0; i < this.length; i++) {
      const value = this.at(i);
      if (cb.call(_this, value, i, this as unknown as T[])) {
        return value;
      }
    }
    return undefined;
  }

  findIndex(cb: (v: T, i: number, arr: T[]) => boolean, _this?: any): number {
    for (let i = 0; i < this.length; i++) {
      const value = this.at(i);
      if (cb.call(_this, value, i, this as unknown as T[])) {
        return i;
      }
    }
    return -1;
  }

  forEach(cb: ArrayCb<T, void>, _this?: any): void {
    for (let i = 0; i < this.length; i++) {
      cb.call(_this, this.at(i), i, this as unknown as T[]);
    }
  }

  map<U>(cb: ArrayCb<T, U>, _this?: any): U[] {
    const { length } = this;
    const res = Array.from({ length }) as U[];
    for (let i = 0; i < length; i++) {
      res[i] = cb.call(_this, this.at(i), i, this as unknown as T[]);
    }
    return res;
  }

  flatMap<U>(cb: ArrayCb<T, U | U[]>, _this?: any): U[] {
    const res: U[] = [];
    for (let i = 0; i < this.length; i++) {
      const r = cb.call(_this, this.at(i), i, this as unknown as T[]);
      res.push(...(Array.isArray(r) ? r : [r]));
    }
    return res;
  }

  every<S extends T>(cb: (v: T, i: number) => v is S, t?: any): this is S[];
  every(cb: ArrayCb<T, unknown>, _this?: any): boolean {
    for (let i = 0; i < this.length; i++) {
      if (!cb.call(_this, this.at(i), i, this as unknown as T[])) {
        return false;
      }
    }
    return true;
  }

  reduce(cb: (p: T, c: T, i: number, a: T[]) => T, initialValue?: T): T {
    let i = 0;
    let res: T;
    if (initialValue === undefined) {
      res = this.at(0);
      i++;
    } else {
      res = initialValue;
    }
    for (; i < this.length; i++) {
      res = cb(res, this.at(i), i, this as unknown as T[]);
    }
    return res;
  }

  reduceRight(cb: (p: T, c: T, i: number, a: T[]) => T, initialValue?: T): T {
    let i = this.length - 1;
    let res: T;
    if (initialValue === undefined) {
      res = this.at(i);
      i--;
    } else {
      res = initialValue;
    }
    for (; i >= 0; i--) {
      res = cb(res, this.at(i), i, this as unknown as T[]);
    }
    return res;
  }

  slice(start = 0, end?: number): T[] {
    const length = end ? Math.min(this.length, end) : this.length;
    const res = Array.from({ length: length - start }) as T[];
    for (let i = start; i < length; i++) {
      res[i] = this.at(i);
    }
    return res;
  }

  join(separator?: string): string {
    return this.toArray().join(separator);
  }

  toReversed(): T[] {
    return this.toArray().reverse();
  }

  toSorted(compareFn?: ((a: T, b: T) => number) | undefined): T[] {
    return this.toArray().sort(compareFn);
  }

  toSpliced(start: number, deleteCount: number, ...items: T[]): T[] {
    return this.toArray().splice(start, deleteCount, ...items);
  }

  fill(value: T, start?: number, end?: number): this {
    const { length } = this;
    const s = Math.max(start ?? 0, 0);
    const e = Math.min(end ?? length, length);
    for (let i = s; i < e; i++) {
      this.set(i, value);
    }
    return this;
  }

  copyWithin(target: number, start: number, end?: number): this {
    const { length } = this;
    const e = end ?? length;
    const s = start < 0 ? Math.max(length + start, 0) : start;
    const t = target < 0 ? Math.max(length + target, 0) : target;
    const len = Math.min(e - s, length - t);
    for (let i = 0; i < len; i++) {
      this.set(t + i, this.at(s + i));
    }
    return this;
  }

  keys(): ArrayIterator<number> {
    return Array.from({ length: this.length }, (_, i) => i)[Symbol.iterator]();
  }

  values(): ArrayIterator<T> {
    return this.toArray().values();
  }

  entries(): ArrayIterator<[number, T]> {
    return this.toArray().entries();
  }

  flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[] {
    return (this as List<T>).toArray().flat(depth) as FlatArray<A, D>[];
  }

  with(index: number, value: T): T[] {
    return this.toArray().with(index, value);
  }

  includes(_searchElement: T, _fromIndex?: number): boolean {
    throw new Error(LIST_NO_SEARCH);
  }

  findLast(_cb: unknown, _thisArg?: unknown): T | undefined {
    throw new Error(LIST_NO_SEARCH);
  }

  findLastIndex(_cb: (v: T, i: number, a: T[]) => unknown, _t?: any): number {
    throw new Error(LIST_NO_SEARCH);
  }

  indexOf(_searchElement: T, _fromIndex?: number): number {
    throw new Error(LIST_NO_SEARCH);
  }

  lastIndexOf(_searchElement: T, _fromIndex?: number): number {
    throw new Error(LIST_NO_SEARCH);
  }

  pop(): T | undefined {
    throw new Error(LIST_NO_MUTABLE);
  }

  push(..._items: T[]): number {
    throw new Error(LIST_NO_MUTABLE);
  }

  reverse(): T[] {
    throw new Error(LIST_NO_MUTABLE);
  }

  shift(): T | undefined {
    throw new Error(LIST_NO_MUTABLE);
  }

  unshift(..._items: T[]): number {
    throw new Error(LIST_NO_MUTABLE);
  }

  splice(_start: unknown, _deleteCount?: unknown, ..._rest: unknown[]): T[] {
    throw new Error(LIST_NO_MUTABLE);
  }

  sort(_fn?: ((a: T, b: T) => number) | undefined): this {
    throw new Error(LIST_NO_MUTABLE);
  }

  get [Symbol.unscopables]() {
    return Array.prototype[Symbol.unscopables];
  }

  [Symbol.iterator](): ArrayIterator<T> {
    return this.values();
  }

  toJSON(): unknown {
    return this.toArray();
  }

  toString(): string {
    return this.join(",");
  }

  toLocaleString(_locales?: unknown, _options?: unknown): string {
    return this.toString();
  }

  [Symbol.toStringTag]() {
    return "[object Array]";
  }

  static [Symbol.toStringTag](): string {
    return this._capnp.displayName;
  }
}

/**
 * Initialize the list with the given element size and length. This will allocate new space for the list, ideally in
 * the same segment as this pointer.
 *
 * @param {ListElementSize} elementSize The size of each element in the list.
 * @param {number} length The number of elements in the list.
 * @param {List<T>} list The list to initialize.
 * @param {ObjectSize} [compositeSize] The size of each element in a composite list. This value is required for
 * composite lists.
 * @returns {void}
 */
export function initList<T>(
  elementSize: ListElementSize,
  length: number,
  list: List<T>,
  compositeSize?: ObjectSize,
): void {
  let c: Pointer;

  switch (elementSize) {
    case ListElementSize.BIT: {
      c = list.segment.allocate(Math.ceil(length / 8));
      break;
    }

    case ListElementSize.BYTE:
    case ListElementSize.BYTE_2:
    case ListElementSize.BYTE_4:
    case ListElementSize.BYTE_8:
    case ListElementSize.POINTER: {
      c = list.segment.allocate(length * getListElementByteLength(elementSize));
      break;
    }

    case ListElementSize.COMPOSITE: {
      if (compositeSize === undefined) {
        throw new Error(format(PTR_COMPOSITE_SIZE_UNDEFINED));
      }
      compositeSize = padToWord(compositeSize);
      const byteLength = getByteLength(compositeSize) * length;

      // We need to allocate an extra 8 bytes for the tag word, then make sure we write the length to it. We advance
      // the content pointer by 8 bytes so that it then points to the first list element as intended. Everything
      // starts off zeroed out so these nested structs don't need to be initialized in any way.
      c = list.segment.allocate(byteLength + 8);
      setStructPointer(length, compositeSize, c);
      break;
    }
    case ListElementSize.VOID: {
      // No need to allocate anything, we can write the list pointer right here.
      setListPointer(0, elementSize, length, list);
      return;
    }

    default: {
      throw new Error(format(PTR_INVALID_LIST_SIZE, elementSize));
    }
  }

  const res = initPointer(c.segment, c.byteOffset, list);

  setListPointer(
    res.offsetWords,
    elementSize,
    length,
    res.pointer,
    compositeSize,
  );
}
