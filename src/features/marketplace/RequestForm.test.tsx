import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ActionState } from '@/lib/actionState';

import { RequestForm } from './RequestForm';
import { ServiceTypeMultiSelect } from './ServiceTypeMultiSelect';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const idle = vi.fn(async (): Promise<ActionState> => ({ status: 'idle' }));

describe('Submit New Service Request form', () => {
  it('replaces Service Name with a Service Type multi-select of the four exact services', () => {
    render(<RequestForm action={idle} target={null} defaultRegionCode={null} />);
    const group = screen.getByRole('group', { name: /نوع الخدمة/ });
    const options = within(group).getAllByRole('checkbox');
    expect(options).toHaveLength(4);
    for (const name of [
      'Environmental Activity Classification Service',
      'Category 1 Construction Environmental Permit Issuance Service',
      'Category 1 Operational Environmental Permit Issuance Service',
      'Environmental Management Plan Service',
    ]) {
      expect(within(group).getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/اسم الخدمة/)).not.toBeInTheDocument();
  });

  it('has Activity Description and Notes, and no Price or Duration fields', () => {
    render(<RequestForm action={idle} target={null} defaultRegionCode={null} />);
    expect(screen.getByLabelText(/وصف النشاط/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ملاحظات/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/تكلفة|السعر|ريال/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/المدة/)).not.toBeInTheDocument();
    expect(document.querySelector('[name="cost"], [name="durationValue"], [name="durationUnit"], [name="serviceName"]')).toBeNull();
  });

  it('carries the designated specialist of a private request', () => {
    render(<RequestForm action={idle} target={{ id: 'spec-1', name: 'ريم الاختبارية' }} defaultRegionCode={null} />);
    expect(screen.getByText(/طلب خاص موجّه إلى/)).toBeInTheDocument();
    expect(document.querySelector('input[name="targetSpecialistId"]')).toHaveValue('spec-1');
  });

  it('shows the server’s field errors', async () => {
    const failing = vi.fn(
      async (): Promise<ActionState> => ({
        status: 'error',
        message: 'راجع الحقول المظللة.',
        fieldErrors: { serviceTypes: 'اختر نوع خدمة واحداً على الأقل من القائمة.' },
      }),
    );
    const user = userEvent.setup();
    render(<RequestForm action={failing} target={null} defaultRegionCode={null} />);
    await user.type(screen.getByLabelText(/وصف النشاط/), 'نشاط صناعي');
    await user.click(screen.getByRole('button', { name: 'نشر الطلب' }));
    expect(await screen.findByText('اختر نوع خدمة واحداً على الأقل من القائمة.')).toBeInTheDocument();
    // Controlled fields keep the user's text after a failed submission.
    expect(screen.getByLabelText(/وصف النشاط/)).toHaveValue('نشاط صناعي');
  });
});

describe('ServiceTypeMultiSelect', () => {
  it('selects several values with the keyboard and lists them as removable chips', async () => {
    const user = userEvent.setup();
    render(<ServiceTypeMultiSelect />);
    const [first, , , last] = screen.getAllByRole('checkbox');
    first.focus();
    await user.keyboard(' ');
    last.focus();
    await user.keyboard(' ');
    expect(first).toBeChecked();
    expect(last).toBeChecked();

    const remove = screen.getByRole('button', { name: /إزالة خدمة تصنيف النشاط البيئي/ });
    await user.click(remove);
    expect(first).not.toBeChecked();
    expect(last).toBeChecked();
  });

  it('submits one form value per selected service', () => {
    render(
      <form data-testid="form">
        <ServiceTypeMultiSelect defaultValue={['activity_classification', 'environmental_management_plan']} />
      </form>,
    );
    const data = new FormData(screen.getByTestId('form') as HTMLFormElement);
    expect(data.getAll('serviceTypes')).toEqual(['activity_classification', 'environmental_management_plan']);
  });
});
