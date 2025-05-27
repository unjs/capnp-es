import * as capnp from "capnp-es";

import { test, describe, beforeAll, expect } from "vitest";
import {
  Person,
  Person_PhoneNumber_Type,
} from "../fixtures/serialization-demo";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dirName = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(dirName, "../fixtures/serialization-demo.capnp");

let message: capnp.Message;
let person: Person;

describe("messageToString", () => {
  beforeAll(() => {
    message = new capnp.Message();
    person = message.initRoot(Person);
    person.name = "Jane Doe";
    person.id = 123;
    person._initPhones(1);
    const phone = person.phones.at(0);
    phone.number = "123-456-7890";
    phone.type = Person_PhoneNumber_Type.MOBILE;
    person.employment.unemployed = true;
  });
  test("text", async () => {
    expect(
      await capnp.messageToString(message, Person, {
        schemaPath,
        format: "text",
      }),
    ).toMatchInlineSnapshot(`
      "( id = 123,
        name = "Jane Doe",
        phones = [
          (number = "123-456-7890", type = mobile) ],
        employment = (unemployed = void) )"
    `);
  });

  test("json", async () => {
    expect(
      await capnp.messageToString(message, Person, {
        schemaPath,
        format: "json",
      }),
    ).toMatchInlineSnapshot(`
      "{ "id": 123,
        "name": "Jane Doe",
        "phones": [{"number": "123-456-7890", "type": "mobile"}],
        "employment": {"unemployed": null} }"
    `);
  });
});
