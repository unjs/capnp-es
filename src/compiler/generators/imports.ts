import type { CodeGeneratorFileContext } from ".";
import { TS_FILE_ID } from "../constants";
import {
  getFullClassName,
  hasNode,
  lookupNode,
  tryLookupNode,
} from "../node-util";
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

    const importNode = tryLookupNode(ctx, imp);
    if (!importNode) {
      // Skip imports for nodes that aren't available in the current context
      continue;
    }

    const imports = getImportNodes(ctx, importNode)
      .flatMap((node) => {
        const fullClassName = getFullClassName(node);
        if (node._isInterface) {
          // The client is required for imported interfaces.
          return [fullClassName, `${fullClassName}$Client`];
        }
        return fullClassName;
      })
      .sort()
      .join(", ");

    if (imports.length === 0) {
      continue;
    }

    ctx.codeParts.push(`import { ${imports} } from "${importPath}";`);
  }
}

/**
 * Recursively collects structs, enums, and interfaces from a schema node and its nested nodes.
 *
 * @param ctx - The file context containing schema information
 * @param node - The root node to start collecting imports from
 * @param visitedIds - The ids of the nodes that have been visited (internal use)
 * @returns Array of transitively imported nodes
 */
export function getImportNodes(
  ctx: CodeGeneratorFileContext,
  node: schema.Node,
  visitedIds = new Set<bigint>(),
): schema.Node[] {
  visitedIds.add(node.id);

  // Filter out the node that are not available in the current context.
  const nestedNodes = node.nestedNodes.filter(({ id }) => hasNode(ctx, id));

  // Filter out visited nodes.
  const newNestedNodes = nestedNodes.filter(({ id }) => !visitedIds.has(id));

  // Only consider structs, enums, and interfaces.
  const nodes = newNestedNodes
    .map(({ id }) => lookupNode(ctx, id))
    .filter((node) => node._isStruct || node._isEnum || node._isInterface);

  // Recurse on the nested nodes.
  return nodes.concat(
    nodes.flatMap((node) => getImportNodes(ctx, node, visitedIds)),
  );
}
