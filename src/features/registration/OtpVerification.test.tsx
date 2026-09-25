import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { OtpVerification } from './OtpVerification';
import { RegistrationProvider } from './RegistrationProvider';

const routerMocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

const authMock = vi.hoisted(() => ({ user: { uid: 'new-user' }, loading: false }));
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => authMock,
}));

const registerSpecialistMock = vi.hoisted(() => vi.fn());
const registerOrganizationMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/registration/registrationService', () => ({
  registerSpecialist: registerSpecialistMock,
  registerOrganization: registerOrganizationMock,
}));

function renderOtp(role: 'spec' | 'org') {
  return render(
    <ToastProvider>
      <RegistrationProvider role={role}>
        <OtpVerification role={role} />
      </RegistrationProvider>
    </ToastProvider>,
  );
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  for (let i = 0; i < code.length; i += 1) {
    await user.type(screen.getByLabelText(`خانة الرمز ${i + 1}`), code[i]);
  }
}

describe('OtpVerification (demo flow)', () => {
  beforeEach(() => {
    routerMocks.replace.mockClear();
    registerSpecialistMock
      .mockReset()
      .mockResolvedValue({ status: 'created', role: 'spec', accountStatus: 'pending', uid: 'u1' });
    registerOrganizationMock
      .mockReset()
      .mockResolvedValue({ status: 'created', role: 'org', accountStatus: 'pending', uid: 'u1' });
    localStorage.clear();
  });

  it('requires six digits before verifying', async () => {
    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '12345');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'أدخل رمز التحقق المكون من 6 أرقام',
    );
    expect(registerSpecialistMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong demo code with the Arabic error', async () => {
    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '999999');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('رمز التحقق غير صحيح!');
    expect(registerSpecialistMock).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it('creates a pending specialist and routes to the waiting room on 123456', async () => {
    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(registerSpecialistMock).toHaveBeenCalledTimes(1));
    const payload = registerSpecialistMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      fullName: '',
      license: '',
    });
    expect(payload).not.toHaveProperty('ocrSucceeded');
    expect(payload).not.toHaveProperty('status');
    expect(localStorage.getItem('preferredRole')).toBe('spec');
    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/waiting?role=spec'));
  });

  it('stores the organization role preference for org registration', async () => {
    const user = userEvent.setup();
    renderOtp('org');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(registerOrganizationMock).toHaveBeenCalledTimes(1));
    expect(registerOrganizationMock.mock.calls[0][0]).not.toHaveProperty('ocrSucceeded');
    expect(registerOrganizationMock.mock.calls[0][0]).not.toHaveProperty('status');
    expect(localStorage.getItem('preferredRole')).toBe('org');
    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/waiting?role=org'));
  });

  it('shows the demo hint copy from the legacy screen', () => {
    renderOtp('spec');
    expect(screen.getByText('للتجربة: استخدم 123456')).toBeInTheDocument();
    expect(screen.getByText('أدخل رمز التحقق')).toBeInTheDocument();
    expect(screen.getByText('رمز الدخول الآمن')).toBeInTheDocument();
  });

  it('routes an existing pending specialist to the waiting room as a normal state (no error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerSpecialistMock.mockResolvedValue({
      status: 'existing',
      role: 'spec',
      accountStatus: 'pending',
      uid: 'u1',
    });

    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/waiting?role=spec'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'هذا الحساب مسجل مسبقاً، سيتم فتح حالة التحقق الحالية.',
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(localStorage.getItem('preferredRole')).toBe('spec');
  });

  it('routes an existing approved specialist straight to the dashboard (no error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerSpecialistMock.mockResolvedValue({
      status: 'existing',
      role: 'spec',
      accountStatus: 'approved',
      uid: 'u1',
    });

    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/specialist'));
    expect(await screen.findByRole('alert')).toHaveTextContent('تم التفعيل!');
    expect(consoleError).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalledWith('/waiting?role=spec');
  });

  it('routes an existing pending organization to the waiting room as a normal state (no error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerOrganizationMock.mockResolvedValue({
      status: 'existing',
      role: 'org',
      accountStatus: 'pending',
      uid: 'u1',
    });

    const user = userEvent.setup();
    renderOtp('org');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/waiting?role=org'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'هذا الحساب مسجل مسبقاً، سيتم فتح حالة التحقق الحالية.',
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('routes an existing approved organization straight to its dashboard (no error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerOrganizationMock.mockResolvedValue({
      status: 'existing',
      role: 'org',
      accountStatus: 'approved',
      uid: 'u1',
    });

    const user = userEvent.setup();
    renderOtp('org');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith('/organization'));
    expect(await screen.findByRole('alert')).toHaveTextContent('تم التفعيل!');
    expect(consoleError).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalledWith('/waiting?role=org');
  });

  it('still surfaces unexpected registration failures as an error toast', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerSpecialistMock.mockRejectedValue(new Error('تعذر إتمام التسجيل، حاول مرة أخرى.'));

    const user = userEvent.setup();
    renderOtp('spec');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذر إتمام التسجيل، حاول مرة أخرى.',
    );
    expect(consoleError).toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});