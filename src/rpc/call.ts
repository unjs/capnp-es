// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { Struct } from "../serialization/pointers/struct";
import { Pointer } from "../serialization/pointers/pointer";
import { Message } from "../serialization/message";
import { Method } from "./method";
import { initStruct } from "../serialization/pointers/struct.utils";

// The Call type holds the record for an outgoing interface call.
export type Call<P extends Struct, R extends Struct> =
  FuncCall<P, R> | DataCall<P, R>;

export interface BaseCall<P extends Struct, R extends Struct> {
  // Method is the interface ID and method ID, along with the optional name, of
  // the method to call.
  method: Method<P, R>;
}

export type FuncCall<P extends Struct, R extends Struct> = BaseCall<P, R> & {
  // ParamsFunc is a function that populates an allocated struct with
  // the parameters for the call.  ParamsSize determines the size of the
  // struct to allocate.  This is used when application code is using a
  // client.  These settings should be set together; they are mutually
  // exclusive with Params.
  paramsFunc?(params: P): void;
};

export type DataCall<P extends Struct, R extends Struct> = BaseCall<P, R> & {
  // Params is a struct containing parameters for the call.
  // This should be set when the RPC system receives a call for an
  // exported interface.  It is mutually exclusive with ParamsFunc
  // and ParamsSize.
  params: P;
};

export function isFuncCall<P extends Struct, R extends Struct>(
  call: Call<P, R>,
): call is FuncCall<P, R> {
  return !isDataCall(call);
}

export function isDataCall<P extends Struct, R extends Struct>(
  call: Call<P, R>,
): call is DataCall<P, R> {
  return !!(call as DataCall<P, R>).params;
}

// Copy clones a call, ensuring that its params are placed.
// If Call.ParamsFunc is nil, then the same Call will be returned.
export function copyCall<P extends Struct, R extends Struct>(
  call: Call<P, R>,
): DataCall<P, R> {
  if (isDataCall(call)) {
    return call;
  }

  // FIXME: it's not clear to me why the Go implementation needed
  // copyCall in the first place - and why it needed params to be
  // placed.
  return {
    method: call.method,
    params: placeParams(call, undefined),
  };
}

export function placeParams<P extends Struct, R extends Struct>(
  call: Call<P, R>,
  contentPtr: Pointer | undefined,
): P {
  if (isDataCall(call)) {
    return call.params;
  }

  // TODO: this needs to be reviewed, I'm pretty sure it's the wrong
  // way to do it.
  let p: P;
  if (contentPtr) {
    p = new call.method.ParamsClass(
      contentPtr.segment,
      contentPtr.byteOffset,
      contentPtr._capnp.depthLimit,
    );
  } else {
    const msg = new Message();
    p = new call.method.ParamsClass(msg.getSegment(0), 0);
  }
  initStruct(call.method.ParamsClass._capnp.size, p);
  if (call.paramsFunc) {
    call.paramsFunc(p);
  }
  return p;
}
