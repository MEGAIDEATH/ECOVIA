import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('traps Tab focus inside the dialog', () => {
    render(
      <Modal open onClose={() => {}} title="اختبار" icon="info">
        <button type="button">الإجراء الأول</button>
        <button type="button">الإجراء الثاني</button>
      </Modal>,
    );
    const first = screen.getByRole('button', { name: 'إغلاق النافذة' });
    const last = screen.getByRole('button', { name: 'الإجراء الثاني' });
    last.focus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
