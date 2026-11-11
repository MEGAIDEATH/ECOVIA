'use client';

import { useEffect, useState } from 'react';

import { isProtectedFileUrl } from '@/lib/utils/url';

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; objectUrl: string; kind: 'pdf' | 'image' }
  | { status: 'error'; message: string };

const ERRORS: Record<number, string> = {
  401: 'انتهت الجلسة، سجّل الدخول مرة أخرى لعرض المستند.',
  403: 'ليست لديك صلاحية لعرض هذا المستند.',
  404: 'المستند غير موجود أو تم حذفه.',
};

interface DocumentViewerProps {
  /** Protected file URL (`/api/files/{id}`). */
  src: string;
  title: string;
  /** Suggested file name for the download button. */
  downloadName?: string;
  className?: string;
}

/**
 * Inline viewer for protected documents. The file is fetched with the user's
 * session (so `/api/files` authorization still applies) and displayed from a
 * local object URL: PDFs in a frame, images as images. Storage paths are never
 * exposed — only the protected route is requested.
 */
export function DocumentViewer({ src, title, downloadName = 'document', className = '' }: DocumentViewerProps) {
  const [state, setState] = useState<ViewerState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const valid = isProtectedFileUrl(src);

  useEffect(() => {
    if (!valid) return;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    fetch(src, { signal: controller.signal, credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(ERRORS[res.status] ?? 'تعذر تحميل المستند، حاول مرة أخرى.');
        const type = (res.headers.get('content-type') ?? '').toLowerCase();
        const kind = type.includes('pdf') ? 'pdf' : type.startsWith('image/') ? 'image' : null;
        if (!kind) throw new Error('صيغة المستند غير مدعومة للعرض.');
        const blob = await res.blob();
        if (blob.size === 0) throw new Error('المستند فارغ أو تالف.');
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', objectUrl, kind });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'تعذر تحميل المستند.' });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, valid, attempt]);

  if (!valid) {
    return <p className="alert alert-danger">رابط المستند غير صالح.</p>;
  }

  return (
    <div className={`overflow-hidden rounded-card border border-line bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-wash px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-bold text-forest">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-secondary">
            {state.status === 'ready' && state.kind === 'image' ? 'image' : 'picture_as_pdf'}
          </span>
          {title}
        </p>
        {state.status === 'ready' && (
          <div className="flex gap-2">
            <a href={state.objectUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              فتح في نافذة جديدة
            </a>
            <a href={state.objectUrl} download={downloadName} className="btn btn-soft btn-sm">
              تحميل
            </a>
          </div>
        )}
      </div>

      {state.status === 'loading' && (
        <div role="status" className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted">
          <span aria-hidden="true" className="size-6 animate-spin rounded-full border-[3px] border-surface-container-high border-t-secondary" />
          جاري تحميل المستند...
        </div>
      )}
      {state.status === 'error' && (
        <div role="alert" className="flex h-48 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-danger">
          <span aria-hidden="true" className="material-symbols-outlined text-[28px]">error</span>
          {state.message}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {state.status === 'ready' && state.kind === 'pdf' && (
        <iframe src={state.objectUrl} title={title} className="block h-[70vh] min-h-[420px] w-full bg-surface" />
      )}
      {state.status === 'ready' && state.kind === 'image' && (
        <img src={state.objectUrl} alt={title} className="mx-auto block max-h-[70vh] w-auto object-contain" />
      )}
    </div>
  );
}
