export * from "./serialization";
export * from "./rpc";

// Export schema types for dynamic loading
export { Node, Field, Type } from "./capnp/schema";

// Note: SchemaLoader is exported from 'capnp-es/serialization/schema-loader'
// to avoid circular imports (schema.ts imports from capnp-es)
