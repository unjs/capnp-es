import * as schema from "../../capnp/schema";

export function createBigInt(value: bigint): string {
  let v = value.toString(16);
  let sign = "";
  if (v[0] === "-") {
    v = v.slice(1);
    sign = "-";
  }
  return `${sign}0x${v}n`;
}

/**
 * Extracts JSDoc comments from a Cap'n Proto source info as a formatted string.
 *
 * @param sourceInfo - The source info containing documentation comments
 * @returns Formatted JSDoc string or undefined if no documentation exists
 */
export function extractJSDocs(
  sourceInfo?: schema.Node_SourceInfo | schema.Node_SourceInfo_Member,
): string {
  const docComment = sourceInfo?.docComment;
  if (!docComment) {
    return "";
  }

  return (
    "/**\n" +
    docComment
      .toString()
      .split("\n")
      .map((l) => `* ${l}`)
      .join("\n") +
    "\n*/"
  );
}
