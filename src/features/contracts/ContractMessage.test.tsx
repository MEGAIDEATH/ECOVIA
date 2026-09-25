import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';
import type { Message } from '@/types';

import { ContractMessage } from './ContractMessage';

const signContractMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/chat/messageRepository', () => ({
  signContract: signContractMock,
}));

function makeContractMessage(status: 'pending' | 'signed'): Message {
  return {
    id: 'msg-1',
    chatId: 'chat_org1_spec1',
    participants: ['org1', 'spec1'],
    senderId: 'org1',
    text: 'عقد جديد',
    isContract: true,
    contractData: {
      title: 'مسح بيئي',
      value: '15000',
      duration: 'شهرين',
      orgSig: 'منشأة أحمد',
      specSig: status === 'signed' ? 'خالد سعيد' : null,
      status,
    },
  };
}

function renderContract(message: Message, role: 'spec' | 'org', uid = 'spec1') {
  return render(
    <ToastProvider>
      <ContractMessage message={message} currentUid={uid} role={role} />
    </ToastProvider>,
  );
}

describe('ContractMessage', () => {
  beforeEach(() => {
    signContractMock.mockResolvedValue(undefined);
  });

  it('renders pending state with the legacy badge for the organization', () => {
    renderContract(makeContractMessage('pending'), 'org');
    expect(screen.getByText('وثيقة عقد')).toBeInTheDocument();
    expect(screen.getByText('بانتظار التوقيع')).toBeInTheDocument();
    expect(screen.getByText('بانتظار الأخصائي...')).toBeInTheDocument();
    expect(screen.getByText('منشأة أحمد')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('اسمك')).not.toBeInTheDocument();
  });

  it('shows the inline signature input to the pending specialist', () => {
    renderContract(makeContractMessage('pending'), 'spec');
    expect(screen.getByPlaceholderText('اسمك')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'توقيع' })).toBeInTheDocument();
  });

  it('requires a name before signing (legacy validation toast)', async () => {
    renderContract(makeContractMessage('pending'), 'spec');
    fireEvent.click(screen.getByRole('button', { name: 'توقيع' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('اكتب اسمك للتوقيع');
    expect(signContractMock).not.toHaveBeenCalled();
  });

  it('signs the contract and confirms with the legacy toast', async () => {
    renderContract(makeContractMessage('pending'), 'spec');
    fireEvent.change(screen.getByPlaceholderText('اسمك'), { target: { value: 'خالد سعيد' } });
    fireEvent.click(screen.getByRole('button', { name: 'توقيع' }));

    await waitFor(() =>
      expect(signContractMock).toHaveBeenCalledWith('msg-1', 'خالد سعيد', 'spec1'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('تم اعتماد العقد بنجاح!');
  });

  it('shows the signed state with the approved badge and signature', () => {
    renderContract(makeContractMessage('signed'), 'org');
    expect(screen.getByText('عقد معتمد')).toBeInTheDocument();
    expect(screen.getByText('خالد سعيد')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'توقيع' })).not.toBeInTheDocument();
    expect(screen.queryByText('بانتظار الأخصائي...')).not.toBeInTheDocument();
  });
});