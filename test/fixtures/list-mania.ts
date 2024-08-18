// This file has been automatically generated by capnp-es. 
import * as capnp from "capnp-es";
export const _capnpFileId = BigInt("0xb4dbefd56457c333");
export class ListMania extends capnp.Struct {
  static readonly _capnp = {
    displayName: "ListMania",
    id: "d0a988493b63e78b",
    size: new capnp.ObjectSize(0, 16)
  };
  static _CompositeList: capnp.ListCtor<ListManiaStruct>;
  adoptBoolList(value: capnp.Orphan<capnp.List<boolean>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(0, this));
  }
  disownBoolList(): capnp.Orphan<capnp.List<boolean>> {
    return capnp.Struct.disown(this.getBoolList());
  }
  getBoolList(): capnp.List<boolean> {
    return capnp.Struct.getList(0, capnp.BoolList, this);
  }
  hasBoolList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(0, this));
  }
  initBoolList(length: number): capnp.List<boolean> {
    return capnp.Struct.initList(0, capnp.BoolList, length, this);
  }
  setBoolList(value: capnp.List<boolean>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(0, this));
  }
  adoptCompositeList(value: capnp.Orphan<capnp.List<ListManiaStruct>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(1, this));
  }
  disownCompositeList(): capnp.Orphan<capnp.List<ListManiaStruct>> {
    return capnp.Struct.disown(this.getCompositeList());
  }
  getCompositeList(): capnp.List<ListManiaStruct> {
    return capnp.Struct.getList(1, ListMania._CompositeList, this);
  }
  hasCompositeList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(1, this));
  }
  initCompositeList(length: number): capnp.List<ListManiaStruct> {
    return capnp.Struct.initList(1, ListMania._CompositeList, length, this);
  }
  setCompositeList(value: capnp.List<ListManiaStruct>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(1, this));
  }
  adoptDataList(value: capnp.Orphan<capnp.List<capnp.Data>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(2, this));
  }
  disownDataList(): capnp.Orphan<capnp.List<capnp.Data>> {
    return capnp.Struct.disown(this.getDataList());
  }
  getDataList(): capnp.List<capnp.Data> {
    return capnp.Struct.getList(2, capnp.DataList, this);
  }
  hasDataList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(2, this));
  }
  initDataList(length: number): capnp.List<capnp.Data> {
    return capnp.Struct.initList(2, capnp.DataList, length, this);
  }
  setDataList(value: capnp.List<capnp.Data>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(2, this));
  }
  adoptFloat32List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(3, this));
  }
  disownFloat32List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getFloat32List());
  }
  getFloat32List(): capnp.List<number> {
    return capnp.Struct.getList(3, capnp.Float32List, this);
  }
  hasFloat32List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(3, this));
  }
  initFloat32List(length: number): capnp.List<number> {
    return capnp.Struct.initList(3, capnp.Float32List, length, this);
  }
  setFloat32List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(3, this));
  }
  adoptFloat64List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(4, this));
  }
  disownFloat64List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getFloat64List());
  }
  getFloat64List(): capnp.List<number> {
    return capnp.Struct.getList(4, capnp.Float64List, this);
  }
  hasFloat64List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(4, this));
  }
  initFloat64List(length: number): capnp.List<number> {
    return capnp.Struct.initList(4, capnp.Float64List, length, this);
  }
  setFloat64List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(4, this));
  }
  adoptInt8List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(5, this));
  }
  disownInt8List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getInt8List());
  }
  getInt8List(): capnp.List<number> {
    return capnp.Struct.getList(5, capnp.Int8List, this);
  }
  hasInt8List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(5, this));
  }
  initInt8List(length: number): capnp.List<number> {
    return capnp.Struct.initList(5, capnp.Int8List, length, this);
  }
  setInt8List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(5, this));
  }
  adoptInt16List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(6, this));
  }
  disownInt16List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getInt16List());
  }
  getInt16List(): capnp.List<number> {
    return capnp.Struct.getList(6, capnp.Int16List, this);
  }
  hasInt16List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(6, this));
  }
  initInt16List(length: number): capnp.List<number> {
    return capnp.Struct.initList(6, capnp.Int16List, length, this);
  }
  setInt16List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(6, this));
  }
  adoptInt32List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(7, this));
  }
  disownInt32List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getInt32List());
  }
  getInt32List(): capnp.List<number> {
    return capnp.Struct.getList(7, capnp.Int32List, this);
  }
  hasInt32List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(7, this));
  }
  initInt32List(length: number): capnp.List<number> {
    return capnp.Struct.initList(7, capnp.Int32List, length, this);
  }
  setInt32List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(7, this));
  }
  adoptInt64List(value: capnp.Orphan<capnp.List<bigint>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(8, this));
  }
  disownInt64List(): capnp.Orphan<capnp.List<bigint>> {
    return capnp.Struct.disown(this.getInt64List());
  }
  getInt64List(): capnp.List<bigint> {
    return capnp.Struct.getList(8, capnp.Int64List, this);
  }
  hasInt64List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(8, this));
  }
  initInt64List(length: number): capnp.List<bigint> {
    return capnp.Struct.initList(8, capnp.Int64List, length, this);
  }
  setInt64List(value: capnp.List<bigint>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(8, this));
  }
  adoptInterfaceList(value: capnp.Orphan<capnp.List<capnp.Interface>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(9, this));
  }
  disownInterfaceList(): capnp.Orphan<capnp.List<capnp.Interface>> {
    return capnp.Struct.disown(this.getInterfaceList());
  }
  getInterfaceList(): capnp.List<capnp.Interface> {
    return capnp.Struct.getList(9, capnp.InterfaceList, this);
  }
  hasInterfaceList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(9, this));
  }
  initInterfaceList(length: number): capnp.List<capnp.Interface> {
    return capnp.Struct.initList(9, capnp.InterfaceList, length, this);
  }
  setInterfaceList(value: capnp.List<capnp.Interface>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(9, this));
  }
  adoptTextList(value: capnp.Orphan<capnp.List<string>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(10, this));
  }
  disownTextList(): capnp.Orphan<capnp.List<string>> {
    return capnp.Struct.disown(this.getTextList());
  }
  getTextList(): capnp.List<string> {
    return capnp.Struct.getList(10, capnp.TextList, this);
  }
  hasTextList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(10, this));
  }
  initTextList(length: number): capnp.List<string> {
    return capnp.Struct.initList(10, capnp.TextList, length, this);
  }
  setTextList(value: capnp.List<string>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(10, this));
  }
  adoptUint8List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(11, this));
  }
  disownUint8List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getUint8List());
  }
  getUint8List(): capnp.List<number> {
    return capnp.Struct.getList(11, capnp.Uint8List, this);
  }
  hasUint8List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(11, this));
  }
  initUint8List(length: number): capnp.List<number> {
    return capnp.Struct.initList(11, capnp.Uint8List, length, this);
  }
  setUint8List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(11, this));
  }
  adoptUint16List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(12, this));
  }
  disownUint16List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getUint16List());
  }
  getUint16List(): capnp.List<number> {
    return capnp.Struct.getList(12, capnp.Uint16List, this);
  }
  hasUint16List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(12, this));
  }
  initUint16List(length: number): capnp.List<number> {
    return capnp.Struct.initList(12, capnp.Uint16List, length, this);
  }
  setUint16List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(12, this));
  }
  adoptUint32List(value: capnp.Orphan<capnp.List<number>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(13, this));
  }
  disownUint32List(): capnp.Orphan<capnp.List<number>> {
    return capnp.Struct.disown(this.getUint32List());
  }
  getUint32List(): capnp.List<number> {
    return capnp.Struct.getList(13, capnp.Uint32List, this);
  }
  hasUint32List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(13, this));
  }
  initUint32List(length: number): capnp.List<number> {
    return capnp.Struct.initList(13, capnp.Uint32List, length, this);
  }
  setUint32List(value: capnp.List<number>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(13, this));
  }
  adoptUint64List(value: capnp.Orphan<capnp.List<bigint>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(14, this));
  }
  disownUint64List(): capnp.Orphan<capnp.List<bigint>> {
    return capnp.Struct.disown(this.getUint64List());
  }
  getUint64List(): capnp.List<bigint> {
    return capnp.Struct.getList(14, capnp.Uint64List, this);
  }
  hasUint64List(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(14, this));
  }
  initUint64List(length: number): capnp.List<bigint> {
    return capnp.Struct.initList(14, capnp.Uint64List, length, this);
  }
  setUint64List(value: capnp.List<bigint>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(14, this));
  }
  adoptVoidList(value: capnp.Orphan<capnp.List<capnp.Void>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(15, this));
  }
  disownVoidList(): capnp.Orphan<capnp.List<capnp.Void>> {
    return capnp.Struct.disown(this.getVoidList());
  }
  getVoidList(): capnp.List<capnp.Void> {
    return capnp.Struct.getList(15, capnp.VoidList, this);
  }
  hasVoidList(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(15, this));
  }
  initVoidList(length: number): capnp.List<capnp.Void> {
    return capnp.Struct.initList(15, capnp.VoidList, length, this);
  }
  setVoidList(value: capnp.List<capnp.Void>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(15, this));
  }
  toString(): string {
    return "ListMania_" + super.toString();
  }
}
export class ListManiaInterface extends capnp.Struct {
  static readonly _capnp = {
    displayName: "ListManiaInterface",
    id: "8a94079c3c57204f",
    size: new capnp.ObjectSize(0, 0)
  };
  toString(): string {
    return "ListManiaInterface_" + super.toString();
  }
}
export class ListManiaStruct extends capnp.Struct {
  static readonly _capnp = {
    displayName: "ListManiaStruct",
    id: "9e1eb66286605522",
    size: new capnp.ObjectSize(0, 1)
  };
  adoptSelf(value: capnp.Orphan<ListMania>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(0, this));
  }
  disownSelf(): capnp.Orphan<ListMania> {
    return capnp.Struct.disown(this.getSelf());
  }
  getSelf(): ListMania {
    return capnp.Struct.getStruct(0, ListMania, this);
  }
  hasSelf(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(0, this));
  }
  initSelf(): ListMania {
    return capnp.Struct.initStructAt(0, ListMania, this);
  }
  setSelf(value: ListMania): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(0, this));
  }
  toString(): string {
    return "ListManiaStruct_" + super.toString();
  }
}
ListMania._CompositeList = capnp.CompositeList(ListManiaStruct);
