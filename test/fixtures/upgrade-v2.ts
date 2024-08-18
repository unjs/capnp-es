// This file has been automatically generated by capnp-es. 
import * as capnp from "capnp-es";
export const _capnpFileId = BigInt("0xc81a48fa54bfdd1f");
export class Upgrade extends capnp.Struct {
  static readonly _capnp = {
    displayName: "Upgrade",
    id: "8fa95f1989e267fb",
    size: new capnp.ObjectSize(8, 4)
  };
  static _SelfReferences: capnp.ListCtor<Upgrade>;
  getLegacyName(): string {
    return capnp.Struct.getText(0, this);
  }
  setLegacyName(value: string): void {
    capnp.Struct.setText(0, value, this);
  }
  getLegacyId(): number {
    return capnp.Struct.getInt32(0, this);
  }
  setLegacyId(value: number): void {
    capnp.Struct.setInt32(0, value, this);
  }
  adoptSelfReference(value: capnp.Orphan<Upgrade>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(1, this));
  }
  disownSelfReference(): capnp.Orphan<Upgrade> {
    return capnp.Struct.disown(this.getSelfReference());
  }
  getSelfReference(): Upgrade {
    return capnp.Struct.getStruct(1, Upgrade, this);
  }
  hasSelfReference(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(1, this));
  }
  initSelfReference(): Upgrade {
    return capnp.Struct.initStructAt(1, Upgrade, this);
  }
  setSelfReference(value: Upgrade): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(1, this));
  }
  adoptSelfReferences(value: capnp.Orphan<capnp.List<Upgrade>>): void {
    capnp.Struct.adopt(value, capnp.Struct.getPointer(2, this));
  }
  disownSelfReferences(): capnp.Orphan<capnp.List<Upgrade>> {
    return capnp.Struct.disown(this.getSelfReferences());
  }
  getSelfReferences(): capnp.List<Upgrade> {
    return capnp.Struct.getList(2, Upgrade._SelfReferences, this);
  }
  hasSelfReferences(): boolean {
    return !capnp.Struct.isNull(capnp.Struct.getPointer(2, this));
  }
  initSelfReferences(length: number): capnp.List<Upgrade> {
    return capnp.Struct.initList(2, Upgrade._SelfReferences, length, this);
  }
  setSelfReferences(value: capnp.List<Upgrade>): void {
    capnp.Struct.copyFrom(value, capnp.Struct.getPointer(2, this));
  }
  getNewHotnessName(): string {
    return capnp.Struct.getText(3, this);
  }
  setNewHotnessName(value: string): void {
    capnp.Struct.setText(3, value, this);
  }
  getNewHotnessId(): number {
    return capnp.Struct.getInt32(4, this);
  }
  setNewHotnessId(value: number): void {
    capnp.Struct.setInt32(4, value, this);
  }
  toString(): string {
    return "Upgrade_" + super.toString();
  }
}
Upgrade._SelfReferences = capnp.CompositeList(Upgrade);
