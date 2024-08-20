// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, assert as t } from "vitest";
import * as capnp from "capnp-es";

import * as T from "../fixtures/test.ts";

const FLOAT_TOLERANCE = 0.000_001;

test("TestEnum", () => {
  t.equal(T.TestEnum.FOO, 0);
  t.equal(T.TestEnum.BAR, 1);
  t.equal(T.TestEnum.BAZ, 2);
  t.equal(T.TestEnum.QUX, 3);
  t.equal(T.TestEnum.QUUX, 4);
  t.equal(T.TestEnum.CORGE, 5);
  t.equal(T.TestEnum.GRAULT, 6);
  t.equal(T.TestEnum.GARPLY, 7);
});

test("TestAllTypes", () => {
  const allTypes = new capnp.Message().initRoot(T.TestAllTypes);

  allTypes.boolField = true;
  t.equal(allTypes.boolField, true);

  allTypes.int8Field = -8;
  t.equal(allTypes.int8Field, -8);

  allTypes.int16Field = -10_000;
  t.equal(allTypes.int16Field, -10_000);

  allTypes.int32Field = -1_000_000;
  t.equal(allTypes.int32Field, -1_000_000);

  allTypes.int64Field = BigInt(-0xc5_4c_72_d9);
  t.equal(allTypes.int64Field, BigInt(-0xc5_4c_72_d9));

  allTypes.uInt8Field = 8;
  t.equal(allTypes.uInt8Field, 8);

  allTypes.uInt16Field = 65_525;
  t.equal(allTypes.uInt16Field, 65_525);

  allTypes.uInt32Field = 99_999_999;
  t.equal(allTypes.uInt32Field, 99_999_999);

  allTypes.uInt64Field = BigInt(1_099_511_627_775);
  t.equal(allTypes.uInt64Field, BigInt(1_099_511_627_775));

  allTypes.float32Field = -9.999;
  t.ok(Math.abs(allTypes.float32Field - -9.999) < FLOAT_TOLERANCE);

  allTypes.float64Field = -999_999_999_999.9;
  t.ok(Math.abs(allTypes.float64Field - -999_999_999_999.9) < FLOAT_TOLERANCE);

  allTypes.textField = "text";
  t.equal(allTypes.textField, "text");

  allTypes.initStructField().int32Field = -999;
  t.equal(allTypes.structField.int32Field, -999);

  allTypes.enumField = T.TestEnum.CORGE;
  t.equal(allTypes.enumField, T.TestEnum.CORGE);

  allTypes.initVoidList(10);
  t.equal(allTypes.voidList.length, 10);

  allTypes.initBoolList(2).set(1, true);
  t.equal(allTypes.boolList.get(1), true);

  allTypes.initInt8List(3).set(2, -8);
  t.equal(allTypes.int8List.get(2), -8);

  allTypes.initInt16List(3).set(2, -88);
  t.equal(allTypes.int16List.get(2), -88);

  allTypes.initInt32List(3).set(2, -888);
  t.equal(allTypes.int32List.get(2), -888);

  allTypes.initInt64List(3).set(2, BigInt(-8888));
  t.equal(allTypes.int64List.get(2), BigInt(-8888));

  allTypes.initUInt8List(3).set(2, 8);
  t.equal(allTypes.uInt8List.get(2), 8);

  allTypes.initUInt16List(3).set(2, 88);
  t.equal(allTypes.uInt16List.get(2), 88);

  allTypes.initUInt32List(3).set(2, 888);
  t.equal(allTypes.uInt32List.get(2), 888);

  allTypes.initUInt64List(3).set(2, BigInt(8888));
  t.equal(allTypes.uInt64List.get(2), BigInt(8888));

  allTypes.initTextList(4).set(2, "hi");
  t.equal(allTypes.textList.get(2), "hi");

  allTypes.initStructList(3).get(1).uInt32Field = 9999;
  t.equal(allTypes.structList.get(1).uInt32Field, 9999);

  allTypes.initEnumList(2).set(1, T.TestEnum.FOO);
  t.equal(allTypes.enumList.get(1), T.TestEnum.FOO);
});
