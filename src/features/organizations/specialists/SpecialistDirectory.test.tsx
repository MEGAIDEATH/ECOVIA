import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Specialist } from '@/types';

import { SpecialistDirectory } from './SpecialistDirectory';

const getApprovedSpecialistsMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/specialists/specialistRepository', () => ({
  getApprovedSpecialists: getApprovedSpecialistsMock,
}));

const authMock = vi.hoisted(() => ({ user: { uid: 'org-1' }, loading: false }));
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => authMock,
}));

const SPECIALISTS: Specialist[] = [
  { id: 'org-1', status: 'approved', fullName: 'مستخدم خاص', nationalId: '1', email: '', phone: '', license: '' },
  { id: 'spec-1', status: 'approved', fullName: 'خالد سعيد', nationalId: '1098765432', email: '', phone: '', license: '', edu: 'هندسة بيئية' },
  { id: 'spec-2', status: 'approved', fullName: 'نورة العنزي', nationalId: '1098765433', email: '', phone: '', license: '', edu: 'استشارات استدامة' },
];

describe('SpecialistDirectory', () => {
  beforeEach(() => {
    getApprovedSpecialistsMock.mockResolvedValue(SPECIALISTS);
  });

  it('loads approved specialists and excludes the current organization', async () => {
    render(<SpecialistDirectory onViewCv={vi.fn()} onContact={vi.fn()} />);
    expect(await screen.findByText('خالد سعيد')).toBeInTheDocument();
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
    expect(screen.queryByText('مستخدم خاص')).not.toBeInTheDocument();
  });

  it('filters by name via the search field (React state, not DOM manipulation)', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'نورة');
    await waitFor(() => expect(screen.queryByText('خالد سعيد')).not.toBeInTheDocument());
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('filters by specialization/education', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'استشارات');
    await waitFor(() => expect(screen.queryByText('خالد سعيد')).not.toBeInTheDocument());
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('shows a no-results message for unmatched queries', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'zzz');
    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeInTheDocument();
  });

  it('reports CV view and contact actions for a specialist', async () => {
    const user = userEvent.setup();
    const onViewCv = vi.fn();
    const onContact = vi.fn();
    render(<SpecialistDirectory onViewCv={onViewCv} onContact={onContact} />);
    await screen.findByText('خالد سعيد');

    await user.click(screen.getAllByRole('button', { name: 'الملف' })[0]);
    expect(onViewCv).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spec-1', fullName: 'خالد سعيد' }),
    );

    await user.click(screen.getAllByRole('button', { name: 'تواصل' })[0]);
    expect(onContact).toHaveBeenCalledWith(expect.objectContaining({ id: 'spec-1' }));
  });

  it('shows the legacy empty state when nothing is approved', async () => {
    getApprovedSpecialistsMock.mockResolvedValue([]);
    render(<SpecialistDirectory onViewCv={vi.fn()} onContact={vi.fn()} />);
    expect(await screen.findByText('لا يوجد كفاءات معتمدة')).toBeInTheDocument();
  });
});