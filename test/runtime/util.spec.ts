// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, assert as t } from "vitest";
import * as C from "src/constants";
// import { RANGE_INVALID_UTF8 } from "src/errors";
import * as util from "src/util";

test("bufferToHex()", () => {
  t.equal(
    util.bufferToHex(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]).buffer),
    "[aa bb cc dd]",
  );
});

test("checkInt32()", () => {
  t.throws(() => util.checkInt32(0xff_ff_ff_ff));

  t.throws(() => util.checkInt32(-0xff_ff_ff_ff));

  t.doesNotThrow(() => util.checkInt32(0x7f_ff_ff_ff));

  t.doesNotThrow(() => util.checkInt32(-0x7f_ff_ff_ff));
});

test("checkUint32()", () => {
  t.throws(() => util.checkUint32(0xff_ff_ff_ff + 1));

  t.throws(() => util.checkUint32(-1));

  t.doesNotThrow(() => util.checkUint32(0xff_ff_ff_ff));

  t.doesNotThrow(() => util.checkUint32(0));
});

test("dumpBuffer()", () => {
  const buf1 = new Uint8Array(64);

  // Gratuitous? Yes. Awesome? Yes.

  for (let i = 0; i < 11; i++) buf1[i + 1] = "Cap'n Proto".charCodeAt(i);
  for (let i = 0; i < 11; i++) buf1[i + 19] = "Cap'n Proto".charCodeAt(i);
  buf1[0x10] = 0x11;
  buf1[0x11] = 0x05;

  t.equal(
    util.dumpBuffer(buf1),
    `
=== buffer[64] ===
00000000: 00 43 61 70 27 6e 20 50  72 6f 74 6f 00 00 00 00    ·Cap'n Proto····
00000010: 11 05 00 43 61 70 27 6e  20 50 72 6f 74 6f 00 00    ···Cap'n Proto··
00000020: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
00000030: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
`,
  );

  const buf2Length = C.MAX_BUFFER_DUMP_BYTES + 16;
  const buf2 = new Uint8Array(buf2Length);
  let buf2Wanted = `\n=== buffer[${C.MAX_BUFFER_DUMP_BYTES}] ===`;

  for (let i = 0; i < C.MAX_BUFFER_DUMP_BYTES / 16; i++) {
    buf2Wanted += `\n${util.pad(
      (i * 16).toString(16),
      8,
    )}: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················`;
  }

  buf2Wanted += "\n=== (truncated 16 bytes) ===\n";

  t.equal(util.dumpBuffer(buf2), buf2Wanted);
  t.equal(util.dumpBuffer(buf2.buffer), buf2Wanted);
});

test("format()", () => {
  t.equal(util.format("%a", 0x0d_a0_be_ef), "0x0da0beef");
  t.equal(util.format("%b", 0b1010_1010), "10101010");
  t.equal(util.format("%c", 33), "!");
  t.equal(util.format("%c", "!"), "!");
  t.equal(util.format("%d", 777), "777");
  t.equal(util.format("%f", 777.777_777), "777.777777");
  t.equal(util.format("%.2f", 0.771), ".77");
  t.equal(util.format("%0.3f", 0.7777), "0.778");
  t.equal(util.format("%j", { a: "b" }), '{"a":"b"}');
  t.equal(util.format("%o", Number.parseInt("777", 8)), "0777");
  t.equal(util.format("%s", { toString: () => "test" }), "test");
  t.equal(util.format("%x", 0x0b_ad_be_ef), "0xbadbeef");
  t.equal(util.format("%X", 0x0b_ad_be_ef), "0xBADBEEF");
  t.equal(util.format("%z", "verbatim"), "z");
  t.equal(util.format("hi"), "hi");
});

test("pad()", () => {
  t.equal(util.pad("0", 8), "00000000");
  t.equal(util.pad("0", 8, "="), "=======0");
  t.equal(util.pad("000000000", 8), "000000000");
});

test("padToWord()", () => {
  t.equal(util.padToWord(7), 8);
  t.equal(util.padToWord(0), 0);
  t.equal(util.padToWord(9), 16);
});
