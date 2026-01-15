import * as $ from "capnp-es";
export declare const _capnpFileId = 17229464571574614228n;
export declare const Person_PhoneNumber_Type: {
  readonly MOBILE: 0;
  readonly HOME: 1;
  readonly WORK: 2;
};
export type Person_PhoneNumber_Type = (typeof Person_PhoneNumber_Type)[keyof typeof Person_PhoneNumber_Type];
export declare class Person_PhoneNumber extends $.Struct {
  static readonly Type: {
    readonly MOBILE: 0;
    readonly HOME: 1;
    readonly WORK: 2;
  };
  static readonly _capnp: {
    displayName: string;
    id: string;
    size: $.ObjectSize;
  };
  get number(): string;
  set number(value: string);
  get type(): Person_PhoneNumber_Type;
  set type(value: Person_PhoneNumber_Type);
  toString(): string;
}
export declare const Person_Employment_Which: {
  readonly UNEMPLOYED: 0;
  readonly EMPLOYER: 1;
  readonly SCHOOL: 2;
  /**
* We assume that a person is only one of these.
*
*/
  readonly SELF_EMPLOYED: 3;
};
export type Person_Employment_Which = (typeof Person_Employment_Which)[keyof typeof Person_Employment_Which];
export declare class Person_Employment extends $.Struct {
  static readonly UNEMPLOYED: 0;
  static readonly EMPLOYER: 1;
  static readonly SCHOOL: 2;
  static readonly SELF_EMPLOYED: 3;
  static readonly _capnp: {
    displayName: string;
    id: string;
    size: $.ObjectSize;
  };
  get _isUnemployed(): boolean;
  set unemployed(_: true);
  get employer(): string;
  get _isEmployer(): boolean;
  set employer(value: string);
  get school(): string;
  get _isSchool(): boolean;
  set school(value: string);
  get _isSelfEmployed(): boolean;
  set selfEmployed(_: true);
  toString(): string;
  which(): Person_Employment_Which;
}
export declare class Person extends $.Struct {
  static readonly PhoneNumber: typeof Person_PhoneNumber;
  static readonly _capnp: {
    displayName: string;
    id: string;
    size: $.ObjectSize;
  };
  static _Phones: $.ListCtor<Person_PhoneNumber>;
  get id(): number;
  set id(value: number);
  get name(): string;
  set name(value: string);
  get email(): string;
  set email(value: string);
  _adoptPhones(value: $.Orphan<$.List<Person_PhoneNumber>>): void;
  _disownPhones(): $.Orphan<$.List<Person_PhoneNumber>>;
  get phones(): $.List<Person_PhoneNumber>;
  _hasPhones(): boolean;
  _initPhones(length: number): $.List<Person_PhoneNumber>;
  set phones(value: $.List<Person_PhoneNumber>);
  get employment(): Person_Employment;
  _initEmployment(): Person_Employment;
  toString(): string;
}
export declare class AddressBook extends $.Struct {
  static readonly _capnp: {
    displayName: string;
    id: string;
    size: $.ObjectSize;
  };
  static _People: $.ListCtor<Person>;
  _adoptPeople(value: $.Orphan<$.List<Person>>): void;
  _disownPeople(): $.Orphan<$.List<Person>>;
  get people(): $.List<Person>;
  _hasPeople(): boolean;
  _initPeople(length: number): $.List<Person>;
  set people(value: $.List<Person>);
  toString(): string;
}
