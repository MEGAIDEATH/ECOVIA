/**
 * DEVELOPMENT / TEST FIXTURES — never run against production data.
 *
 * Creates clearly labelled, fictional accounts to exercise every workflow
 * (directory, private requests, offers, contracts, chat, notifications,
 * account switching, pending-user restrictions):
 *
 *   specialist.approved@test.ecovia.local  approved specialist (Riyadh)
 *   specialist.pending@test.ecovia.local   pending specialist (Riyadh)
 *   facility.approved@test.ecovia.local    approved facility
 *   facility.pending@test.ecovia.local     pending facility
 *   dual.account@test.ecovia.local         one login owning an approved
 *                                          specialist AND facility profile
 *
 * Password: FIXTURE_PASSWORD (default "Ecovia-Test-2026!"). Idempotent:
 * existing fixture users keep their password; profiles are created once.
 *
 * Guard: refuses unless NEON_BRANCH is "dev" or starts with "test"/"ci" (or is
 * "preview" with FIXTURES_ALLOW_PREVIEW=true — the Vercel Preview QA database),
 * and never on Vercel production. The live site's database ("demo") is never allowed. Usage: `npm run db:seed:fixtures`.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { authOptions, authSchema } from '../../lib/auth/options';
import { loadLocalEnv } from '../env';
import { organizations, specialists, user } from '../schema';

interface FixtureSpecialist {
  fullName: string;
  status: 'approved' | 'pending';
  region: string;
  edu: string;
  years: string;
  license: string;
  nationalId: string;
  phone: string;
}

interface FixtureOrganization {
  orgName: string;
  status: 'approved' | 'pending';
  crNumber: string;
  phone: string;
  orgDesc: string;
  businessFields: string[];
}

interface Fixture {
  email: string;
  name: string;
  specialist?: FixtureSpecialist;
  organization?: FixtureOrganization;
}

const FIXTURES: Fixture[] = [
  {
    email: 'specialist.approved@test.ecovia.local',
    name: 'ريم الاختبارية (أخصائية تجريبية)',
    specialist: {
      fullName: 'ريم الاختبارية (أخصائية تجريبية)',
      status: 'approved',
      region: 'منطقة الرياض',
      edu: 'هندسة بيئية — تقييم الأثر البيئي',
      years: '7',
      license: 'TEST-ELESL-0001',
      nationalId: '1000000001',
      phone: '+966500000101',
    },
  },
  {
    email: 'specialist.pending@test.ecovia.local',
    name: 'سالم قيد المراجعة (أخصائي تجريبي)',
    specialist: {
      fullName: 'سالم قيد المراجعة (أخصائي تجريبي)',
      status: 'pending',
      region: 'منطقة الرياض',
      edu: 'علوم بيئية',
      years: '2',
      license: 'TEST-ELESL-0002',
      nationalId: '1000000002',
      phone: '+966500000102',
    },
  },
  {
    email: 'facility.approved@test.ecovia.local',
    name: 'منشأة الاختبار البيئي (تجريبية)',
    organization: {
      orgName: 'منشأة الاختبار البيئي (تجريبية)',
      status: 'approved',
      crNumber: '7000000001',
      phone: '0110000001',
      orgDesc: 'منشأة صناعية تجريبية لاختبار مسارات الطلبات والعروض والعقود.',
      businessFields: ['صناعات غذائية', 'تعبئة وتغليف'],
    },
  },
  {
    email: 'facility.pending@test.ecovia.local',
    name: 'منشأة قيد المراجعة (تجريبية)',
    organization: {
      orgName: 'منشأة قيد المراجعة (تجريبية)',
      status: 'pending',
      crNumber: '7000000002',
      phone: '0110000002',
      orgDesc: 'منشأة تجريبية لم تُعتمد بعد.',
      businessFields: [],
    },
  },
  {
    email: 'dual.account@test.ecovia.local',
    name: 'حساب مزدوج (تجريبي)',
    specialist: {
      fullName: 'حساب مزدوج — أخصائي (تجريبي)',
      status: 'approved',
      region: 'المنطقة الشرقية',
      edu: 'إدارة بيئية',
      years: '4',
      license: 'TEST-ELESL-0003',
      nationalId: '1000000003',
      phone: '+966500000103',
    },
    organization: {
      orgName: 'منشأة الحساب المزدوج (تجريبية)',
      status: 'approved',
      crNumber: '7000000003',
      phone: '0110000003',
      orgDesc: 'منشأة تجريبية يملكها مستخدم لديه حساب أخصائي أيضاً (لاختبار التبديل).',
      businessFields: ['مقاولات'],
    },
  },
];

function assertSafeTarget(): void {
  const branch = (process.env.NEON_BRANCH ?? '').trim();
  // The Vercel Preview QA database is allowed only with an explicit second opt-in.
  const previewQa = branch === 'preview' && process.env.FIXTURES_ALLOW_PREVIEW === 'true';
  const allowed = branch === 'dev' || branch.startsWith('test') || branch.startsWith('ci') || previewQa;
  if (process.env.VERCEL_ENV === 'production' || !allowed) {
    throw new Error(
      `Refusing to seed fixtures: NEON_BRANCH="${branch}". Fixtures are for the "dev" or "test-*" branches only.`,
    );
  }
}

async function main(): Promise<void> {
  loadLocalEnv();
  assertSafeTarget();
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  const password = process.env.FIXTURE_PASSWORD || 'Ecovia-Test-2026!';

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const db = drizzle(pool);
    const auth = betterAuth({ ...authOptions, database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
      // Trusted CLI context: account creation is allowed here only.
      emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false } });

    for (const fixture of FIXTURES) {
      let [row] = await db.select().from(user).where(eq(user.email, fixture.email)).limit(1);
      if (!row) {
        await auth.api.signUpEmail({ body: { email: fixture.email, password, name: fixture.name } });
        [row] = await db.select().from(user).where(eq(user.email, fixture.email)).limit(1);
        console.info(`[fixtures] created ${fixture.email}`);
      }
      if (fixture.specialist) {
        await db
          .insert(specialists)
          .values({ userId: row.id, email: fixture.email, ...fixture.specialist })
          .onConflictDoNothing({ target: specialists.userId });
      }
      if (fixture.organization) {
        await db
          .insert(organizations)
          .values({ userId: row.id, ...fixture.organization })
          .onConflictDoNothing({ target: organizations.userId });
      }
    }
    console.info(`[fixtures] ${FIXTURES.length} test accounts ready (password from FIXTURE_PASSWORD).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[fixtures] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
