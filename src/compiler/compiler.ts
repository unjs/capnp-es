// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import ts from "typescript";
import * as s from "../capnp/schema.ts";
import { Message } from "../serialization/message.ts";
import * as E from "./errors";
import { CodeGeneratorContext } from "./code-generator-context";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { SOURCE_COMMENT } from "./constants";
import { loadRequestedFile, lookupNode } from "./file";
import {
  generateCapnpImport,
  generateConcreteListInitializer,
  generateFileId,
  generateNode,
  generateNestedImports,
} from "./generators";

/**
 * Compiles Cap'n Proto schema files into TypeScript/JavaScript code.
 *
 * @see `src/capnp/_capnp/schema.capnp`
 *
 * @param codeGenRequest - Buffer containing the Cap'n Proto CodeGeneratorRequest message
 * @param opts - Compilation options
 * @param opts.ts - Whether to generate TypeScript (.ts) files
 * @param opts.js - Whether to generate JavaScript (.js) files
 * @param opts.dts - Whether to generate TypeScript declaration (.d.ts) files
 * @param opts.tsconfig - Custom TypeScript compiler options
 * @returns Object containing the compilation context and generated files
 * @returns.ctx - The CodeGeneratorContext used during compilation
 * @returns.files - Map of file paths to their generated content
 */
export async function compileAll(
  codeGenRequest: Buffer,
  opts?: {
    ts?: boolean;
    js?: boolean;
    dts?: boolean;
    tsconfig?: ts.CompilerOptions;
  },
): Promise<{ ctx: CodeGeneratorContext; files: Map<string, string> }> {
  // Load requested files into context
  const req = new Message(codeGenRequest, false).getRoot(
    s.CodeGeneratorRequest,
  );
  const ctx = new CodeGeneratorContext();
  ctx.files = req.requestedFiles.map((file) => loadRequestedFile(req, file));

  // Compile files in memory
  const files = new Map<string, string>(
    ctx.files.map((file) => [file.tsPath, compileFile(file)]),
  );

  // Transpile .d.ts and .js files
  if (opts?.js || opts?.dts) {
    tsCompile(files, opts?.tsconfig, opts?.dts);
  }

  // Remove .ts entries if ts option was not set
  if (!opts?.ts) {
    for (const [fileName] of files) {
      if (fileName.endsWith(".ts")) {
        files.delete(fileName);
      }
    }
  }

  return {
    ctx,
    files,
  };
}

/**
 * Compiles a single Cap'n Proto schema file into TypeScript code.
 * Generates imports, file ID, and type definitions for all nodes in the schema.
 *
 * @param ctx - File context containing schema information and compilation state
 * @param ctx.file - The schema file being compiled
 * @param ctx.tsPath - Output TypeScript file path
 * @param ctx.statements - Collection of TypeScript statements to be written
 * @param ctx.concreteLists - List type definitions to be generated
 *
 * @returns Generated TypeScript source code as a string, including source header comment
 */
export function compileFile(ctx: CodeGeneratorFileContext) {
  generateCapnpImport(ctx);
  generateNestedImports(ctx);
  generateFileId(ctx);

  const nestedNodes = lookupNode(ctx, ctx.file).nestedNodes.map((n) =>
    lookupNode(ctx, n),
  );

  for (const node of nestedNodes) {
    generateNode(ctx, node);
  }

  for (const [fullClassName, field] of ctx.concreteLists) {
    generateConcreteListInitializer(ctx, fullClassName, field);
  }

  const sourceFile = ts.createSourceFile(
    ctx.tsPath,
    ctx.codeParts.map((p) => p.toString()).join(""),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );

  return SOURCE_COMMENT + ts.createPrinter().printFile(sourceFile);
}

export function printSourceFiles(ctx: CodeGeneratorContext): string[] {
  return ctx.files.map((ctx) => compileFile(ctx));
}

/**
 * Compiles TypeScript files in memory.
 * Uses provided compiler options and declarations, throws an error if compilation fails.
 *
 * @param files Map of file names to file content.
 * @param tsconfig TypeScript compiler options.
 * @param declaration Whether to generate declaration files.
 */
function tsCompile(
  files: Map<string, string>,
  tsconfig?: ts.CompilerOptions,
  declaration?: boolean,
): void {
  const compileOptions: ts.CompilerOptions = {
    noEmit: false,
    declaration: declaration ?? false,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    noEmitOnError: false,
    noFallthroughCasesInSwitch: true,
    preserveConstEnums: true,
    noImplicitReturns: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    removeComments: false,
    skipLibCheck: true,
    sourceMap: false,
    strict: true,
    ...tsconfig,
  };

  const compilerHost = ts.createCompilerHost(compileOptions);
  compilerHost.writeFile = (fileName: string, declaration: string) => {
    files.set(fileName, declaration);
  };
  const _readFile = compilerHost.readFile;
  compilerHost.readFile = (filename) => {
    if (files.has(filename)) {
      return files.get(filename);
    }
    return _readFile(filename);
  };

  const program = ts.createProgram(
    [...files.keys()],
    compileOptions,
    compilerHost,
  );

  const emitResult = program.emit();

  const allDiagnostics = [
    ...ts.getPreEmitDiagnostics(program),
    ...emitResult.diagnostics,
  ];
  if (allDiagnostics.length > 0) {
    for (const diagnostic of allDiagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );
      if (diagnostic.file && diagnostic.start) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        console.log(
          `${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`,
        );
      } else {
        console.log(`==> ${message}`);
      }
    }
    throw new Error(E.GEN_TS_EMIT_FAILED);
  }
}
