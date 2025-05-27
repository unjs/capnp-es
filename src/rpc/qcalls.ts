// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

import { AnswerQCall } from "./answer";

export type QCallSlot = AnswerQCall | null;

export class Qcalls {
  constructor(public data: QCallSlot[]) {}

  static copyOf(data: QCallSlot[]): Qcalls {
    return new Qcalls([...data]);
  }

  len(): number {
    return this.data.length;
  }

  clear(i: number): void {
    this.data[i] = null;
  }

  copy(): Qcalls {
    return Qcalls.copyOf(this.data);
  }
}
