import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createContract, sendMessage, signContract } from './messageRepository';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

const CHAT_ID = 'chat_orgA_specB';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      jsonResponse({ id: 'm1', chatId: CHAT_ID, senderId: 'specB', text: 'hello' }),
    ),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('messageRepository (server-backed chat API)', () => {
  it('sendMessage POSTs the payload and returns the stored message', async () => {
    const result = await sendMessage({ chatId: CHAT_ID, text: 'hello' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/messages',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ chatId: CHAT_ID, text: 'hello' });
    expect(result).toMatchObject({ id: 'm1', text: 'hello' });
  });

  it('sendMessage surfaces the server error message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'غير مصرح لك.' }, false));

    await expect(sendMessage({ chatId: CHAT_ID, text: 'x' })).rejects.toThrow('غير مصرح لك.');
  });

  it('createContract POSTs contractData without a specialist signature', async () => {
    await createContract(CHAT_ID, {
      title: 'مسح بيئي',
      value: '15000',
      duration: 'شهرين',
      orgSig: 'منشأة أحمد',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/messages',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      chatId: CHAT_ID,
      isContract: true,
      contractData: {
        title: 'مسح بيئي',
        value: '15000',
        duration: 'شهرين',
        orgSig: 'منشأة أحمد',
      },
    });
  });

  it('signContract POSTs messageId + signature to the sign endpoint', async () => {
    await signContract('m1', 'خالد سعيد');

    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/contracts/sign',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ messageId: 'm1', signature: 'خالد سعيد' });
  });

  it('signContract surfaces the server authorization refusal', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: 'غير مصرح لك بتوقيع هذا العقد.' }, false),
    );

    await expect(signContract('m1', 'signature')).rejects.toThrow(
      'غير مصرح لك بتوقيع هذا العقد.',
    );
  });
});
