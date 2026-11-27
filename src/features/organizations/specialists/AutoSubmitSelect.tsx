'use client';

import type { SelectHTMLAttributes } from 'react';

/** A select that submits its (GET) form on change; the form also works without JavaScript. */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
