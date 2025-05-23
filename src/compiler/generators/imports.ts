import type { CodeGeneratorFileContext } from ".";
import { TS_FILE_ID } from "../constants";
import { getFullClassName, hasNode, lookupNode } from "../node-util";
import * as util from "../util";
import type * as schema from "../../capnp/schema";

/**
 * Generates the import statement for the capnp-es runtime library.
 *
 * This function checks for a custom import path annotation in the schema file.
 * If found, it uses that path instead of the default 'capnp-es' import.
 *
 * The import path can be customized using the ts.importPath annotation:
 *
 * ```capnp
 * using Ts = import "/capnp/ts.capnp";
 * $Ts.importPath("../custom/path/to/capnp-es");
 * ```
 *
 * @param ctx - The code generator context containing file and annotation information
 */
export function generateCapnpImport(ctx: CodeGeneratorFileContext): void {
  // Look for the special importPath annotation on the file to see if we need a different import path for capnp-es.
  const fileNode = lookupNode(ctx, ctx.file);
  const tsFileId = util.hexToBigInt(TS_FILE_ID);
  // This may be undefined if ts.capnp is not imported; fine, we'll just use the default.
  const tsAnnotationFile = ctx.nodes.find((n) => n.id === tsFileId);
  // We might not find the importPath annotation; that's definitely a bug but let's move on.
  const tsImportPathAnnotation = tsAnnotationFile?.nestedNodes.find(
    (n) => n.name === "importPath",
  );
  // There may not necessarily be an import path annotation on the file node. That's fine.
  const importAnnotation =
    tsImportPathAnnotation &&
    fileNode.annotations.find((a) => a.id === tsImportPathAnnotation.id);
  const importPath =
    importAnnotation === undefined ? "capnp-es" : importAnnotation.value.text;

  ctx.codeParts.push(`import * as $ from '${importPath}';`);
}

/**
 * Generates TypeScript import statements for nested types defined in Cap'n Proto schema files.
 *
 * @param ctx - The file context containing import information and statements
 * @param ctx.imports - List of schema files to import from
 * @param ctx.statements - Collection of TypeScript statements being generated
 */
export function generateNestedImports(ctx: CodeGeneratorFileContext): void {
  for (const imp of ctx.imports) {
    const { name } = imp;
    let importPath: string;

    if (name.startsWith("/capnp/")) {
      importPath = `capnp-es/capnp/${name.slice(7).replace(/\.capnp$/, "")}`;
    } else {
      importPath = name.replace(/\.capnp$/, ".js");
      if (importPath[0] !== ".") {
        importPath = `./${importPath}`;
      }
    }

    const importNode = lookupNode(ctx, imp);

    const imports = getImportNodes(ctx, importNode)
      .map((n) => getFullClassName(n))
      .join(", ");

    if (imports.length === 0) {
      continue;
    }

    ctx.codeParts.push(`import { ${imports} } from "${importPath}";`);
  }
}

/**
 * Recursively collects structs and enums from a schema node and its nested nodes.
 *
 * @param ctx - The file context containing schema information
 * @param node - The root node to start collecting imports from
 * @returns Array of Node objects that can be imported (structs and enums only)
 */
export function getImportNodes(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
): schema.Node[] {
  return (
    lookupNode(ctx, node)
      .nestedNodes.filter((n) => hasNode(ctx, n))
      .map((n) => lookupNode(ctx, n))
      // eslint-disable-next-line unicorn/no-array-reduce
      .reduce(
        (a, n) => [...a, n, ...getImportNodes(ctx, n)],
        new Array<schema.Node>(),
      )
      .filter((n) => {
        const node = lookupNode(ctx, n);
        return node._isStruct || node._isEnum;
      })
  );
}
