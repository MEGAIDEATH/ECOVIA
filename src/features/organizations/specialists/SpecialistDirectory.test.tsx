import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Specialist } from '@/types';

import { SpecialistDirectory } from './SpecialistDirectory';

const SPECIALISTS: Specialist[] = [
  { id: 'spec-1', userId: 'spec-1', status: 'approved', fullName: 'خالد سعيد', nationalId: '1098765432', email: '', phone: '', license: '', edu: 'هندسة بيئية', region: 'منطقة الرياض' },
  { id: 'spec-2', userId: 'spec-2', status: 'approved', fullName: 'نورة العنزي', nationalId: '1098765433', email: '', phone: '', license: '', edu: 'استشارات استدامة', region: 'المنطقة الشرقية' },
];

describe('SpecialistDirectory', () => {
  it('renders the server-provided approved specialists', async () => {
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} />);
    expect(await screen.findByText('خالد سعيد')).toBeInTheDocument();
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('filters by region', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('فلترة حسب المنطقة'), 'المنطقة الشرقية');
    await waitFor(() => expect(screen.queryByText('خالد سعيد')).not.toBeInTheDocument());
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('offers a private request for a specialist', async () => {
    const user = userEvent.setup();
    const onPrivateRequest = vi.fn();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} onPrivateRequest={onPrivateRequest} />);
    await user.click(screen.getAllByRole('button', { name: /طلب خاص/ })[0]);
    expect(onPrivateRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'spec-1' }));
  });

  it('filters by name via the search field (React state, not DOM manipulation)', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'نورة');
    await waitFor(() => expect(screen.queryByText('خالد سعيد')).not.toBeInTheDocument());
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('filters by specialization/education', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'استشارات');
    await waitFor(() => expect(screen.queryByText('خالد سعيد')).not.toBeInTheDocument());
    expect(screen.getByText('نورة العنزي')).toBeInTheDocument();
  });

  it('shows a no-results message for unmatched queries', async () => {
    const user = userEvent.setup();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={vi.fn()} onContact={vi.fn()} />);
    await screen.findByText('خالد سعيد');

    await user.type(screen.getByPlaceholderText('ابحث بالتخصص أو الاسم...'), 'zzz');
    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeInTheDocument();
  });

  it('reports CV view and contact actions for a specialist', async () => {
    const user = userEvent.setup();
    const onViewCv = vi.fn();
    const onContact = vi.fn();
    render(<SpecialistDirectory specialists={SPECIALISTS} onViewCv={onViewCv} onContact={onContact} />);
    await screen.findByText('خالد سعيد');

    await user.click(screen.getAllByRole('button', { name: 'الملف' })[0]);
    expect(onViewCv).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spec-1', fullName: 'خالد سعيد' }),
    );

    await user.click(screen.getAllByRole('button', { name: 'تواصل' })[0]);
    expect(onContact).toHaveBeenCalledWith(expect.objectContaining({ id: 'spec-1' }));
  });

  it('shows the legacy empty state when nothing is approved', async () => {
    render(<SpecialistDirectory specialists={[]} onViewCv={vi.fn()} onContact={vi.fn()} />);
    expect(await screen.findByText('لا يوجد كفاءات معتمدة')).toBeInTheDocument();
  });
});