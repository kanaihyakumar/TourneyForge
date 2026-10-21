import { InjectionToken } from '@angular/core';

export interface ChatConnection {
  readonly peer: string;
  on(event: 'open' | 'close', handler: () => void): void;
  on(event: 'data', handler: (data: unknown) => void): void;
  on(event: 'error', handler: (error: unknown) => void): void;
  send(data: unknown): void;
  close(): void;
}

export interface ChatPeer {
  on(event: 'open' | 'disconnected' | 'close', handler: () => void): void;
  on(event: 'connection', handler: (connection: ChatConnection) => void): void;
  on(event: 'error', handler: (error: { type?: string }) => void): void;
  connect(id: string, options?: { reliable?: boolean }): ChatConnection;
  reconnect?(): void;
  destroy(): void;
}

export type PeerFactory = (id?: string) => Promise<ChatPeer>;

export const PEER_FACTORY = new InjectionToken<PeerFactory>('PEER_FACTORY', {
  providedIn: 'root',
  factory: () => async (id?: string) => {
    const { Peer } = await import('peerjs');
    return (id ? new Peer(id) : new Peer()) as unknown as ChatPeer;
  },
});

export type ChatWire =
  | { t: 'hello'; id: string; name: string }
  | { t: 'queued' }
  | { t: 'accepted' }
  | { t: 'msg'; text: string }
  | { t: 'cancel' }
  | { t: 'closed' };

const WIRE_TYPES = ['hello', 'queued', 'accepted', 'msg', 'cancel', 'closed'];

export function parseWire(raw: unknown): ChatWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data['t'] !== 'string' || !WIRE_TYPES.includes(data['t'])) return null;
  if (data['t'] === 'msg') {
    return typeof data['text'] === 'string' ? { t: 'msg', text: data['text'] } : null;
  }
  if (data['t'] === 'hello') {
    return typeof data['id'] === 'string' && typeof data['name'] === 'string'
      ? { t: 'hello', id: data['id'], name: data['name'] }
      : null;
  }
  return { t: data['t'] } as ChatWire;
}
