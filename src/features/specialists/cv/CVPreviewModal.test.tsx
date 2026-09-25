import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CVPreviewModal, type CVPreviewData } from './CVPreviewModal';

const FULL_DATA: CVPreviewData = {
  fullName: 'خالد سعيد عبدالله',
  nationalId: '1098765432',
  email: 'khaled@example.com',
  phone: '0512345678',
  edu: 'هندسة بيئية',
  years: '5',
  license: 'ELESL-2023-1234',
  exp: 'خبرة في الاستشارات البيئية.',
  portfolio: 'https://linkedin.com/in/khaled',
  profilePic: 'data:image/png;base64,abc',
  resumeFile: 'https://example.com/cv.pdf',
};

describe('CVPreviewModal', () => {
  it('shows the full unmasked ID for the specialist self-view', () => {
    render(<CVPreviewModal open onClose={() => {}} data={FULL_DATA} />);
    expect(screen.getByText('1098765432')).toBeInTheDocument();
    expect(screen.getByText('خالد سعيد عبدالله')).toBeInTheDocument();
    expect(screen.getByText('هندسة بيئية')).toBeInTheDocument();
    expect(screen.getByText('5 سنوات خبرة')).toBeInTheDocument();
    expect(screen.getByText('ELESL-2023-1234')).toBeInTheDocument();
  });

  it('masks the national ID for organizations (legacy first3+****+rest)', () => {
    render(<CVPreviewModal open onClose={() => {}} data={FULL_DATA} asOrganization />);
    expect(screen.getByText('109****432')).toBeInTheDocument();
    expect(screen.queryByText('1098765432')).not.toBeInTheDocument();
  });

  it('still exposes only the legacy organization-facing fields', () => {
    render(<CVPreviewModal open onClose={() => {}} data={FULL_DATA} asOrganization />);
    expect(screen.getByText('khaled@example.com')).toBeInTheDocument();
    expect(screen.getByText('0512345678')).toBeInTheDocument();
    expect(screen.getByText('خبرة في الاستشارات البيئية.')).toBeInTheDocument();
  });

  it('hides portfolio and resume rows when absent, shows legacy fallbacks', () => {
    render(
      <CVPreviewModal
        open
        onClose={() => {}}
        data={{ fullName: null, nationalId: '', edu: null, years: null, exp: null }}
      />,
    );
    expect(screen.getByText('بدون اسم')).toBeInTheDocument();
    expect(screen.getByText('لم يحدد التخصص')).toBeInTheDocument();
    expect(screen.getByText('مبتدئ')).toBeInTheDocument();
    expect(screen.getByText('لا توجد خبرات مفصلة.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'تحميل' })).not.toBeInTheDocument();
  });

  it('renders portfolio and resume download links when present', () => {
    render(<CVPreviewModal open onClose={() => {}} data={FULL_DATA} />);
    const resume = screen.getByRole('link', { name: 'تحميل' });
    expect(resume).toHaveAttribute('href', 'https://example.com/cv.pdf');
    expect(resume).toHaveAttribute('download', 'CV.pdf');
    expect(screen.getByRole('link', { name: 'https://linkedin.com/in/khaled' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('is an accessible dialog', () => {
    render(<CVPreviewModal open onClose={() => {}} data={FULL_DATA} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /السيرة الذاتية/ })).toBeInTheDocument();
  });

  it('never renders unsafe (javascript:) URLs as links', () => {
    render(
      <CVPreviewModal
        open
        onClose={() => {}}
        asOrganization
        data={{ fullName: 'x', portfolio: 'javascript:alert(1)', resumeFile: 'javascript:alert(2)' }}
      />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    expect(screen.getByText('javascript:alert(2)')).toBeInTheDocument();
  });

  it('rejects non-http protocols such as data: URLs', () => {
    render(
      <CVPreviewModal
        open
        onClose={() => {}}
        data={{ fullName: 'x', portfolio: 'data:text/html,<b>x</b>' }}
      />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('data:text/html,<b>x</b>')).toBeInTheDocument();
  });
});