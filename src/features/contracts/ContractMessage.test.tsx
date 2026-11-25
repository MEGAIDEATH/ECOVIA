import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';
import type { Message } from '@/types';

import { ContractMessage } from './ContractMessage';

const signContractMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/chat/messageRepository', () => ({
  signContract: signContractMock,
}));

function makeContractMessage(status: 'pending' | 'signed' | 'cancelled'): Message {
  return {
    id: 'msg-1',
    conversationId: 'chat_org1_spec1',
    senderUserId: 'org1',
    text: 'عقد جديد',
    isContract: true,
    contractData: {
      contractId: '0f3d3600-2e7d-4733-8fbf-af00000000c1',
      title: 'مسح بيئي',
      value: '15000',
      duration: 'شهرين',
      orgSig: 'منشأة أحمد',
      specSig: status === 'signed' ? 'خالد سعيد' : null,
      status,
    },
  };
}

function renderContract(message: Message, role: 'spec' | 'org') {
  return render(
    <ToastProvider>
      <ContractMessage message={message} role={role} />
    </ToastProvider>,
  );
}

describe('ContractMessage', () => {
  beforeEach(() => {
    signContractMock.mockResolvedValue(undefined);
  });

  it('renders a pending contract as a draft for the organization, with a link to the document', () => {
    renderContract(makeContractMessage('pending'), 'org');
    expect(screen.getByText('وثيقة عقد')).toBeInTheDocument();
    expect(screen.getByText('مسودة — بانتظار توقيع الأخصائي')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /عرض مسودة العقد/ })).toHaveAttribute(
      'href',
      '/contracts/0f3d3600-2e7d-4733-8fbf-af00000000c1',
    );
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
      expect(signContractMock).toHaveBeenCalledWith(
        { contractId: '0f3d3600-2e7d-4733-8fbf-af00000000c1', messageId: 'msg-1' },
        'خالد سعيد',
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('تم اعتماد العقد بنجاح!');
  });

  it('never offers a signature on a cancelled contract', () => {
    renderContract(makeContractMessage('cancelled'), 'spec');
    expect(screen.getByText('عقد ملغى')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('اسمك')).not.toBeInTheDocument();
  });

  it('shows the signed state with the signed badge and signature', () => {
    renderContract(makeContractMessage('signed'), 'org');
    expect(screen.getByText('عقد موقّع')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^عرض العقد$/ })).toBeInTheDocument();
    expect(screen.getByText('خالد سعيد')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'توقيع' })).not.toBeInTheDocument();
    expect(screen.queryByText('بانتظار الأخصائي...')).not.toBeInTheDocument();
  });
});