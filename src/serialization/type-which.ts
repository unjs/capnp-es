// Type discriminant values from the Cap'n Proto schema specification.
// These match the Type_Which enum in schema.capnp.
// Defined separately to avoid circular imports between schema.ts and schema-loader.ts.

export const TypeWhich = {
  VOID: 0,
  BOOL: 1,
  INT8: 2,
  INT16: 3,
  INT32: 4,
  INT64: 5,
  UINT8: 6,
  UINT16: 7,
  UINT32: 8,
  UINT64: 9,
  FLOAT32: 10,
  FLOAT64: 11,
  TEXT: 12,
  DATA: 13,
  LIST: 14,
  ENUM: 15,
  STRUCT: 16,
  INTERFACE: 17,
  ANY_POINTER: 18,
} as const;

export type TypeWhich = (typeof TypeWhich)[keyof typeof TypeWhich];
