// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, assert as t } from "vitest";
import * as capnp from "capnp-es";

import { BigIntBag } from "../fixtures/bigintbag.ts";

test("64 bit with bigint support", () => {
  const message = new capnp.Message();
  const b = message.initRoot(BigIntBag);
  const unsigned = 999_999n;
  const signed = -999_999n;

  t.equal(b.signed, 0n);
  t.equal(b.unsigned, 0n);
  t.equal(b.defaultSigned, -987_654_321_987_654_321n);
  t.equal(b.defaultUnsigned, 987_654_321_987_654_321n);

  b.signed = signed;
  b.unsigned = unsigned;
  b.defaultSigned = signed;
  b.defaultUnsigned = unsigned;

  t.equal(b.unsigned, unsigned);
  t.equal(b.signed, signed);
  t.equal(b.defaultSigned, signed);
  t.equal(b.defaultUnsigned, unsigned);
});
