# Changelog

## v0.0.14

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.13...v0.0.14)

### 🩹 Fixes

- Revert TS peer dependency to ^5.7.3 ([#65](https://github.com/unjs/capnp-es/pull/65))

### ❤️ Contributors

- Victor Berchet ([@vicb](https://github.com/vicb))

## v0.0.13

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.12...v0.0.13)

### 🏡 Chore

- update all non-major dependencies ([#63](https://github.com/unjs/capnp-es/pull/63))

### ❤️ Contributors

- Victor Berchet ([@vicb](https://github.com/vicb))

## v0.0.12

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.11...v0.0.12)

### 🩹 Fixes

- Do not pass the output directory to capnpc ([#61](https://github.com/unjs/capnp-es/pull/61))

### 💅 Refactors

- Drop encodeUtf8 in favor of TextEncoder ([#49](https://github.com/unjs/capnp-es/pull/49))

### 🏡 Chore

- Update generated files ([#62](https://github.com/unjs/capnp-es/pull/62))

### ❤️ Contributors

- Victor Berchet ([@vicb](http://github.com/vicb))

## v0.0.11

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.8...v0.0.11)

### 🚀 Enhancements

- Add `messageToString` to dump messages ([#39](https://github.com/unjs/capnp-es/pull/39))
- Expose capnpc-ts, capnpc-dts, capnpc-js ([#41](https://github.com/unjs/capnp-es/pull/41))

### 🩹 Fixes

- **enum:** Fix enum value ([#36](https://github.com/unjs/capnp-es/pull/36))
- **interface:** Import the class and client of interfaces ([#37](https://github.com/unjs/capnp-es/pull/37))
- **interface:** Add JSDoc to methods ([#35](https://github.com/unjs/capnp-es/pull/35))
- Only output files in specified formats ([#40](https://github.com/unjs/capnp-es/pull/40))

### 💅 Refactors

- Generate TS source code without using AST ([#27](https://github.com/unjs/capnp-es/pull/27))
- **compiler:** Split the code generator into multiple files ([#31](https://github.com/unjs/capnp-es/pull/31))
- **interface:** Extract interface generation to a separate function/file ([#34](https://github.com/unjs/capnp-es/pull/34))
- Make sure runtimes beside node are supported ([#42](https://github.com/unjs/capnp-es/pull/42))

### 🏡 Chore

- **release:** V0.0.8 ([52b88bb](https://github.com/unjs/capnp-es/commit/52b88bb))
- **release:** V0.0.9 ([e084451](https://github.com/unjs/capnp-es/commit/e084451))
- **release:** V0.0.10 ([0a5d789](https://github.com/unjs/capnp-es/commit/0a5d789))

### ❤️ Contributors

- Victor Berchet ([@vicb](http://github.com/vicb))
- Emily-shen ([@emily-shen](http://github.com/emily-shen))
- Samuel Macleod <smacleod@cloudflare.com>

## v0.0.10

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.8...v0.0.10)

### 🚀 Enhancements

- Add `messageToString` to dump messages ([#39](https://github.com/unjs/capnp-es/pull/39))
- Expose capnpc-ts, capnpc-dts, capnpc-js ([#41](https://github.com/unjs/capnp-es/pull/41))

### 🩹 Fixes

- **enum:** Fix enum value ([#36](https://github.com/unjs/capnp-es/pull/36))
- **interface:** Import the class and client of interfaces ([#37](https://github.com/unjs/capnp-es/pull/37))
- **interface:** Add JSDoc to methods ([#35](https://github.com/unjs/capnp-es/pull/35))
- Only output files in specified formats ([#40](https://github.com/unjs/capnp-es/pull/40))

### 💅 Refactors

- Generate TS source code without using AST ([#27](https://github.com/unjs/capnp-es/pull/27))
- **compiler:** Split the code generator into multiple files ([#31](https://github.com/unjs/capnp-es/pull/31))
- **interface:** Extract interface generation to a separate function/file ([#34](https://github.com/unjs/capnp-es/pull/34))

### 🏡 Chore

- **release:** V0.0.8 ([52b88bb](https://github.com/unjs/capnp-es/commit/52b88bb))
- **release:** V0.0.9 ([e084451](https://github.com/unjs/capnp-es/commit/e084451))

### ❤️ Contributors

- Victor Berchet ([@vicb](http://github.com/vicb))
- Emily-shen ([@emily-shen](http://github.com/emily-shen))
- Samuel Macleod <smacleod@cloudflare.com>

## v0.0.9

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.7...v0.0.9)

### 📦 Build

- Inline self-imports ([754a910](https://github.com/unjs/capnp-es/commit/754a910))

### 🏡 Chore

- **release:** V0.0.7 ([a8a4070](https://github.com/unjs/capnp-es/commit/a8a4070))
- Update deps ([ee50be7](https://github.com/unjs/capnp-es/commit/ee50be7))
- **release:** V0.0.8 ([52b88bb](https://github.com/unjs/capnp-es/commit/52b88bb))

### ✅ Tests

- Increase timeout ([cd876d7](https://github.com/unjs/capnp-es/commit/cd876d7))

### ❤️ Contributors

- Samuel Macleod <smacleod@cloudflare.com>
- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.8

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.7...v0.0.8)

### 📦 Build

- Inline self-imports ([754a910](https://github.com/unjs/capnp-es/commit/754a910))

### 🏡 Chore

- **release:** V0.0.7 ([a8a4070](https://github.com/unjs/capnp-es/commit/a8a4070))
- Update deps ([ee50be7](https://github.com/unjs/capnp-es/commit/ee50be7))

### ✅ Tests

- Increase timeout ([cd876d7](https://github.com/unjs/capnp-es/commit/cd876d7))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.7

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.6...v0.0.7)

### 📦 Build

- Inline self-imports ([754a910](https://github.com/unjs/capnp-es/commit/754a910))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.6

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.5...v0.0.6)

### 🩹 Fixes

- **rpc:** Conditionally use `FinalizationRegistry` ([#7](https://github.com/unjs/capnp-es/pull/7))

### 📖 Documentation

- Update to use local install ([#9](https://github.com/unjs/capnp-es/pull/9))

### 🏡 Chore

- Update generate files ([3a53e7f](https://github.com/unjs/capnp-es/commit/3a53e7f))
- Add codeowners ([5c768a8](https://github.com/unjs/capnp-es/commit/5c768a8))
- Update refs to unjs/ ([d35918a](https://github.com/unjs/capnp-es/commit/d35918a))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.5

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.4...v0.0.5)

### 🩹 Fixes

- Various fixes ([#10](https://github.com/unjs/capnp-es/pull/10))

### 🏡 Chore

- Fix ci ([2248360](https://github.com/unjs/capnp-es/commit/2248360))
- Prettier ignore std files ([090c767](https://github.com/unjs/capnp-es/commit/090c767))
- Fix build script ([f995c63](https://github.com/unjs/capnp-es/commit/f995c63))
- Update deps ([12c4c58](https://github.com/unjs/capnp-es/commit/12c4c58))
- Lint ([6a13e89](https://github.com/unjs/capnp-es/commit/6a13e89))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))
- Somhairle MacLeòid ([@penalosa](http://github.com/penalosa))

## v0.0.4

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.3...v0.0.4)

### 🚀 Enhancements

- **cli:** Allow passing more options ([f794de7](https://github.com/unjs/capnp-es/commit/f794de7))
- Prefix `_init`, `_is`, `_disown` and `_has` ([1cbf9d1](https://github.com/unjs/capnp-es/commit/1cbf9d1))

### 🩹 Fixes

- Fix source info matcher ([ff0bd2f](https://github.com/unjs/capnp-es/commit/ff0bd2f))
- **cli:** Try to guess absolute paths ([06730e1](https://github.com/unjs/capnp-es/commit/06730e1))

### 📦 Build

- Fully auto generate std files ([e5b2eda](https://github.com/unjs/capnp-es/commit/e5b2eda))

### 🏡 Chore

- Update fixture ([82f85ee](https://github.com/unjs/capnp-es/commit/82f85ee))
- Fix lint issues ([3c01fcc](https://github.com/unjs/capnp-es/commit/3c01fcc))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.3

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.2...v0.0.3)

### 🚀 Enhancements

- **compiler:** Enums as typed plain objects ([d316d8b](https://github.com/unjs/capnp-es/commit/d316d8b))
- **cli:** Allow directly passing path to capnp files ([7eb8f86](https://github.com/unjs/capnp-es/commit/7eb8f86))
- Use getter/setter for struct ([88504dd](https://github.com/unjs/capnp-es/commit/88504dd))
- Compile schemas from source ([1d7bf84](https://github.com/unjs/capnp-es/commit/1d7bf84))
- Experimental RPC level 1 ([#3](https://github.com/unjs/capnp-es/pull/3))
- Support iterator lists ([bbd512a](https://github.com/unjs/capnp-es/commit/bbd512a))
- Implement Array interface for List ([8e80a25](https://github.com/unjs/capnp-es/commit/8e80a25))
- Improve inspection of pointers ([1fd6341](https://github.com/unjs/capnp-es/commit/1fd6341))
- Generate basic jsdocs ([1be83a7](https://github.com/unjs/capnp-es/commit/1be83a7))

### 🔥 Performance

- Use native `TextEncoder` and `TextDncoder for text ([1b41d55](https://github.com/unjs/capnp-es/commit/1b41d55))

### 🩹 Fixes

- Update text ([25d7470](https://github.com/unjs/capnp-es/commit/25d7470))

### 💅 Refactors

- Shorter code gen ([1feaf4a](https://github.com/unjs/capnp-es/commit/1feaf4a))
- Better src/pointers structure ([39d7049](https://github.com/unjs/capnp-es/commit/39d7049))
- Rename std to capnp ([7abfafc](https://github.com/unjs/capnp-es/commit/7abfafc))
- Decouple struct and pointer utils from class ([b19e4e1](https://github.com/unjs/capnp-es/commit/b19e4e1))

### 📦 Build

- Mark typescript as optional peer dependency ([7b67d8c](https://github.com/unjs/capnp-es/commit/7b67d8c))

### 🏡 Chore

- Update badges ([0a71473](https://github.com/unjs/capnp-es/commit/0a71473))
- Ignore CHANGELOG.md ([7042e6a](https://github.com/unjs/capnp-es/commit/7042e6a))
- **release:** V0.0.2 ([efbc3ff](https://github.com/unjs/capnp-es/commit/efbc3ff))
- Add basic benchmark results ([e60a1f2](https://github.com/unjs/capnp-es/commit/e60a1f2))
- Update readme ([969d14d](https://github.com/unjs/capnp-es/commit/969d14d))
- Update bench scripts ([da916dc](https://github.com/unjs/capnp-es/commit/da916dc))
- Lint ([cc725d5](https://github.com/unjs/capnp-es/commit/cc725d5))
- Update badges ([7107a56](https://github.com/unjs/capnp-es/commit/7107a56))
- Update bench ([365433b](https://github.com/unjs/capnp-es/commit/365433b))
- Remove bench section for now ([bada07e](https://github.com/unjs/capnp-es/commit/bada07e))
- Update readme ([488c3e1](https://github.com/unjs/capnp-es/commit/488c3e1))
- Update bench ([6fb0e00](https://github.com/unjs/capnp-es/commit/6fb0e00))
- Apply automated updates ([f7ba098](https://github.com/unjs/capnp-es/commit/f7ba098))
- Update readme ([d31dc5e](https://github.com/unjs/capnp-es/commit/d31dc5e))
- Apply automated updates ([8802b6c](https://github.com/unjs/capnp-es/commit/8802b6c))
- Fix typescheck issue ([8de8bd6](https://github.com/unjs/capnp-es/commit/8de8bd6))
- Update readme ([f83dc5c](https://github.com/unjs/capnp-es/commit/f83dc5c))
- Update readme ([347c98c](https://github.com/unjs/capnp-es/commit/347c98c))
- Update readme ([03f008e](https://github.com/unjs/capnp-es/commit/03f008e))
- Update reademe ([5407678](https://github.com/unjs/capnp-es/commit/5407678))
- Update readme ([dd53972](https://github.com/unjs/capnp-es/commit/dd53972))
- Update repo ([dc4f0e2](https://github.com/unjs/capnp-es/commit/dc4f0e2))
- Fix bench ([fb5f55e](https://github.com/unjs/capnp-es/commit/fb5f55e))
- Add profile scripts ([52e6729](https://github.com/unjs/capnp-es/commit/52e6729))

### ✅ Tests

- Run compile e2e within vitest ([96cf7f5](https://github.com/unjs/capnp-es/commit/96cf7f5))

### 🤖 CI

- Use node 22 ([cd55407](https://github.com/unjs/capnp-es/commit/cd55407))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.2

[compare changes](https://github.com/unjs/capnp-es/compare/v0.0.1...v0.0.2)

### 📦 Build

- Mark typescript as optional peer dependency ([7b67d8c](https://github.com/unjs/capnp-es/commit/7b67d8c))

### 🏡 Chore

- **release:** V0.0.1 ([7537225](https://github.com/unjs/capnp-es/commit/7537225))
- Apply automated updates ([684c996](https://github.com/unjs/capnp-es/commit/684c996))
- Update badges ([0a71473](https://github.com/unjs/capnp-es/commit/0a71473))
- Ignore CHANGELOG.md ([7042e6a](https://github.com/unjs/capnp-es/commit/7042e6a))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))

## v0.0.1

### 🏡 Chore

- Update readme ([e474444](https://github.com/unjs/capnp-es/commit/e474444))
- Apply automated updates ([38da377](https://github.com/unjs/capnp-es/commit/38da377))

### 🤖 CI

- Install capnpc ([86d1089](https://github.com/unjs/capnp-es/commit/86d1089))
- Build capnproto from source ([504cdd5](https://github.com/unjs/capnp-es/commit/504cdd5))
- Uppdate capnp install ([cbbff7e](https://github.com/unjs/capnp-es/commit/cbbff7e))

### ❤️ Contributors

- Pooya Parsa ([@pi0](http://github.com/pi0))
