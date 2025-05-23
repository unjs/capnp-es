// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import * as schema from "../capnp/schema";
import * as capnp from "..";
import { format, pad } from "../util";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import * as E from "./errors";
import { getDisplayNamePrefix, getFullClassName, getJsType } from "./file";
import * as util from "./util";
import {
  getPointer,
  getUint16,
  testWhich,
} from "../serialization/pointers/struct.utils";

export function createConcreteListProperty(
  ctx: CodeGeneratorFileContext,
  field: schema.Field,
): string {
  const name = `_${util.c2t(field.name)}`;
  const type = getJsType(ctx, field.slot.type, true);
  return `static ${name}: ${type};`;
}

export function createNestedNodeProperty(node: schema.Node): string {
  const name = getDisplayNamePrefix(node);
  const initializer = getFullClassName(node);
  return `static readonly ${name} = ${initializer};`;
}

export function createUnionConstProperty(
  fullClassName: string,
  field: schema.Field,
): string {
  const name = util.c2s(field.name);
  const initializer = `${fullClassName}_Which.${name}`;

  return `static readonly ${name} = ${initializer};`;
}

export function createValueExpression(value: schema.Value): string {
  let p: capnp.Pointer;

  switch (value.which()) {
    case schema.Value.BOOL: {
      return value.bool ? `true` : `false`;
    }

    case schema.Value.ENUM: {
      return String(value.enum);
    }

    case schema.Value.FLOAT32: {
      return String(value.float32);
    }

    case schema.Value.FLOAT64: {
      return String(value.float64);
    }

    case schema.Value.INT8: {
      return String(value.int8);
    }

    case schema.Value.INT16: {
      return String(value.int16);
    }

    case schema.Value.INT32: {
      return String(value.int32);
    }

    case schema.Value.INT64: {
      return createBigIntExpression(value.int64);
    }

    case schema.Value.UINT8: {
      return String(value.uint8);
    }

    case schema.Value.UINT16: {
      return String(value.uint16);
    }

    case schema.Value.UINT32: {
      return String(value.uint32);
    }

    case schema.Value.UINT64: {
      return createBigIntExpression(value.uint64);
    }

    case schema.Value.TEXT: {
      return JSON.stringify(value.text);
    }

    case schema.Value.VOID: {
      return "undefined";
    }

    case schema.Value.ANY_POINTER: {
      p = value.anyPointer;

      break;
    }

    case schema.Value.DATA: {
      p = value.data;

      break;
    }

    case schema.Value.LIST: {
      p = value.list;

      break;
    }

    case schema.Value.STRUCT: {
      p = value.struct;

      break;
    }

    case schema.Value.INTERFACE: {
      testWhich("interface", getUint16(0, value), 17, value);
      p = getPointer(0, value);

      break;
    }
    default: {
      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, value.which()));
    }
  }

  const message = new capnp.Message();
  message.setRoot(p);

  const buf = new Uint8Array(message.toPackedArrayBuffer());

  const values: string[] = [];
  for (let i = 0; i < buf.byteLength; i++) {
    values.push(`0x${pad(buf[i].toString(16), 2)}`);
  }

  return `$.readRawPointer(new Uint8Array([${values.join(",")}]).buffer)`;
}

export function createBigIntExpression(value: bigint): string {
  let v = value.toString(16);
  let sign = "";
  if (v[0] === "-") {
    v = v.slice(1);
    sign = "-";
  }
  return `${sign}BigInt("0x${v}")`;
}
