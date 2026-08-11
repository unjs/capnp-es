import { exec } from "node:child_process";
import { compileAll } from "capnp-es/compiler";
import { test, expect } from "vitest";

function compileCapnp(capnpFile: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    exec(
      `capnpc -o- ${capnpFile}`,
      { encoding: "buffer" },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.message, { cause: stderr }));
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

test("enum and union JSDoc comments are placed on the correct symbols", async () => {
  const stdout = await compileCapnp("test/fixtures/enum-jsdoc.capnp");

  const { files } = await compileAll(stdout, {
    ts: false,
    js: false,
    dts: true,
  });

  const dtsFile = [...files.entries()].find(([name]) => name.endsWith(".d.ts"));
  expect(dtsFile).toBeDefined();

  // Strip the leading import line to make the snapshot independent of the import alias
  const code = dtsFile![1].replace(/^import.*\n/, "");

  expect(code).toMatchInlineSnapshot(`
    "export declare const _capnpFileId = 12217693579146108794n;
    /**
    * The available colors.
    *
    */
    export declare const Color: {
        /**
    * Red color.
    *
    */
        readonly RED: 0;
        readonly GREEN: 1;
        /**
    * Blue color.
    *
    */
        readonly BLUE: 2;
    };
    export type Color = (typeof Color)[keyof typeof Color];
    /**
    * A named service.
    *
    */
    export declare const Service_Which: {
        /**
    * Catches missing union member.
    *
    */
        readonly UNSPECIFIED: 0;
        /**
    * A Worker.
    *
    */
        readonly WORKER: 1;
        readonly NETWORK: 2;
    };
    export type Service_Which = (typeof Service_Which)[keyof typeof Service_Which];
    /**
    * A named service.
    *
    */
    export declare class Service extends $.Struct {
        static readonly UNSPECIFIED: 0;
        static readonly WORKER: 1;
        static readonly NETWORK: 2;
        static readonly _capnp: {
            displayName: string;
            id: string;
            size: $.ObjectSize;
        };
        /**
    * Service name.
    *
    */
        get name(): string;
        set name(value: string);
        get _isUnspecified(): boolean;
        set unspecified(_: true);
        get _isWorker(): boolean;
        set worker(_: true);
        get _isNetwork(): boolean;
        set network(_: true);
        toString(): string;
        which(): Service_Which;
    }
    "
  `);
});
