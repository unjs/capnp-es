// This file has been automatically generated by capnp-es.
import * as $ from "capnp-es";
export const _capnpFileId = BigInt("0xe0b7ff464fbc7ee2");
export class Foo extends $.Struct {
  static readonly _capnp = {
    displayName: "Foo",
    id: "ebf41ad8c4cd4576",
    size: new $.ObjectSize(0, 2),
  };
  get bar(): string {
    return $.utils.getText(0, this);
  }
  set bar(value: string) {
    $.utils.setText(0, value, this);
  }
  get baz(): string {
    return $.utils.getText(1, this);
  }
  set baz(value: string) {
    $.utils.setText(1, value, this);
  }
  toString(): string { return "Foo_" + super.toString(); }
}
