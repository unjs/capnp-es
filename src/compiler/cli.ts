#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { exec } from "node:child_process";
import { compileAll } from "./compiler";
import { existsSync } from "node:fs";

/**
 * Main entry point for the Cap'n Proto compiler CLI tools.
 * It handles two modes of operation:
 * 1. When invoked directly (via capnp-es), it parses command-line arguments and executes the Cap'n Proto compiler
 * 2. When invoked as a plugin, it reads schema data from stdin
 *
 * The function compiles the Cap'n Proto schema into JavaScript, TypeScript, or TypeScript declaration files
 * based on the specified output format, and writes the generated files to the filesystem.
 *
 * @param outFormat - The default output format
 */
export async function cliMain(outFormat: "js" | "ts" | "dts") {
  let outFormats: string[] = [outFormat];
  let outDir: string | undefined;
  try {
    let dataBuf: Buffer = await readStdin();
    if (dataBuf.length === 0) {
      const parsedOptions = parseOptions();
      outFormats = parsedOptions.outFormats;
      outDir = parsedOptions.outDir;
      const { sources, options } = parsedOptions;
      dataBuf = await execCapnpc(sources, options);
    }
    const { files } = await compileAll(dataBuf, {
      ts: outFormats.includes("ts"),
      js: outFormats.includes("js"),
      dts: outFormats.includes("dts"),
    });
    (await writeFiles(files, outDir)).map((file) =>
      console.log(`[capnp-es] ${file}`),
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

/**
 * Parses command-line arguments for the Cap'n Proto compiler CLI.
 *
 * @returns An object containing:
 *   - sources: Array of source file paths to compile
 *   - options: Array of command-line options to pass to capnpc
 *   - outFormats: Array of output format strings ("js", "ts", "dts")
 *   - outDir: Optional output directory for generated files
 */
function parseOptions() {
  const sources: string[] = [];
  const options: string[] = [];
  let outFormats: string[] = ["js"];
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

  return { sources, options, outFormats, outDir };
}

/**
 * Executes the Cap'n Proto compiler (capnpc) with the specified sources and options.
 *
 * This function runs the capnpc command-line tool to compile Cap'n Proto schema files.
 *
 * @param sources - Array of source file paths to compile
 * @param options - Array of command-line options to pass to capnpc
 * @param outDir - Optional output directory for generated files
 *
 * @returns A Buffer containing the stdout of the capnpc command
 */
async function execCapnpc(
  sources: string[],
  options: string[],
): Promise<Buffer> {
  // Uses -o- to output to stdout
  const cmd = `capnpc -o- ${options.join(" ")} ${sources.join(" ")}`;
  console.log(`[capnp-es] ${cmd}`);
  return new Promise<Buffer>((resolve) => {
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

/**
 * Writes generated files to the filesystem.
 *
 * @param files - A Map where keys are filenames and values are the file contents
 * @param outDir - Optional output directory where files should be written
 *
 * @returns A list of absolute file paths that were written
 */
async function writeFiles(
  files: Map<string, string>,
  outDir: string | undefined,
): Promise<string[]> {
  const filePaths: string[] = [];
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
    filePaths.push(filePath);
  }
  return filePaths;
}

/**
 * Reads data from standard input as a Buffer.
 *
 * This function collects all chunks of data from stdin until the stream ends,
 * then combines them into a single Buffer. If stdin is a TTY (terminal),
 * it immediately returns an empty Buffer instead of waiting for input.
 *
 * @returns A Promise that resolves to a Buffer containing all data read from stdin.
 *          If stdin is a TTY, returns an empty Buffer.
 */
async function readStdin(): Promise<Buffer> {
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
