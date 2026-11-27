/**
 * PERSISTENT QA ACCOUNTS for manual testing — never production.
 *
 *   qa.organization@test.ecovia.local  Ecovia QA Organization  approved facility
 *   qa.specialist@test.ecovia.local    Ecovia QA Specialist    approved specialist (Riyadh)
 *   qa.observer@test.ecovia.local      Ecovia QA Observer      approved specialist (Eastern),
 *                                                              independent of the two above
 *
 * Passwords come from QA_ORGANIZATION_PASSWORD / QA_SPECIALIST_PASSWORD /
 * QA_OBSERVER_PASSWORD (shell, or the git-ignored `.env.qa.local`). They are
 * never stored in the repository. Accounts are created through Better Auth's
 * own sign-up API, so passwords are hashed exactly as on the login path.
 *
 * Idempotent: existing accounts keep their password (unless
 * QA_RESET_PASSWORDS=true, which re-hashes them — and the QA-only admin named by
 * QA_ADMIN_EMAIL/QA_ADMIN_PASSWORD, if it exists — through Better Auth), profiles
 * are created once and re-asserted as approved, and each profile is linked to
 * the account's OWN uploaded permit / commercial-registration document when it
 * has none yet (uploads happen through the app; see docs/QA_TEST_ACCOUNTS.md).
 * The email is marked verified in the QA database only — no OTP is delivered.
 * Every value is synthetic and labelled as test data.
 *
 * Guard (all must hold): NEON_BRANCH is "dev", "test-*"/"ci-*", or "preview"
 * with QA_ALLOW_PREVIEW=true; not Vercel Production; the database's own
 * `neon.branch_id` equals QA_NEON_BRANCH_ID; and that id is not the live
 * (`demo`) or `production` branch. Usage: `npm run db:seed:qa`.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { authOptions, authSchema } from '../../lib/auth/options';
import { loadEnvFile, loadLocalEnv } from '../env';
import { documents, organizations, specialists, user } from '../schema';

/** Neon branches that must never receive QA data (live `demo`, unused `production`). */
const PROTECTED_BRANCH_IDS = new Set(['br-sparkling-hall-a1dylzla', 'br-still-lake-a123620b']);

const QA_LABEL = 'حساب اختبار (QA) — بيانات اصطناعية لا تمثل جهة أو شخصاً حقيقياً';

interface QaAccount {
  email: string;
  name: string;
  passwordVar: string;
  organization?: Omit<typeof organizations.$inferInsert, 'userId'>;
  specialist?: Omit<typeof specialists.$inferInsert, 'userId'>;
}

const ACCOUNTS: QaAccount[] = [
  {
    email: 'qa.organization@test.ecovia.local',
    name: 'Ecovia QA Organization',
    passwordVar: 'QA_ORGANIZATION_PASSWORD',
    organization: {
      orgName: 'Ecovia QA Organization (منشأة اختبار)',
      status: 'approved',
      crNumber: '7999000001',
      phone: '0119990001',
      orgDesc: `${QA_LABEL}. منشأة صناعية تجريبية في منطقة الرياض تطلب خدمات بيئية (تصنيف النشاط، خطة الإدارة البيئية). رقم السجل التجاري اصطناعي.`,
      businessFields: ['خدمات بيئية', 'صناعات تحويلية'],
    },
  },
  {
    email: 'qa.specialist@test.ecovia.local',
    name: 'Ecovia QA Specialist',
    passwordVar: 'QA_SPECIALIST_PASSWORD',
    specialist: {
      fullName: 'Ecovia QA Specialist (أخصائي اختبار)',
      status: 'approved',
      email: 'qa.specialist@test.ecovia.local',
      nationalId: '1999000001',
      phone: '+966599900001',
      license: 'SYNTHETIC-QA-LIC-0001',
      edu: 'هندسة بيئية (مؤهل اصطناعي للاختبار)',
      city: 'الرياض',
      region: 'منطقة الرياض',
      years: '6',
      exp: `${QA_LABEL}.\nملخص: أخصائي بيئي تجريبي.\nالكفاءات: تصنيف النشاط البيئي، خطط الإدارة البيئية، تقييم الأثر البيئي، رصد جودة الهواء.`,
      portfolio: '',
    },
  },
  {
    email: 'qa.observer@test.ecovia.local',
    name: 'Ecovia QA Observer',
    passwordVar: 'QA_OBSERVER_PASSWORD',
    specialist: {
      fullName: 'Ecovia QA Observer (مراقب اختبار)',
      status: 'approved',
      email: 'qa.observer@test.ecovia.local',
      nationalId: '1999000002',
      phone: '+966599900002',
      license: 'SYNTHETIC-QA-LIC-0002',
      edu: 'علوم بيئية (مؤهل اصطناعي للاختبار)',
      city: 'الدمام',
      region: 'المنطقة الشرقية',
      years: '3',
      exp: `${QA_LABEL}.\nحساب مستقل لاختبار العزل والصلاحيات.`,
      portfolio: '',
    },
  },
];

function assertDeclaredTarget(): void {
  const branch = (process.env.NEON_BRANCH ?? '').trim();
  const previewQa = branch === 'preview' && process.env.QA_ALLOW_PREVIEW === 'true';
  const allowed = branch === 'dev' || branch.startsWith('test') || branch.startsWith('ci') || previewQa;
  if (process.env.VERCEL_ENV === 'production' || !allowed) {
    throw new Error(`Refusing: NEON_BRANCH="${branch}" is not an approved QA branch.`);
  }
  if (!process.env.QA_NEON_BRANCH_ID) throw new Error('Refusing: set QA_NEON_BRANCH_ID to the intended Neon branch id.');
}

async function assertConnectedBranch(pool: Pool): Promise<string> {
  const { rows } = await pool.query<{ id: string | null }>("select current_setting('neon.branch_id', true) as id");
  const actual = rows[0]?.id ?? '';
  if (!actual) throw new Error('Refusing: cannot read neon.branch_id from the database.');
  if (PROTECTED_BRANCH_IDS.has(actual)) throw new Error(`Refusing: ${actual} is a protected (live) branch.`);
  if (actual !== process.env.QA_NEON_BRANCH_ID) {
    throw new Error(`Refusing: connected to ${actual}, expected QA_NEON_BRANCH_ID=${process.env.QA_NEON_BRANCH_ID}.`);
  }
  return actual;
}

function passwordFor(account: QaAccount): string {
  const value = (process.env[account.passwordVar] ?? '').trim();
  if (value.length < 12) throw new Error(`${account.passwordVar} must be set (at least 12 characters).`);
  return value;
}

async function main(): Promise<void> {
  loadEnvFile('.env.qa.local');
  loadLocalEnv();
  assertDeclaredTarget();
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  const resetPasswords = process.env.QA_RESET_PASSWORDS === 'true';

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const branchId = await assertConnectedBranch(pool);
    console.info(`[qa-accounts] target branch ${branchId} (${process.env.NEON_BRANCH})`);
    const db = drizzle(pool);
    const auth = betterAuth({
      ...authOptions,
      database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
      // Trusted CLI context: account creation is allowed here only.
      emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false },
    });

    for (const account of ACCOUNTS) {
      const password = passwordFor(account);
      let [row] = await db.select().from(user).where(eq(user.email, account.email)).limit(1);
      if (!row) {
        await auth.api.signUpEmail({ body: { email: account.email, password, name: account.name } });
        [row] = await db.select().from(user).where(eq(user.email, account.email)).limit(1);
        console.info(`[qa-accounts] created ${account.email}`);
      } else if (resetPasswords) {
        const context = await auth.$context;
        await context.internalAdapter.updatePassword(row.id, await context.password.hash(password));
        console.info(`[qa-accounts] password re-hashed for ${account.email}`);
      } else {
        console.info(`[qa-accounts] reusing ${account.email} (password unchanged)`);
      }
      // Pre-verified identity in the QA database only; the role is never elevated.
      await db.update(user).set({ name: account.name, emailVerified: true }).where(eq(user.id, row.id));

      if (account.specialist) {
        await db
          .insert(specialists)
          .values({ userId: row.id, ...account.specialist })
          .onConflictDoNothing({ target: specialists.userId });
        await db
          .update(specialists)
          .set({ status: 'approved', rejectionReason: null })
          .where(eq(specialists.userId, row.id));
        const [profile] = await db.select().from(specialists).where(eq(specialists.userId, row.id)).limit(1);
        if (!profile.licenseDocumentId) {
          const [doc] = await db
            .select({ id: documents.id })
            .from(documents)
            .where(and(eq(documents.ownerUserId, row.id), eq(documents.kind, 'license')))
            .orderBy(desc(documents.createdAt))
            .limit(1);
          if (doc) {
            await db.update(specialists).set({ licenseDocumentId: doc.id }).where(eq(specialists.id, profile.id));
            console.info(`[qa-accounts] linked own synthetic permit document for ${account.email}`);
          }
        }
      }
      if (account.organization) {
        await db
          .insert(organizations)
          .values({ userId: row.id, ...account.organization })
          .onConflictDoNothing({ target: organizations.userId });
        await db
          .update(organizations)
          .set({ status: 'approved', rejectionReason: null })
          .where(eq(organizations.userId, row.id));
        const [profile] = await db.select().from(organizations).where(eq(organizations.userId, row.id)).limit(1);
        if (!profile.crDocumentId) {
          const [doc] = await db
            .select({ id: documents.id })
            .from(documents)
            .where(and(eq(documents.ownerUserId, row.id), eq(documents.kind, 'commercial_registration')))
            .orderBy(desc(documents.createdAt))
            .limit(1);
          if (doc) {
            await db.update(organizations).set({ crDocumentId: doc.id }).where(eq(organizations.id, profile.id));
            console.info(`[qa-accounts] linked own synthetic commercial-registration document for ${account.email}`);
          }
        }
      }
    }

    // Optional: rotate the QA-only administrator (created by `npm run db:seed`) on this QA branch.
    const adminEmail = (process.env.QA_ADMIN_EMAIL ?? '').trim().toLowerCase();
    if (resetPasswords && adminEmail.endsWith('@test.ecovia.local')) {
      const adminPassword = (process.env.QA_ADMIN_PASSWORD ?? '').trim();
      if (adminPassword.length < 12) throw new Error('QA_ADMIN_PASSWORD must be at least 12 characters.');
      const [admin] = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
      if (admin) {
        const context = await auth.$context;
        await context.internalAdapter.updatePassword(admin.id, await context.password.hash(adminPassword));
        console.info(`[qa-accounts] password re-hashed for ${adminEmail}`);
      }
    }
    console.info(`[qa-accounts] ${ACCOUNTS.length} QA accounts ready.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[qa-accounts] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
