import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendMessage, signContract, subscribeToMessages } from './messageRepository';

const collectionMock = vi.hoisted(() => vi.fn());
const docMock = vi.hoisted(() => vi.fn());
const getDocMock = vi.hoisted(() => vi.fn());
const onSnapshotMock = vi.hoisted(() => vi.fn());
const orderByMock = vi.hoisted(() => vi.fn((field: string, dir: string) => ({ orderBy: field, dir })));
const queryMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn());
const whereMock = vi.hoisted(() =>
  vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
);
const writeBatchMock = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => ({
  collection: collectionMock,
  doc: docMock,
  getDoc: getDocMock,
  onSnapshot: onSnapshotMock,
  orderBy: orderByMock,
  query: queryMock,
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  updateDoc: updateDocMock,
  where: whereMock,
  writeBatch: writeBatchMock,
}));

vi.mock('@/lib/firebase/client', () => ({ getDb: vi.fn(() => ({})) }));

vi.mock('@/lib/firestore/paths', () => ({
  conversationCollectionPath: 'chats',
  messageCollectionPath: 'messages',
}));

const CHAT_ID = 'chat_orgA_specB';

beforeEach(() => {
  collectionMock
    .mockReset()
    .mockImplementation((_db: unknown, path: string) => ({ collection: path }));
  docMock.mockReset().mockImplementation((...args: unknown[]) => {
    const path = args[1] as string | undefined;
    return { path: path ?? (args[0] as { collection: string }).collection };
  });
  queryMock.mockReset();
  whereMock.mockClear();
  getDocMock.mockReset();
  onSnapshotMock.mockReset();
  updateDocMock.mockReset();
  writeBatchMock.mockReset();
});

describe('messageRepository', () => {
  it('mirrors the read rule: the listener constrains chatId AND participants', () => {
    const unsubscribe = vi.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onData = vi.fn();

    const result = subscribeToMessages(CHAT_ID, 'specB', onData);

    const clauses = queryMock.mock.calls[0].slice(1);
    expect(clauses).toContainEqual({ field: 'chatId', op: '==', value: CHAT_ID });
    expect(clauses).toContainEqual({ field: 'participants', op: 'array-contains', value: 'specB' });
    expect(clauses).toContainEqual({ orderBy: 'timestamp', dir: 'asc' });

    const onNext = onSnapshotMock.mock.calls[0][1] as (snap: unknown) => void;
    onNext({ docs: [{ id: 'm1', data: () => ({ text: 'hi' }) }] });
    expect(onData).toHaveBeenCalledWith([{ id: 'm1', text: 'hi' }]);
    expect(result).toBe(unsubscribe);
  });

  it('writes messages whose participants match the chatId (create-rule consistency)', async () => {
    const setMock = vi.fn();
    const commitMock = vi.fn().mockResolvedValue(undefined);
    writeBatchMock.mockReturnValue({ set: setMock, commit: commitMock });

    await sendMessage({ chatId: CHAT_ID, senderId: 'specB', text: 'hello' });

    const [messageRef, messageData] = setMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(messageRef).toMatchObject({ path: 'messages' });
    expect(messageData).toMatchObject({
      chatId: CHAT_ID,
      participants: ['orgA', 'specB'],
      senderId: 'specB',
      text: 'hello',
    });
    expect(messageData).not.toHaveProperty('contractData');

    const [conversationRef, conversationData] = setMock.mock.calls[1] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(conversationRef).toMatchObject({ path: CHAT_ID });
    expect(conversationData).toMatchObject({ participants: ['orgA', 'specB'], lastMessage: 'hello' });

    expect(commitMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to sign when the caller is not the specialist participant', async () => {
    getDocMock.mockResolvedValue({
      id: 'm1',
      exists: () => true,
      data: () => ({
        isContract: true,
        chatId: CHAT_ID,
        participants: ['orgA', 'specB'],
        contractData: {
          title: 't',
          value: '1',
          duration: '1',
          orgSig: 'Org A',
          specSig: null,
          status: 'pending',
        },
      }),
    });

    await expect(signContract('m1', 'signature', 'orgA')).rejects.toThrow(
      'غير مصرح لك بتوقيع هذا العقد.',
    );
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
