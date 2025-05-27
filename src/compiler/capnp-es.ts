#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { exec } from "node:child_process";
import { compileAll } from "./compiler";
import { existsSync } from "node:fs";

const capnpcOptions = [
  "-I",
  "--import-path",
  "-i",
  "--generate-id",
  "--no-standard-import",
  "--src-prefix",
  "--verbose",
];

const usage = `
Usage: capnp-es [<option>...] <source>...

Compiles Cap'n Proto schema files and generates corresponding source code for javascript and typescript.

Options:
    -o<lang>[:<dir>], --output=<lang>[:<dir>]
        Specify the output language (js,ts,dts) and optional output directory.
    -I<dir>, --import-path=<dir>
        Add <dir> to the list of directories searched for non-relative imports.
    -i, --generate-id
        Generate a new 64-bit unique ID for use in a Cap'n Proto schema.
    --no-standard-import
        Do not add any default import paths; use only those specified by -I.
    --src-prefix=<prefix>
       Remove the prefix of output files.
`;

export async function main(outputFormat: "js" | "ts" | "dts") {
  const sources: string[] = [];
  const options: string[] = [];

  let outFormats: string[] = [outputFormat];
  let outDir: string | undefined;

  for (const arg of process.argv.slice(2)) {
    if (arg === "--help") {
      console.log(usage);
      process.exit(0);
    }
    if (!arg.startsWith("-")) {
      // <source>
      sources.push(arg);
    } else if (arg.startsWith("--output=") || arg.startsWith("-o")) {
      // --output=<lang>[:<dir>], -o<lang>[:<dir>]
      const s = arg
        .slice(arg.startsWith("-o") ? "-o".length : "--output=".length)
        .split(":");
      if (s[0] && s[0] !== "-") {
        outFormats = s[0].split(",");
      }
      if (s[1]) {
        outDir = s[1];
      }
    } else if (capnpcOptions.some((opt) => arg.startsWith(opt))) {
      options.push(arg);
    }
  }

  try {
    let dataBuf: Buffer = await readStdin(); // feed from stdin from capnpc
    if (dataBuf.byteLength === 0) {
      if (outDir) {
        options.push(`-o-:${outDir}`);
      } else {
        options.push("-o-");
      }
      const cmd = `capnpc ${options.join(" ")} ${sources.join(" ")}`;
      console.log(`[capnp-es] ${cmd}`);
      dataBuf = await new Promise<Buffer>((resolve) => {
        exec(cmd, { encoding: "buffer" }, (error, stdout, stderr) => {
          if (stderr.length > 0) {
            process.stderr.write(stderr);
          }
          if (error) {
            process.exit(1);
          }
          resolve(stdout);
        });
      });
    }
    const { files } = await compileAll(dataBuf, {
      ts: outFormats.includes("ts"),
      js: outFormats.includes("js"),
      dts: outFormats.includes("dts"),
    });
    for (const [fileName, content] of files) {
      let filePath = fileName;
      if (!existsSync(dirname(filePath))) {
        const fullPath = `/${filePath}`;
        if (existsSync(dirname(fullPath))) {
          filePath = fullPath;
        }
      }
      if (outDir) {
        filePath = join(outDir, fileName);
      }
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(
        filePath,
        // https://github.com/microsoft/TypeScript/issues/54632
        content.replace(/^\s+/gm, (match) => " ".repeat(match.length / 2)),
      );
      console.log(`[capnp-es] ${filePath}`);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  process.stdin.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });
  await new Promise((resolve) => {
    process.stdin.on("end", resolve);
  });
  const reqBuffer = Buffer.alloc(
    chunks.reduce((l, chunk) => l + chunk.byteLength, 0),
  );
  let i = 0;
  for (const chunk of chunks) {
    chunk.copy(reqBuffer, i);
    i += chunk.byteLength;
  }
  return reqBuffer;
}
