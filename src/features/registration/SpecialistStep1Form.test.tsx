import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { SpecialistStep1Form } from './SpecialistStep1Form';
import { RegistrationProvider } from './RegistrationProvider';

const pushMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

function renderStep1() {
  return render(
    <ToastProvider>
      <RegistrationProvider role="spec">
        <SpecialistStep1Form />
      </RegistrationProvider>
    </ToastProvider>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('الاسم الثلاثي'), 'خالد سعيد عبدالله');
  await user.type(screen.getByLabelText('رقم الهوية'), '1098765432');
  await user.type(screen.getByLabelText('البريد الإلكتروني'), 'khaled@example.com');
  await user.type(screen.getByLabelText('رقم الجوال'), '0512345678');
}

describe('SpecialistStep1Form', () => {
  it('renders the legacy Arabic labels and scanner card', () => {
    renderStep1();
    expect(screen.getByText('تسجيل أخصائي')).toBeInTheDocument();
    expect(screen.getByText('البيانات الشخصية')).toBeInTheDocument();
    expect(screen.getByText('القارئ الآلي للبيانات')).toBeInTheDocument();
    expect(screen.getByText('المتابعة')).toBeInTheDocument();
  });

  it('blocks empty submission with Arabic inline errors (invalid data)', async () => {
    const user = userEvent.setup();
    renderStep1();
    await user.click(screen.getByRole('button', { name: /المتابعة/ }));

    expect(await screen.findByText('الاسم الثلاثي مطلوب')).toBeInTheDocument();
    expect(screen.getByText('رقم الهوية مطلوب')).toBeInTheDocument();
    expect(screen.getByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();
    expect(screen.getByText('رقم الجوال مطلوب')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects malformed email with an Arabic message', async () => {
    const user = userEvent.setup();
    renderStep1();
    await user.type(screen.getByLabelText('الاسم الثلاثي'), 'خالد سعيد عبدالله');
    await user.type(screen.getByLabelText('رقم الهوية'), '1098765432');
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'bad-email');
    await user.type(screen.getByLabelText('رقم الجوال'), '0512345678');
    await user.click(screen.getByRole('button', { name: /المتابعة/ }));

    expect(await screen.findByText('البريد الإلكتروني غير صالح')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates to step 2 on valid submission (role: specialist)', async () => {
    const user = userEvent.setup();
    renderStep1();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /المتابعة/ }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/register/specialist/step-2'));
  });
});