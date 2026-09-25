import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoSessionResetButton } from './DemoSessionResetButton';

const envMock = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/lib/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config/env')>();
  return {
    ...actual,
    get DEMO_SESSION_RESET_ENABLED() {
      return envMock.enabled;
    },
  };
});

const demoSessionMock = vi.hoisted(() => ({ startFreshDemoSession: vi.fn() }));
vi.mock('./demoSession', () => demoSessionMock);

describe('DemoSessionResetButton (demo-only control)', () => {
  beforeEach(() => {
    envMock.enabled = true;
    demoSessionMock.startFreshDemoSession.mockReset().mockResolvedValue(undefined);
  });

  it('renders nothing when the demo reset flag is disabled (production default)', () => {
    envMock.enabled = false;

    const { container } = render(<DemoSessionResetButton />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('demo-session-reset')).toBeNull();
    expect(demoSessionMock.startFreshDemoSession).not.toHaveBeenCalled();
  });

  it('renders the labeled demo control when the flag is enabled', () => {
    envMock.enabled = true;

    render(<DemoSessionResetButton />);

    expect(screen.getByTestId('demo-session-reset')).toHaveTextContent(
      'بدء جلسة تجريبية جديدة',
    );
  });

  it('starts a fresh demo session when clicked', async () => {
    envMock.enabled = true;
    const user = userEvent.setup();
    render(<DemoSessionResetButton />);

    await user.click(screen.getByTestId('demo-session-reset'));

    expect(demoSessionMock.startFreshDemoSession).toHaveBeenCalledTimes(1);
  });
});
