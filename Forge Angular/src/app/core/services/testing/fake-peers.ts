import { ChatConnection, ChatPeer, PeerFactory } from '../chat-transport';

type Handler = (arg?: any) => void;

class FakeConnection implements ChatConnection {
  readonly handlers: Record<string, Handler[]> = {};
  other: FakeConnection | null = null;
  closed = false;
  readonly sent: unknown[] = [];

  constructor(readonly peer: string) {}

  on(event: string, handler: Handler): void {
    (this.handlers[event] ??= []).push(handler);
  }

  emit(event: string, arg?: unknown): void {
    (this.handlers[event] ?? []).forEach((h) => h(arg));
  }

  send(data: unknown): void {
    this.sent.push(data);
    const target = this.other;
    if (target && !target.closed) queueMicrotask(() => target.emit('data', structuredClone(data)));
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.emit('close');
    const other = this.other;
    if (other && !other.closed) {
      other.closed = true;
      queueMicrotask(() => other.emit('close'));
    }
  }
}

export class FakePeer implements ChatPeer {
  readonly handlers: Record<string, Handler[]> = {};
  destroyed = false;
  readonly outgoing: FakeConnection[] = [];

  constructor(
    readonly id: string,
    private readonly hub: FakePeerHub,
  ) {}

  on(event: string, handler: Handler): void {
    (this.handlers[event] ??= []).push(handler);
  }

  emit(event: string, arg?: unknown): void {
    (this.handlers[event] ?? []).forEach((h) => h(arg));
  }

  connect(target: string): ChatConnection {
    const mine = new FakeConnection(target);
    const theirs = new FakeConnection(this.id);
    mine.other = theirs;
    theirs.other = mine;
    this.outgoing.push(mine);
    const remote = this.hub.peers.get(target);
    queueMicrotask(() => {
      if (!remote || remote.destroyed) {
        this.emit('error', { type: 'peer-unavailable' });
        return;
      }
      remote.emit('connection', theirs);
      mine.emit('open');
      theirs.emit('open');
    });
    return mine;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.hub.peers.get(this.id) === this) this.hub.peers.delete(this.id);
    this.outgoing.forEach((c) => c.close());
  }
}

export class FakePeerHub {
  readonly peers = new Map<string, FakePeer>();
  private counter = 0;
  failNext: unknown = null;

  readonly factory: PeerFactory = async (id?: string) => {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
    const peerId = id ?? `peer-${++this.counter}`;
    const peer = new FakePeer(peerId, this);
    if (this.peers.has(peerId)) {
      setTimeout(() => peer.emit('error', { type: 'unavailable-id' }));
    } else {
      this.peers.set(peerId, peer);
      setTimeout(() => peer.emit('open'));
    }
    return peer;
  };
}

export const flush = async (times = 4): Promise<void> => {
  for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve));
};
