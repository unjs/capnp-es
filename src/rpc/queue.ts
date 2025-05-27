// Based on https://github.com/jdiaz5513/capnp-ts (MIT - Julián Díaz)

// A Queue wraps a QueueStorage to provide queue operations.
export class Queue {
  start: number = 0;
  cap: number;

  // creates a new queue that starts with n elements.
  // The interface's length must not change over the course of
  // the queue's usage.
  constructor(
    public q: QueueStorage,
    public n: number,
  ) {
    this.cap = q.len();
  }

  // len returns the length of the queue. This is different from the underlying
  // interface's length, which is the queue's capacity.
  len(): number {
    return this.n;
  }

  // push reserves space for an element on the queue, returning its index.
  // if the queue is full, push returns -1.
  push(): number {
    if (this.n >= this.cap) {
      return -1;
    }
    const i = (this.start + this.n) % this.cap;
    this.n++;
    return i;
  }

  // front returns the index of the front of the queue, or -1 if the queue is empty.
  front(): number {
    if (this.n === 0) {
      return -1;
    }
    return this.start;
  }

  // pop pops an element from the queue, returning whether it succeeded.
  pop(): boolean {
    if (this.n === 0) {
      return false;
    }
    this.q.clear(this.start);
    this.start = (this.start + 1) % this.cap;
    this.n--;
    return true;
  }
}

export interface QueueStorage {
  // len returns the number of elements available
  len(): number;
  // clear removes the element at i
  clear(i: number): void;
}
