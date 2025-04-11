// This file has been automatically generated by capnp-es.
import * as $ from "capnp-es";
export const _capnpFileId = BigInt("0xef1b5abe02e1f8d4");
export const Person_PhoneNumber_Type = {
  MOBILE: 0,
  HOME: 1,
  WORK: 2
} as const;
export type Person_PhoneNumber_Type = (typeof Person_PhoneNumber_Type)[keyof typeof Person_PhoneNumber_Type];
export class Person_PhoneNumber extends $.Struct {
  static readonly Type = Person_PhoneNumber_Type;
  static readonly _capnp = {
    displayName: "PhoneNumber",
    id: "af663da31c027e0e",
    size: new $.ObjectSize(8, 1),
    fields: ["number", "type"]
  };
  get number(): string {
    return $.utils.getText(0, this);
  }
  set number(value: string) {
    $.utils.setText(0, value, this);
  }
  get type(): Person_PhoneNumber_Type {
    return $.utils.getUint16(0, this) as Person_PhoneNumber_Type;
  }
  set type(value: Person_PhoneNumber_Type) {
    $.utils.setUint16(0, value, this);
  }
  toString(): string {
    return "Person_PhoneNumber_" + super.toString();
  }
}
export const Person_Employment_Which = {
  UNEMPLOYED: 0,
  EMPLOYER: 1,
  SCHOOL: 2,
  SELF_EMPLOYED: 3
} as const;
export type Person_Employment_Which = (typeof Person_Employment_Which)[keyof typeof Person_Employment_Which];
export class Person_Employment extends $.Struct {
  static readonly UNEMPLOYED = Person_Employment_Which.UNEMPLOYED;
  static readonly EMPLOYER = Person_Employment_Which.EMPLOYER;
  static readonly SCHOOL = Person_Employment_Which.SCHOOL;
  static readonly SELF_EMPLOYED = Person_Employment_Which.SELF_EMPLOYED;
  static readonly _capnp = {
    displayName: "employment",
    id: "e88780a90af3da0c",
    size: new $.ObjectSize(8, 4),
    fields: ["unemployed", "employer", "school", "selfEmployed"]
  };
  get _isUnemployed(): boolean {
    return $.utils.getUint16(4, this) === 0;
  }
  set unemployed(_: true) {
    $.utils.setUint16(4, 0, this);
  }
  get employer(): string {
    $.utils.testWhich("employer", $.utils.getUint16(4, this), 1, this);
    return $.utils.getText(3, this);
  }
  get _isEmployer(): boolean {
    return $.utils.getUint16(4, this) === 1;
  }
  set employer(value: string) {
    $.utils.setUint16(4, 1, this);
    $.utils.setText(3, value, this);
  }
  get school(): string {
    $.utils.testWhich("school", $.utils.getUint16(4, this), 2, this);
    return $.utils.getText(3, this);
  }
  get _isSchool(): boolean {
    return $.utils.getUint16(4, this) === 2;
  }
  set school(value: string) {
    $.utils.setUint16(4, 2, this);
    $.utils.setText(3, value, this);
  }
  get _isSelfEmployed(): boolean {
    return $.utils.getUint16(4, this) === 3;
  }
  set selfEmployed(_: true) {
    $.utils.setUint16(4, 3, this);
  }
  toString(): string {
    return "Person_Employment_" + super.toString();
  }
  which(): Person_Employment_Which {
    return $.utils.getUint16(4, this) as Person_Employment_Which;
  }
}
export class Person extends $.Struct {
  static readonly PhoneNumber = Person_PhoneNumber;
  static readonly _capnp = {
    displayName: "Person",
    id: "d94307c4985be8e7",
    size: new $.ObjectSize(8, 4),
    fields: ["id", "name", "email", "phones", "employment"]
  };
  static _Phones: $.ListCtor<Person_PhoneNumber>;
  get id(): number {
    return $.utils.getUint32(0, this);
  }
  set id(value: number) {
    $.utils.setUint32(0, value, this);
  }
  get name(): string {
    return $.utils.getText(0, this);
  }
  set name(value: string) {
    $.utils.setText(0, value, this);
  }
  get email(): string {
    return $.utils.getText(1, this);
  }
  set email(value: string) {
    $.utils.setText(1, value, this);
  }
  _adoptPhones(value: $.Orphan<$.List<Person_PhoneNumber>>): void {
    $.utils.adopt(value, $.utils.getPointer(2, this));
  }
  _disownPhones(): $.Orphan<$.List<Person_PhoneNumber>> {
    return $.utils.disown(this.phones);
  }
  get phones(): $.List<Person_PhoneNumber> {
    return $.utils.getList(2, Person._Phones, this);
  }
  _hasPhones(): boolean {
    return !$.utils.isNull($.utils.getPointer(2, this));
  }
  _initPhones(length: number): $.List<Person_PhoneNumber> {
    return $.utils.initList(2, Person._Phones, length, this);
  }
  set phones(value: $.List<Person_PhoneNumber>) {
    $.utils.copyFrom(value, $.utils.getPointer(2, this));
  }
  get employment(): Person_Employment {
    return $.utils.getAs(Person_Employment, this);
  }
  _initEmployment(): Person_Employment {
    return $.utils.getAs(Person_Employment, this);
  }
  toString(): string {
    return "Person_" + super.toString();
  }
}
export class AddressBook extends $.Struct {
  static readonly _capnp = {
    displayName: "AddressBook",
    id: "c06ea6d038a357bb",
    size: new $.ObjectSize(0, 1),
    fields: ["people"]
  };
  static _People: $.ListCtor<Person>;
  _adoptPeople(value: $.Orphan<$.List<Person>>): void {
    $.utils.adopt(value, $.utils.getPointer(0, this));
  }
  _disownPeople(): $.Orphan<$.List<Person>> {
    return $.utils.disown(this.people);
  }
  get people(): $.List<Person> {
    return $.utils.getList(0, AddressBook._People, this);
  }
  _hasPeople(): boolean {
    return !$.utils.isNull($.utils.getPointer(0, this));
  }
  _initPeople(length: number): $.List<Person> {
    return $.utils.initList(0, AddressBook._People, length, this);
  }
  set people(value: $.List<Person>) {
    $.utils.copyFrom(value, $.utils.getPointer(0, this));
  }
  toString(): string {
    return "AddressBook_" + super.toString();
  }
}
Person._Phones = $.CompositeList(Person_PhoneNumber);
AddressBook._People = $.CompositeList(Person);
