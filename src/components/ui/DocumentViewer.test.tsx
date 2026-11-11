import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentViewer } from './DocumentViewer';

const SRC = '/api/files/0f3d3600-2e7d-4733-8fbf-af0000000001';

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:doc');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function mockFetch(status: number, type = 'application/pdf', body = 'pdf') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(status === 200 ? new Blob([body], { type }) : null, { status, headers: { 'content-type': type } })),
  );
}

describe('DocumentViewer', () => {
  it('shows a loading state, then the PDF itself (not just a filename)', async () => {
    mockFetch(200);
    render(<DocumentViewer src={SRC} title="السيرة الذاتية" />);
    expect(screen.getByRole('status')).toHaveTextContent('جاري تحميل المستند');
    const frame = await screen.findByTitle('السيرة الذاتية');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'blob:doc');
    expect(fetch).toHaveBeenCalledWith(SRC, expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('renders images as images', async () => {
    mockFetch(200, 'image/png');
    render(<DocumentViewer src={SRC} title="صورة" />);
    expect((await screen.findByAltText('صورة')).tagName).toBe('IMG');
  });

  it.each([
    [403, 'ليست لديك صلاحية'],
    [404, 'المستند غير موجود'],
  ])('explains HTTP %i failures', async (status, message) => {
    mockFetch(status);
    render(<DocumentViewer src={SRC} title="x" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('refuses anything but the protected file route', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<DocumentViewer src="https://evil.example/cv.pdf" title="x" />);
    expect(screen.getByText('رابط المستند غير صالح.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
