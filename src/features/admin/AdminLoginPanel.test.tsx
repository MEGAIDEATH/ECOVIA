import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { AdminLoginPanel } from './AdminLoginPanel';

const adminLoginMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/admin/adminRepository', () => ({
  adminLogin: adminLoginMock,
}));

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('رمز الدخول'), { target: { value: password } });
}

function renderPanel(onLoggedIn = vi.fn()) {
  render(
    <ToastProvider>
      <AdminLoginPanel onLoggedIn={onLoggedIn} />
    </ToastProvider>,
  );
  return onLoggedIn;
}

describe('AdminLoginPanel (Better Auth email + password)', () => {
  beforeEach(() => {
    adminLoginMock.mockReset();
  });

  it('shows the Arabic error toast when the server rejects the credentials', async () => {
    adminLoginMock.mockRejectedValue(new Error('رمز الدخول غير صحيح!'));
    const onLoggedIn = renderPanel();

    fillCredentials('admin@ecovia.local', '0000');
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('رمز الدخول غير صحيح!');
    expect(adminLoginMock).toHaveBeenCalledWith('admin@ecovia.local', '0000');
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('reports network failures with the generic Arabic message', async () => {
    adminLoginMock.mockRejectedValue(new Error('حدث خطأ في الاتصال'));
    renderPanel();

    fillCredentials('admin@ecovia.local', '1234');
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('حدث خطأ في الاتصال');
  });

  it('calls onLoggedIn after a successful server-side login', async () => {
    adminLoginMock.mockResolvedValue(undefined);
    const onLoggedIn = renderPanel();

    fillCredentials('admin@ecovia.local', '1234');
    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
    expect(adminLoginMock).toHaveBeenCalledWith('admin@ecovia.local', '1234');
    expect(screen.getByLabelText('رمز الدخول')).toHaveValue('');
  });
});