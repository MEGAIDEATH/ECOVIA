import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OtpInput } from './OtpInput';

function getBox(index: number): HTMLInputElement {
  return screen.getByLabelText(`خانة الرمز ${index}`) as HTMLInputElement;
}

describe('OtpInput', () => {
  it('renders six single-digit boxes (RTL layout, LTR input direction)', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    for (let i = 1; i <= 6; i += 1) {
      expect(getBox(i)).toBeInTheDocument();
    }
  });

  it('emits one character and moves focus forward', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.change(getBox(1), { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith('1');
    expect(document.activeElement).toBe(getBox(2));
  });

  it('truncates multi-character input to a single digit (legacy behavior)', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.change(getBox(1), { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith('1');
  });

  it('moves focus back on Backspace when the box is empty', () => {
    render(<OtpInput value="1" onChange={vi.fn()} />);
    getBox(2).focus();
    fireEvent.keyDown(getBox(2), { key: 'Backspace' });
    expect(document.activeElement).toBe(getBox(1));
  });

  it('supports pasting a full code (demo convenience)', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.paste(getBox(1), { clipboardData: { getData: () => '123456' } });
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });
});