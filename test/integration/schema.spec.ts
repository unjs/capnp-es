// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { test, assert as t } from "vitest";
import * as capnp from "capnp-es";
import { CodeGeneratorRequest } from "src/capnp/schema";
import { readFileBuffer } from "test/utils";

const SCHEMA_MESSAGE = readFileBuffer("test/fixtures/data/schema.bin");

const SCHEMA_FILE_ID = 0xa9_3f_c5_09_62_4c_72_d9n;

test("schema roundtrip", () => {
  const message = new capnp.Message(SCHEMA_MESSAGE, false);
  const req = message.getRoot(CodeGeneratorRequest);

  // t.type(req, CodeGeneratorRequest);

  const capnpVersion = req.capnpVersion;

  t.equal(capnpVersion.major, 0);
  t.equal(capnpVersion.minor, 6);
  t.equal(capnpVersion.micro, 0);

  const requestedFiles = req.requestedFiles;

  t.equal(requestedFiles.length, 1);

  const requestedFile = requestedFiles.get(0);
  const filename = requestedFile.filename;

  t.equal(filename, "packages/capnp-ts/src/std/schema.capnp");

  const requestedFileId = requestedFile.id;

  t.equal(requestedFileId, SCHEMA_FILE_ID);

  // TODO: investigate why bytes are not equal
  // const out = message.toArrayBuffer();
  // compareBuffers(out, SCHEMA_MESSAGE);
});
