// This file has been automatically generated by capnp-es.
import * as $ from "capnp-es";
import { Node, Node_Parameter, Node_NestedNode, Field, Enumerant, Superclass, Method, Type, Brand, Brand_Scope, Brand_Binding, Value, Annotation, ElementSize } from "capnp-es/capnp/schema";
import { TestImport } from "./test-import.js";
import { TestEnum, TestAllTypes, TestDefaults, TestAnyPointer, TestAnyOthers, TestOutOfOrder, TestUnion, TestUnnamedUnion, TestUnionInUnion, TestGroups, TestInterleavedGroups, TestUnionDefaults, TestNestedTypes, TestNestedTypes_NestedEnum, TestNestedTypes_NestedStruct, TestNestedTypes_NestedStruct_NestedEnum, TestUsing, TestLists, TestLists_Struct0, TestLists_Struct1, TestLists_Struct8, TestLists_Struct16, TestLists_Struct32, TestLists_Struct64, TestLists_StructP, TestLists_Struct0c, TestLists_Struct1c, TestLists_Struct8c, TestLists_Struct16c, TestLists_Struct32c, TestLists_Struct64c, TestLists_StructPc, TestFieldZeroIsBit, TestListDefaults, TestLateUnion, TestOldVersion, TestNewVersion, TestOldUnionVersion, TestNewUnionVersion, TestStructUnion, TestStructUnion_SomeStruct, TestPrintInlineStructs, TestPrintInlineStructs_InlineStruct, TestWholeFloatDefault, TestGenerics, TestGenerics_Inner, TestGenerics_Inner2, TestGenerics_Inner2_DeepNest, TestGenerics_UseAliases, TestGenericsWrapper, TestGenericsWrapper2, TestGenericsUnion, TestUseGenerics, TestEmptyStruct, TestConstants, TestAnyPointerConstants, TestPipeline_Box, TestPipeline_AnyBox, TestTailCallee_TailResult, TestMembrane_Result, TestContainMembrane, TestContructorName, TestTransferCap, TestTransferCap_Element, TestSturdyRef, TestSturdyRefHostId, TestSturdyRefObjectId, TestSturdyRefObjectId_Tag, TestProvisionId, TestRecipientId, TestThirdPartyCapId, TestJoinResult, TestNameAnnotation, TestNameAnnotation_BadlyNamedEnum, TestNameAnnotation_NestedStruct, TestNameAnnotation_NestedStruct_DeeplyNestedEnum } from "./test.js";
export const _capnpFileId = BigInt("0xc64a3bf0338a124a");
export class TestImport2 extends $.Struct {
  static readonly _capnp = {
    displayName: "TestImport2",
    id: "f6bd77f100ecb0ff",
    size: new $.ObjectSize(8, 7),
  };
  _adoptFoo(value: $.Orphan<TestAllTypes>): void {
    $.utils.adopt(value, $.utils.getPointer(0, this));
  }
  _disownFoo(): $.Orphan<TestAllTypes> {
    return $.utils.disown(this.foo);
  }
  get foo(): TestAllTypes {
    return $.utils.getStruct(0, TestAllTypes, this);
  }
  _hasFoo(): boolean {
    return !$.utils.isNull($.utils.getPointer(0, this));
  }
  _initFoo(): TestAllTypes {
    return $.utils.initStructAt(0, TestAllTypes, this);
  }
  set foo(value: TestAllTypes) {
    $.utils.copyFrom(value, $.utils.getPointer(0, this));
  }
  _adoptBar(value: $.Orphan<Node>): void {
    $.utils.adopt(value, $.utils.getPointer(1, this));
  }
  _disownBar(): $.Orphan<Node> {
    return $.utils.disown(this.bar);
  }
  get bar(): Node {
    return $.utils.getStruct(1, Node, this);
  }
  _hasBar(): boolean {
    return !$.utils.isNull($.utils.getPointer(1, this));
  }
  _initBar(): Node {
    return $.utils.initStructAt(1, Node, this);
  }
  set bar(value: Node) {
    $.utils.copyFrom(value, $.utils.getPointer(1, this));
  }
  _adoptBaz(value: $.Orphan<TestImport>): void {
    $.utils.adopt(value, $.utils.getPointer(2, this));
  }
  _disownBaz(): $.Orphan<TestImport> {
    return $.utils.disown(this.baz);
  }
  get baz(): TestImport {
    return $.utils.getStruct(2, TestImport, this);
  }
  _hasBaz(): boolean {
    return !$.utils.isNull($.utils.getPointer(2, this));
  }
  _initBaz(): TestImport {
    return $.utils.initStructAt(2, TestImport, this);
  }
  set baz(value: TestImport) {
    $.utils.copyFrom(value, $.utils.getPointer(2, this));
  }
  _adoptBox(value: $.Orphan<Node_Parameter>): void {
    $.utils.adopt(value, $.utils.getPointer(3, this));
  }
  _disownBox(): $.Orphan<Node_Parameter> {
    return $.utils.disown(this.box);
  }
  get box(): Node_Parameter {
    return $.utils.getStruct(3, Node_Parameter, this);
  }
  _hasBox(): boolean {
    return !$.utils.isNull($.utils.getPointer(3, this));
  }
  _initBox(): Node_Parameter {
    return $.utils.initStructAt(3, Node_Parameter, this);
  }
  set box(value: Node_Parameter) {
    $.utils.copyFrom(value, $.utils.getPointer(3, this));
  }
  _adoptBee(value: $.Orphan<Node_NestedNode>): void {
    $.utils.adopt(value, $.utils.getPointer(4, this));
  }
  _disownBee(): $.Orphan<Node_NestedNode> {
    return $.utils.disown(this.bee);
  }
  get bee(): Node_NestedNode {
    return $.utils.getStruct(4, Node_NestedNode, this);
  }
  _hasBee(): boolean {
    return !$.utils.isNull($.utils.getPointer(4, this));
  }
  _initBee(): Node_NestedNode {
    return $.utils.initStructAt(4, Node_NestedNode, this);
  }
  set bee(value: Node_NestedNode) {
    $.utils.copyFrom(value, $.utils.getPointer(4, this));
  }
  _adoptBok(value: $.Orphan<Brand_Scope>): void {
    $.utils.adopt(value, $.utils.getPointer(5, this));
  }
  _disownBok(): $.Orphan<Brand_Scope> {
    return $.utils.disown(this.bok);
  }
  get bok(): Brand_Scope {
    return $.utils.getStruct(5, Brand_Scope, this);
  }
  _hasBok(): boolean {
    return !$.utils.isNull($.utils.getPointer(5, this));
  }
  _initBok(): Brand_Scope {
    return $.utils.initStructAt(5, Brand_Scope, this);
  }
  set bok(value: Brand_Scope) {
    $.utils.copyFrom(value, $.utils.getPointer(5, this));
  }
  _adoptBip(value: $.Orphan<Brand_Binding>): void {
    $.utils.adopt(value, $.utils.getPointer(6, this));
  }
  _disownBip(): $.Orphan<Brand_Binding> {
    return $.utils.disown(this.bip);
  }
  get bip(): Brand_Binding {
    return $.utils.getStruct(6, Brand_Binding, this);
  }
  _hasBip(): boolean {
    return !$.utils.isNull($.utils.getPointer(6, this));
  }
  _initBip(): Brand_Binding {
    return $.utils.initStructAt(6, Brand_Binding, this);
  }
  set bip(value: Brand_Binding) {
    $.utils.copyFrom(value, $.utils.getPointer(6, this));
  }
  get bep(): ElementSize {
    return $.utils.getUint16(0, this) as ElementSize;
  }
  set bep(value: ElementSize) {
    $.utils.setUint16(0, value, this);
  }
  toString(): string { return "TestImport2_" + super.toString(); }
}
