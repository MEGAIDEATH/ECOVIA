import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';

import { SpecialistStep1Form } from './SpecialistStep1Form';
import { RegistrationProvider } from './RegistrationProvider';

const pushMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

const scanMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/ocr/scanDocument', () => ({
  scanDocument: scanMock,
  ScanCancelledError: class ScanCancelledError extends Error {},
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

  it('starts scans under React Strict Mode (dev double-effect must not cancel them)', async () => {
    scanMock.mockReset().mockResolvedValue({
      name: 'خالد سعيد عبدالله',
      nationalId: '1098765432',
      phone: '0512345678',
    });
    const { container } = render(
      <StrictMode>
        <ToastProvider>
          <RegistrationProvider role="spec">
            <SpecialistStep1Form />
          </RegistrationProvider>
        </ToastProvider>
      </StrictMode>,
    );

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [new File(['x'], 'id.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() => expect(scanMock).toHaveBeenCalledTimes(1));
    // Regression: Strict Mode's simulated unmount used to leave the cancellation
    // flag stale, so `isCancelled()` reported true and every scan was silently
    // dropped under `npm run dev` (production never double-invokes effects).
    const options = scanMock.mock.calls[0][2] as { isCancelled: () => boolean };
    expect(options.isCancelled()).toBe(false);
    expect(await screen.findByDisplayValue('1098765432')).toBeInTheDocument();
  });
});
