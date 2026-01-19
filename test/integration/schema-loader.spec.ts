import { test, expect } from "vitest";
import { execSync } from "node:child_process";
import * as capnp from "capnp-es";
import { SchemaLoader } from "src/serialization/schema-loader";
import { CodeGeneratorRequest } from "src/capnp/schema";
import {
  AddressBook,
  Person_PhoneNumber_Type,
} from "test/fixtures/serialization-demo";

test("schema-loader: round-trip AddressBook", () => {
  // 1. Create an AddressBook with sample data
  const message = new capnp.Message();
  const addressBook = message.initRoot(AddressBook);
  const people = addressBook._initPeople(2);

  // Person 1: Alice
  const alice = people.get(0);
  alice.id = 123;
  alice.name = "Alice Smith";
  alice.email = "alice@example.com";
  const alicePhones = alice._initPhones(2);
  alicePhones.get(0).number = "555-1234";
  alicePhones.get(0).type = Person_PhoneNumber_Type.MOBILE;
  alicePhones.get(1).number = "555-5678";
  alicePhones.get(1).type = Person_PhoneNumber_Type.HOME;
  alice.employment.employer = "Acme Corp";

  // Person 2: Bob
  const bob = people.get(1);
  bob.id = 456;
  bob.name = "Bob Jones";
  bob.email = "bob@example.com";
  const bobPhones = bob._initPhones(1);
  bobPhones.get(0).number = "555-9999";
  bobPhones.get(0).type = Person_PhoneNumber_Type.WORK;
  bob.employment.school = "State University";

  // 2. Serialize to raw bytes
  const rawBytes = message.toArrayBuffer();

  // 3. Compile the schema to get CodeGeneratorRequest
  const schemaRaw = execSync(
    "capnp compile -o- test/fixtures/serialization-demo.capnp",
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const schemaMessage = new capnp.Message(schemaRaw, false);
  const request = schemaMessage.getRoot(CodeGeneratorRequest);

  // 4. Use SchemaLoader to dynamically create constructors
  const loader = new SchemaLoader();
  const structCtors = new Map<string, capnp.StructCtor<capnp.Struct>>();

  for (let i = 0; i < request.nodes.length; i++) {
    const node = request.nodes.get(i);
    if (!node._isStruct) continue;

    const loaded = loader.loadDynamic(node);
    const simpleName = (node.displayName || "").split(":").pop();
    if (simpleName) {
      structCtors.set(simpleName, loaded.structCtor);
    }
  }

  // 5. Decode the message with the dynamic constructor
  const AddressBookDynamic = structCtors.get("AddressBook")!;
  expect(AddressBookDynamic).toBeDefined();

  const decoded = new capnp.Message(rawBytes, false);
  const addressBookDynamic = decoded.getRoot(AddressBookDynamic);

  // 6. Validate all values match (cast to any since properties are dynamic)
  const peopleDynamic = (addressBookDynamic as any).people;
  expect(peopleDynamic.length).toBe(2);

  // Validate Alice
  const aliceDynamic = peopleDynamic.get(0);
  expect(aliceDynamic.id).toBe(123);
  expect(aliceDynamic.name).toBe("Alice Smith");
  expect(aliceDynamic.email).toBe("alice@example.com");
  expect(aliceDynamic.phones.length).toBe(2);
  expect(aliceDynamic.phones.get(0).number).toBe("555-1234");
  expect(aliceDynamic.phones.get(0).type).toBe(Person_PhoneNumber_Type.MOBILE);
  expect(aliceDynamic.phones.get(1).number).toBe("555-5678");
  expect(aliceDynamic.phones.get(1).type).toBe(Person_PhoneNumber_Type.HOME);

  // Validate Bob
  const bobDynamic = peopleDynamic.get(1);
  expect(bobDynamic.id).toBe(456);
  expect(bobDynamic.name).toBe("Bob Jones");
  expect(bobDynamic.email).toBe("bob@example.com");
  expect(bobDynamic.phones.length).toBe(1);
  expect(bobDynamic.phones.get(0).number).toBe("555-9999");
  expect(bobDynamic.phones.get(0).type).toBe(Person_PhoneNumber_Type.WORK);
});
