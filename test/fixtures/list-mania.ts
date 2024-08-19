// This file has been automatically generated by capnp-es. 
import * as $ from "capnp-es";
export const _capnpFileId = BigInt("0xb4dbefd56457c333");
export class ListMania extends $.Struct {
  static readonly _capnp = {
    displayName: "ListMania",
    id: "d0a988493b63e78b",
    size: new $.ObjectSize(0, 16)
  };
  static _CompositeList: $.ListCtor<ListManiaStruct>;
  adoptBoolList(value: $.Orphan<$.List<boolean>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(0, this));
  }
  disownBoolList(): $.Orphan<$.List<boolean>> {
    return $.Struct.disown(this.boolList);
  }
  get boolList(): $.List<boolean> {
    return $.Struct.getList(0, $.BoolList, this);
  }
  hasBoolList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(0, this));
  }
  initBoolList(length: number): $.List<boolean> {
    return $.Struct.initList(0, $.BoolList, length, this);
  }
  set boolList(value: $.List<boolean>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(0, this));
  }
  adoptCompositeList(value: $.Orphan<$.List<ListManiaStruct>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(1, this));
  }
  disownCompositeList(): $.Orphan<$.List<ListManiaStruct>> {
    return $.Struct.disown(this.compositeList);
  }
  get compositeList(): $.List<ListManiaStruct> {
    return $.Struct.getList(1, ListMania._CompositeList, this);
  }
  hasCompositeList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(1, this));
  }
  initCompositeList(length: number): $.List<ListManiaStruct> {
    return $.Struct.initList(1, ListMania._CompositeList, length, this);
  }
  set compositeList(value: $.List<ListManiaStruct>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(1, this));
  }
  adoptDataList(value: $.Orphan<$.List<$.Data>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(2, this));
  }
  disownDataList(): $.Orphan<$.List<$.Data>> {
    return $.Struct.disown(this.dataList);
  }
  get dataList(): $.List<$.Data> {
    return $.Struct.getList(2, $.DataList, this);
  }
  hasDataList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(2, this));
  }
  initDataList(length: number): $.List<$.Data> {
    return $.Struct.initList(2, $.DataList, length, this);
  }
  set dataList(value: $.List<$.Data>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(2, this));
  }
  adoptFloat32List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(3, this));
  }
  disownFloat32List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.float32List);
  }
  get float32List(): $.List<number> {
    return $.Struct.getList(3, $.Float32List, this);
  }
  hasFloat32List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(3, this));
  }
  initFloat32List(length: number): $.List<number> {
    return $.Struct.initList(3, $.Float32List, length, this);
  }
  set float32List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(3, this));
  }
  adoptFloat64List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(4, this));
  }
  disownFloat64List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.float64List);
  }
  get float64List(): $.List<number> {
    return $.Struct.getList(4, $.Float64List, this);
  }
  hasFloat64List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(4, this));
  }
  initFloat64List(length: number): $.List<number> {
    return $.Struct.initList(4, $.Float64List, length, this);
  }
  set float64List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(4, this));
  }
  adoptInt8List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(5, this));
  }
  disownInt8List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.int8List);
  }
  get int8List(): $.List<number> {
    return $.Struct.getList(5, $.Int8List, this);
  }
  hasInt8List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(5, this));
  }
  initInt8List(length: number): $.List<number> {
    return $.Struct.initList(5, $.Int8List, length, this);
  }
  set int8List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(5, this));
  }
  adoptInt16List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(6, this));
  }
  disownInt16List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.int16List);
  }
  get int16List(): $.List<number> {
    return $.Struct.getList(6, $.Int16List, this);
  }
  hasInt16List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(6, this));
  }
  initInt16List(length: number): $.List<number> {
    return $.Struct.initList(6, $.Int16List, length, this);
  }
  set int16List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(6, this));
  }
  adoptInt32List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(7, this));
  }
  disownInt32List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.int32List);
  }
  get int32List(): $.List<number> {
    return $.Struct.getList(7, $.Int32List, this);
  }
  hasInt32List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(7, this));
  }
  initInt32List(length: number): $.List<number> {
    return $.Struct.initList(7, $.Int32List, length, this);
  }
  set int32List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(7, this));
  }
  adoptInt64List(value: $.Orphan<$.List<bigint>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(8, this));
  }
  disownInt64List(): $.Orphan<$.List<bigint>> {
    return $.Struct.disown(this.int64List);
  }
  get int64List(): $.List<bigint> {
    return $.Struct.getList(8, $.Int64List, this);
  }
  hasInt64List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(8, this));
  }
  initInt64List(length: number): $.List<bigint> {
    return $.Struct.initList(8, $.Int64List, length, this);
  }
  set int64List(value: $.List<bigint>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(8, this));
  }
  adoptInterfaceList(value: $.Orphan<$.List<ListManiaInterface>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(9, this));
  }
  disownInterfaceList(): $.Orphan<$.List<ListManiaInterface>> {
    return $.Struct.disown(this.interfaceList);
  }
  get interfaceList(): $.List<ListManiaInterface> {
    return $.Struct.getList(9, $.InterfaceList, this);
  }
  hasInterfaceList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(9, this));
  }
  initInterfaceList(length: number): $.List<ListManiaInterface> {
    return $.Struct.initList(9, $.InterfaceList, length, this);
  }
  set interfaceList(value: $.List<ListManiaInterface>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(9, this));
  }
  adoptTextList(value: $.Orphan<$.List<string>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(10, this));
  }
  disownTextList(): $.Orphan<$.List<string>> {
    return $.Struct.disown(this.textList);
  }
  get textList(): $.List<string> {
    return $.Struct.getList(10, $.TextList, this);
  }
  hasTextList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(10, this));
  }
  initTextList(length: number): $.List<string> {
    return $.Struct.initList(10, $.TextList, length, this);
  }
  set textList(value: $.List<string>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(10, this));
  }
  adoptUint8List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(11, this));
  }
  disownUint8List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.uint8List);
  }
  get uint8List(): $.List<number> {
    return $.Struct.getList(11, $.Uint8List, this);
  }
  hasUint8List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(11, this));
  }
  initUint8List(length: number): $.List<number> {
    return $.Struct.initList(11, $.Uint8List, length, this);
  }
  set uint8List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(11, this));
  }
  adoptUint16List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(12, this));
  }
  disownUint16List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.uint16List);
  }
  get uint16List(): $.List<number> {
    return $.Struct.getList(12, $.Uint16List, this);
  }
  hasUint16List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(12, this));
  }
  initUint16List(length: number): $.List<number> {
    return $.Struct.initList(12, $.Uint16List, length, this);
  }
  set uint16List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(12, this));
  }
  adoptUint32List(value: $.Orphan<$.List<number>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(13, this));
  }
  disownUint32List(): $.Orphan<$.List<number>> {
    return $.Struct.disown(this.uint32List);
  }
  get uint32List(): $.List<number> {
    return $.Struct.getList(13, $.Uint32List, this);
  }
  hasUint32List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(13, this));
  }
  initUint32List(length: number): $.List<number> {
    return $.Struct.initList(13, $.Uint32List, length, this);
  }
  set uint32List(value: $.List<number>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(13, this));
  }
  adoptUint64List(value: $.Orphan<$.List<bigint>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(14, this));
  }
  disownUint64List(): $.Orphan<$.List<bigint>> {
    return $.Struct.disown(this.uint64List);
  }
  get uint64List(): $.List<bigint> {
    return $.Struct.getList(14, $.Uint64List, this);
  }
  hasUint64List(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(14, this));
  }
  initUint64List(length: number): $.List<bigint> {
    return $.Struct.initList(14, $.Uint64List, length, this);
  }
  set uint64List(value: $.List<bigint>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(14, this));
  }
  adoptVoidList(value: $.Orphan<$.List<$.Void>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(15, this));
  }
  disownVoidList(): $.Orphan<$.List<$.Void>> {
    return $.Struct.disown(this.voidList);
  }
  get voidList(): $.List<$.Void> {
    return $.Struct.getList(15, $.VoidList, this);
  }
  hasVoidList(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(15, this));
  }
  initVoidList(length: number): $.List<$.Void> {
    return $.Struct.initList(15, $.VoidList, length, this);
  }
  set voidList(value: $.List<$.Void>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(15, this));
  }
  toString(): string {
    return "ListMania_" + super.toString();
  }
}
export class ListManiaInterface_GetListMania$Params extends $.Struct {
  static readonly _capnp = {
    displayName: "getListMania$Params",
    id: "f7bf50e8ad110566",
    size: new $.ObjectSize(0, 0)
  };
  toString(): string {
    return "ListManiaInterface_GetListMania$Params_" + super.toString();
  }
}
export class ListManiaInterface_GetListMania$Results extends $.Struct {
  static readonly _capnp = {
    displayName: "getListMania$Results",
    id: "e89af40dc5417fee",
    size: new $.ObjectSize(0, 1)
  };
  adoptResult(value: $.Orphan<$.List<ListManiaInterface>>): void {
    $.Struct.adopt(value, $.Struct.getPointer(0, this));
  }
  disownResult(): $.Orphan<$.List<ListManiaInterface>> {
    return $.Struct.disown(this.result);
  }
  get result(): $.List<ListManiaInterface> {
    return $.Struct.getList(0, $.InterfaceList, this);
  }
  hasResult(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(0, this));
  }
  initResult(length: number): $.List<ListManiaInterface> {
    return $.Struct.initList(0, $.InterfaceList, length, this);
  }
  set result(value: $.List<ListManiaInterface>) {
    $.Struct.copyFrom(value, $.Struct.getPointer(0, this));
  }
  toString(): string {
    return "ListManiaInterface_GetListMania$Results_" + super.toString();
  }
}
export class ListManiaInterface_GetListMania$Results$Promise {
  pipeline: $.Pipeline<any, any, ListManiaInterface_GetListMania$Results>;
  constructor(pipeline: $.Pipeline<any, any, ListManiaInterface_GetListMania$Results>) {
    this.pipeline = pipeline;
  }
  async promise(): Promise<ListManiaInterface_GetListMania$Results> {
    return await this.pipeline.struct();
  }
}
export class ListManiaInterface$Client {
  client: $.Client;
  static readonly interfaceId: bigint = BigInt("0x8a94079c3c57204f");
  constructor(client: $.Client) {
    this.client = client;
  }
  static readonly methods: [
    $.Method<ListManiaInterface_GetListMania$Params, ListManiaInterface_GetListMania$Results>
  ] = [
    {
      ParamsClass: ListManiaInterface_GetListMania$Params,
      ResultsClass: ListManiaInterface_GetListMania$Results,
      interfaceId: ListManiaInterface$Client.interfaceId,
      methodId: 0,
      interfaceName: "test/fixtures/list-mania.capnp:ListManiaInterface",
      methodName: "getListMania"
    }
  ];
  getListMania(paramsFunc?: (params: ListManiaInterface_GetListMania$Params) => void): ListManiaInterface_GetListMania$Results$Promise {
    const answer = this.client.call({
      method: ListManiaInterface$Client.methods[0],
      paramsFunc: paramsFunc
    });
    const pipeline = new $.Pipeline(ListManiaInterface_GetListMania$Results, answer);
    return new ListManiaInterface_GetListMania$Results$Promise(pipeline);
  }
}
$.Registry.register(ListManiaInterface$Client.interfaceId, ListManiaInterface$Client);
export interface ListManiaInterface$Server$Target {
  getListMania(params: ListManiaInterface_GetListMania$Params, results: ListManiaInterface_GetListMania$Results): Promise<void>;
}
export class ListManiaInterface$Server extends $.Server {
  readonly target: ListManiaInterface$Server$Target;
  constructor(target: ListManiaInterface$Server$Target) {
    super(target, [
      {
        ...ListManiaInterface$Client.methods[0],
        impl: target.getListMania
      }
    ]);
    this.target = target;
  }
  client(): ListManiaInterface$Client { return new ListManiaInterface$Client(this); }
}
export class ListManiaInterface extends $.Interface {
  static readonly Client = ListManiaInterface$Client;
  static readonly Server = ListManiaInterface$Server;
  static readonly _capnp = {
    displayName: "ListManiaInterface",
    id: "8a94079c3c57204f",
    size: new $.ObjectSize(0, 0)
  };
  toString(): string {
    return "ListManiaInterface_" + super.toString();
  }
}
export class ListManiaStruct extends $.Struct {
  static readonly _capnp = {
    displayName: "ListManiaStruct",
    id: "9e1eb66286605522",
    size: new $.ObjectSize(0, 1)
  };
  adoptSelf(value: $.Orphan<ListMania>): void {
    $.Struct.adopt(value, $.Struct.getPointer(0, this));
  }
  disownSelf(): $.Orphan<ListMania> {
    return $.Struct.disown(this.self);
  }
  get self(): ListMania {
    return $.Struct.getStruct(0, ListMania, this);
  }
  hasSelf(): boolean {
    return !$.Struct.isNull($.Struct.getPointer(0, this));
  }
  initSelf(): ListMania {
    return $.Struct.initStructAt(0, ListMania, this);
  }
  set self(value: ListMania) {
    $.Struct.copyFrom(value, $.Struct.getPointer(0, this));
  }
  toString(): string {
    return "ListManiaStruct_" + super.toString();
  }
}
ListMania._CompositeList = $.CompositeList(ListManiaStruct);
