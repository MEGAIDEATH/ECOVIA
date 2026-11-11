/**
 * One-time code configuration and delivery for sign-in / registration.
 *
 * Two modes, configured ONLY through server-side variables (never
 * `NEXT_PUBLIC_`):
 *
 * - `real` (default for any deployment): Better Auth generates a random code,
 *   stores it hashed in PostgreSQL, and a real provider must deliver it. No
 *   provider is configured yet, so delivery fails loudly instead of pretending.
 * - `demo`: identities on a server-side allowlist (`OTP_DEMO_ALLOWLIST`) get the
 *   configured demonstration code (`OTP_DEMO_CODE`). Nothing is sent. The code
 *   is still stored in the `verification` table by Better Auth, so expiry,
 *   attempt limits and one-time consumption work exactly as in real mode.
 *   Identities that are NOT on the allowlist keep the real path.
 *
 * Environment rules:
 * - Local (`NODE_ENV !== 'production'`, not on Vercel/Netlify): demo mode is
 *   on by default with code `DEV_OTP_CODE` / `123456` for every identity.
 * - Any deployment: demo mode requires `OTP_MODE=demo`, a six-digit
 *   `OTP_DEMO_CODE` and an explicit allowlist (`*` is rejected).
 * - Vercel Production (`VERCEL_ENV=production`): additionally requires
 *   `OTP_DEMO_ALLOW_PRODUCTION=true`. Use it only with an isolated demo
 *   database.
 */

export type OtpMode = 'real' | 'demo';

export interface DemoOtpConfig {
  /** True when demo mode is active for at least the allowlisted identities. */
  active: boolean;
  code: string;
  /** `'*'` (local only) or normalized identities. */
  allowlist: '*' | ReadonlySet<string>;
  /** Why demo mode is off although `OTP_MODE=demo` was requested. */
  disabledReason?: string;
}

type Env = Record<string, string | undefined>;

/** Running on a hosting platform (as opposed to a developer machine / CI). */
export function isDeployed(env: Env = process.env): boolean {
  return Boolean(env.VERCEL || env.NETLIFY);
}

function isLocalDevelopment(env: Env): boolean {
  return env.NODE_ENV !== 'production' && !isDeployed(env);
}

/**
 * Normalizes an email (lower-case) or a phone number (digits only, so
 * `+966 51…`, `0512…` entries match what the form sends).
 */
export function normalizeIdentity(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  return trimmed.replace(/\D/g, '');
}

export function resolveDemoOtpConfig(env: Env = process.env): DemoOtpConfig {
  const local = isLocalDevelopment(env);
  const requested = (env.OTP_MODE ?? (local ? 'demo' : 'real')).trim().toLowerCase();
  const off = (disabledReason?: string): DemoOtpConfig => ({
    active: false,
    code: '',
    allowlist: new Set(),
    disabledReason,
  });

  if (requested !== 'demo') return off();

  if (env.VERCEL_ENV === 'production' && env.OTP_DEMO_ALLOW_PRODUCTION !== 'true') {
    return off('OTP_MODE=demo on Vercel Production also requires OTP_DEMO_ALLOW_PRODUCTION=true.');
  }

  const rawCode = (env.OTP_DEMO_CODE ?? env.DEV_OTP_CODE ?? '').trim();
  const deployed = isDeployed(env);
  let code: string;
  if (/^\d{6}$/.test(rawCode)) code = rawCode;
  else if (!deployed) code = '123456';
  else return off('OTP_DEMO_CODE must be a six-digit code on deployments.');

  const entries = (env.OTP_DEMO_ALLOWLIST ?? '')
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.includes('*')) {
    if (deployed) return off('OTP_DEMO_ALLOWLIST="*" is not allowed on deployments.');
    return { active: true, code, allowlist: '*' };
  }
  if (entries.length === 0) {
    if (local) return { active: true, code, allowlist: '*' };
    return off('OTP_DEMO_ALLOWLIST is empty.');
  }
  return {
    active: true,
    code,
    allowlist: new Set(entries.map(normalizeIdentity).filter(Boolean)),
  };
}

let cached: DemoOtpConfig | null = null;
let warned = false;

export function demoOtpConfig(): DemoOtpConfig {
  if (!cached) {
    cached = resolveDemoOtpConfig();
    if (cached.disabledReason && !warned) {
      warned = true;
      console.warn(`[auth:otp] demo mode disabled: ${cached.disabledReason}`);
    }
  }
  return cached;
}

/** Test hook: forget the cached configuration. */
export function resetOtpConfigForTests(): void {
  cached = null;
  warned = false;
}

/** True when this identity (email or phone) may use the demonstration code. */
export function isDemoIdentity(identifier: string, config: DemoOtpConfig = demoOtpConfig()): boolean {
  if (!config.active) return false;
  if (config.allowlist === '*') return true;
  const normalized = normalizeIdentity(identifier);
  return normalized.length > 0 && config.allowlist.has(normalized);
}

export function demoOtpCode(): string {
  return demoOtpConfig().code;
}

/** Mode that applies to this identity. */
export function otpModeFor(identifier: string): OtpMode {
  return isDemoIdentity(identifier) ? 'demo' : 'real';
}

/** Raised when a code would have to be sent but no provider is configured. */
export class OtpDeliveryUnavailableError extends Error {
  constructor() {
    super('OTP delivery provider is not configured.');
    this.name = 'OtpDeliveryUnavailableError';
  }
}

/**
 * Whether a code can actually reach this identity: demo identities always,
 * everyone else only locally (where the code is written to the server log).
 * Routes check this before asking Better Auth to issue a code.
 */
export function canIssueOtp(identifier: string): boolean {
  return isDemoIdentity(identifier) || isLocalDevelopment(process.env);
}

/**
 * Email codes: demo identities get the configured code; everyone else gets
 * `undefined`, so Better Auth generates a cryptographically random code.
 */
export function generateOtp({ email }: { email: string }): string | undefined {
  return isDemoIdentity(email) ? demoOtpCode() : undefined;
}

function mask(identifier: string): string {
  const visible = identifier.slice(-3);
  return `${'*'.repeat(Math.max(identifier.length - 3, 0))}${visible}`;
}

export interface OtpDelivery {
  email: string;
  otp: string;
  type: string;
}

export interface SmsOtpDelivery {
  phoneNumber: string;
  otp: string;
}

/**
 * Delivers a code. There is no real provider yet: demo identities are skipped
 * (nothing is sent, and the UI says so), local development logs the code, and
 * anything else fails rather than silently claiming delivery. Adding SMTP / an
 * SMS gateway later means changing only these two functions.
 */
export async function deliverOtp({ email, otp, type }: OtpDelivery): Promise<void> {
  if (isDemoIdentity(email)) {
    console.info(`[auth:otp] demo mode: ${type} code for ${mask(email)} not sent (demo code).`);
    return;
  }
  if (isLocalDevelopment(process.env)) {
    console.info(`[auth:otp] ${type} code for ${email}: ${otp} (local development only)`);
    return;
  }
  throw new OtpDeliveryUnavailableError();
}

export async function deliverSmsOtp({ phoneNumber, otp }: SmsOtpDelivery): Promise<void> {
  if (isDemoIdentity(phoneNumber)) {
    console.info(`[auth:sms] demo mode: code for ${mask(phoneNumber)} not sent (demo code).`);
    return;
  }
  if (isLocalDevelopment(process.env)) {
    console.info(`[auth:sms] code for ${phoneNumber}: ${otp} (local development only)`);
    return;
  }
  throw new OtpDeliveryUnavailableError();
}
