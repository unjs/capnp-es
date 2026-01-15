// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, describe, assert as t, afterEach, beforeEach } from "vitest";
import { Hash, HashFactory } from "test/fixtures/hash-factory";
import { SimpleInterface } from "test/fixtures/simple-interface";
import { createHash } from "node:crypto";
import { TestRPC } from "./rpc.utils";
import { bufferToHex } from "src/util.js";

describe("rpc", () => {
  let rpc: TestRPC;

  beforeEach(() => {
    rpc = new TestRPC();
  });

  afterEach(() => {
    rpc.close();
  });

  test("SimpleInterface", { timeout: 1000 }, async () => {
    const server = async () => {
      const s = await rpc.accept();
      s.initMain(SimpleInterface, {
        subtract: async (p, r) => {
          r.result = p.a - p.b;
        },
      });
      return s;
    };

    const client = async () => {
      const res = await rpc
        .connect()
        .bootstrap(SimpleInterface)
        .subtract((p) => {
          p.a = 9;
          p.b = -1;
        })
        .promise();
      return res.result;
    };

    const [, result] = await Promise.all([server(), client()]);
    t.equal(result, 10);
  });

  test("HashFactory", { timeout: 1000 }, async () => {
    const server = async () => {
      const s = await rpc.accept();
      s.initMain(HashFactory, {
        newSha1: async (_, r) => {
          const hash = createHash("sha1");
          const hs = new Hash.Server({
            async sum(_, r) {
              const digest = hash.digest();
              return r._initHash(digest.length).copyBuffer(digest);
            },

            write: (p) =>
              new Promise((resolve, reject) =>
                hash.write(p.data.toUint8Array(), "utf8", (err) =>
                  err ? reject(err) : resolve(),
                ),
              ),
          });
          r.hash = hs.client();
        },
      });
      return s;
    };

    const client = async () => {
      const hash = rpc.connect().bootstrap(HashFactory).newSha1().getHash();
      hash.write((p) => {
        const buf = new TextEncoder().encode("hello ");
        p._initData(buf.byteLength).copyBuffer(buf);
      });
      hash.write((p) => {
        const buf = new TextEncoder().encode("world");
        p._initData(buf.byteLength).copyBuffer(buf);
      });
      const sum = await hash.sum().promise();
      return sum.hash.toUint8Array();
    };

    const [, result] = await Promise.all([server(), client()]);
    t.equal(
      // @ts-expect-error
      bufferToHex(result),
      "[2a ae 6c 35 c9 4f cf b4 15 db e9 5f 40 8b 9c e9 1e e8 46 ed]",
    );
  });
});
