import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { AdminLoginPanel } from './AdminLoginPanel';

const adminLoginMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/admin/adminRepository', () => ({
  adminLogin: adminLoginMock,
}));

function renderPanel(onLoggedIn = vi.fn()) {
  render(
    <ToastProvider>
      <AdminLoginPanel onLoggedIn={onLoggedIn} />
    </ToastProvider>,
  );
  return onLoggedIn;
}

describe('AdminLoginPanel (server-side password validation)', () => {
  beforeEach(() => {
    adminLoginMock.mockReset();
  });

  it('shows the Arabic error toast when the server rejects the password', async () => {
    adminLoginMock.mockRejectedValue(new Error('رمز الدخول غير صحيح!'));
    const onLoggedIn = renderPanel();

    fireEvent.change(screen.getByLabelText('رمز الدخول'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('رمز الدخول غير صحيح!');
    expect(adminLoginMock).toHaveBeenCalledWith('0000');
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('reports network failures with the generic Arabic message', async () => {
    adminLoginMock.mockRejectedValue(new Error('حدث خطأ في الاتصال'));
    renderPanel();

    fireEvent.change(screen.getByLabelText('رمز الدخول'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('حدث خطأ في الاتصال');
  });

  it('calls onLoggedIn after a successful server-side login', async () => {
    adminLoginMock.mockResolvedValue({ ok: true });
    const onLoggedIn = renderPanel();

    fireEvent.change(screen.getByLabelText('رمز الدخول'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('رمز الدخول')).toHaveValue('');
  });
});