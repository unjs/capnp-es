# 🔥 capnp-es

<!-- automd:badges bundlephobia codecov -->

[![npm version](https://img.shields.io/npm/v/capnp-es)](https://npmjs.com/package/capnp-es)
[![npm downloads](https://img.shields.io/npm/dm/capnp-es)](https://npm.chart.dev/capnp-es)
[![bundle size](https://img.shields.io/bundlephobia/minzip/capnp-es)](https://bundlephobia.com/package/capnp-es)
[![codecov](https://img.shields.io/codecov/c/gh/unjs/capnp-es)](https://codecov.io/gh/unjs/capnp-es)

<!-- /automd -->

> [!WARNING]
> This is an alpha-quality software. please use at your own risk ([project status](#status)).

TypeScript implementation of the [Cap'n Proto](https://capnproto.org) serialization protocol.

[Cap’n Proto](https://capnproto.org/) is an insanely fast data interchange format and capability-based RPC system. Think JSON, except binary. Or think [Protocol Buffers](https://github.com/protocolbuffers/protobuf), except faster. Cap’n Proto was built by [Kenton Varda](https://github.com/kentonv) to be used in [Sandstorm](https://capnproto.org/faq.html#sandstorm) and is now heavily used in [Cloudflare](https://capnproto.org/faq.html#cloudflare).

## Usage

### Compiling schema

> [!NOTE]
> Make sure `capnpc` command is available. You can find install instructions [here](https://capnproto.org/install.html) to install it.

Install `capnp-es` dependency:

```sh
npx nypm install capnp-es
```

You can use `capnp-es` to compile a schema file into typeScript/javascript source code:

```shell
npx capnp-es path/to/myschema.capnp -ojs,ts,dts
```

This will generate `path/to/myschema.{js,ts,dts}`.

Use `npx capnp-es --help` for full usage info.

See [playground](./playground/) for examples and learn more about `.capnp` schema in [language docs](https://capnproto.org/language.html).

---

You can also use `capnp-es` as a [capnp compiler plugin](https://capnproto.org/capnp-tool.html#compiling-schemas).

When doing so, you can set the output format using the env var `CAPNP_ES_OUT_FORMAT=js,ts,dts`. This takes the same options and format as the `-o` flag.

### Reading Messages

Here's a quick usage example:

```ts
import * as capnp from "capnp-es";
import { MyStruct } from "./myschema.js";

const message = capnp.Message.fromArrayBuffer(buffer);
const struct = message.getRoot(MyStruct);
```

### RPC Protocol

Experimental [RPC protocol](https://capnproto.org/rpc.html) is supported ([level 1](https://capnproto.org/rpc.html#protocol-features)).

See [tests](./test/integration/rpc.spec.ts) for some examples.

## Status

This project is a rework of [jdiaz5513/capnp-ts](https://github.com/jdiaz5513/capnp-ts/) by [Julián Díaz](https://github.com/jdiaz5513) and is under development.

<details>

<summary>Changes from capnp-ts</summary>

- Internal refactors and simplifications as was playing around.
- Compiler, runtime, and std lib published via a single and compact ESM-only package with subpath exports.
- Compiler updated to use Typescript v5 API
- Output files can be `.ts` (new), `.js` (ESM instead of CJS), and `.d.ts` and has no `.capnp` suffix.
- Compiler API can be used via the `capnp-es/compiler` subpath export programmatically.
- Use native `TextEncoder` and `TextDecoder` for utf8 encoding
- Enums are typed plain JS objects (this way `.ts` files work with strip-only ts loaders without enum support.)
- Compiler CLI can directly accept a path to `.capnp` files and internally use `capnpc`
- Built-in schemas are compiled from source (compiler, compiles itself. so cool right?)
- Use reflection (getter setters) to access structs.
- RPC level-1 merged from [jdiaz5513/capnp-ts#169](https://github.com/jdiaz5513/capnp-ts/pull/169).
- List interface implements [`Array` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) (custom methods removed).
- Pointers had been improved to feel (inspected and serialized) like native JS values as much as possible.
- Basic JSDocs generated for class and getter

</details>

## Contribution

Feedback and PRs are more than welcome. 🙏

<details>

<summary>Local development</summary>

- Clone this repository
- Install the latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## License

🔀 Forked from [jdiaz5513/capnp-ts](https://github.com/jdiaz5513/capnp-ts/) by [Julián Díaz](https://github.com/jdiaz5513).

💛 Published under the [MIT](https://github.com/unjs/capnp-es/blob/main/LICENSE) license.
