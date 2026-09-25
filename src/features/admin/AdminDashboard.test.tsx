import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { AdminDashboard } from './AdminDashboard';

const adminRepoMock = vi.hoisted(() => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
  approveAccount: vi.fn(),
  getAdminAccounts: vi.fn(),
  isAdminAuthenticated: vi.fn(),
}));
vi.mock('@/features/admin/adminRepository', () => adminRepoMock);
vi.mock('@/features/auth/usePerformLogout', () => ({
  usePerformLogout: () => () => undefined,
}));

function renderDashboard() {
  return render(
    <ToastProvider>
      <AdminDashboard />
    </ToastProvider>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminRepoMock.adminLogin.mockReset();
    adminRepoMock.adminLogout.mockReset();
    adminRepoMock.approveAccount.mockReset();
    adminRepoMock.getAdminAccounts.mockReset();
    adminRepoMock.isAdminAuthenticated.mockReset();
  });

  it('shows the login panel when there is no admin session', async () => {
    adminRepoMock.isAdminAuthenticated.mockResolvedValue(false);

    renderDashboard();

    expect(await screen.findByText('دخول الإدارة')).toBeInTheDocument();
    expect(adminRepoMock.getAdminAccounts).not.toHaveBeenCalled();
  });

  it('shows an explicit error row (never an empty list) when accounts fail', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    adminRepoMock.isAdminAuthenticated.mockResolvedValue(true);
    adminRepoMock.getAdminAccounts.mockRejectedValue(
      new Error('خدمة البيانات غير مهيأة حالياً.'),
    );

    renderDashboard();

    expect(await screen.findByText('تعذر تحميل البيانات، حاول مرة أخرى.')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد بيانات.')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('lists pending accounts with an approve action', async () => {
    adminRepoMock.isAdminAuthenticated.mockResolvedValue(true);
    adminRepoMock.getAdminAccounts.mockResolvedValue({
      specialists: [{ id: 'u1', name: 'خالد سعيد', status: 'pending' }],
      organizations: [],
    });

    renderDashboard();

    expect(await screen.findByText('خالد سعيد')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'قبول' })).toBeInTheDocument();
    expect(screen.queryByText('تعذر تحميل البيانات، حاول مرة أخرى.')).not.toBeInTheDocument();
  });
});