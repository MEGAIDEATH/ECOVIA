import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { ChatComposer } from './ChatComposer';

const sendMessageMock = vi.hoisted(() => vi.fn());
vi.mock('./messageRepository', () => ({
  sendMessage: sendMessageMock,
}));

function renderComposer() {
  return render(
    <ToastProvider>
      <ChatComposer chatId="chat_o_s" senderId="spec-uid" placeholder="اكتب رسالتك هنا..." />
    </ToastProvider>,
  );
}

describe('ChatComposer', () => {
  beforeEach(() => {
    sendMessageMock.mockResolvedValue(undefined);
  });

  it('keeps the send button disabled while the input is empty', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
  });

  it('sends the trimmed message and clears the input', async () => {
    renderComposer();
    const input = screen.getByLabelText('نص الرسالة');
    fireEvent.change(input, { target: { value: '  مرحباً بك  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));

    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1));
    expect(sendMessageMock).toHaveBeenCalledWith({
      chatId: 'chat_o_s',
      senderId: 'spec-uid',
      text: 'مرحباً بك',
    });
    expect(input).toHaveValue('');
  });

  it('restores the text and shows an Arabic error toast when sending fails', async () => {
    sendMessageMock.mockRejectedValueOnce(new Error('network'));
    renderComposer();
    const input = screen.getByLabelText('نص الرسالة');
    fireEvent.change(input, { target: { value: 'نص مهم' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذر إرسال الرسالة، حاول مرة أخرى.',
    );
    await waitFor(() => expect(input).toHaveValue('نص مهم'));
  });
});