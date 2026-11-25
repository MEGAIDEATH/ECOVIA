import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { getDb } from '@/db';
import { contracts } from '@/db/schema';
import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireApprovedUser } from '@/lib/auth/policies';
import { isUuid } from '@/lib/utils/ids';
import { parseSignature } from '@/lib/validation/marketplace';
import { signContract } from '@/repositories/marketplace';

/**
 * POST /api/chat/contracts/sign { contractId | messageId, signature }
 * The contract's specialist signs it (used by the contract card in chat).
 * Same atomic path as the request page: signing closes the request.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { account, profile } = await requireApprovedUser('spec', request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const signature = parseSignature(body.signature);
    if (!signature) return jsonError('اكتب اسمك الكامل للتوقيع.', 400);

    let contractId = isUuid(body.contractId) ? body.contractId : null;
    if (!contractId && isUuid(body.messageId)) {
      const [row] = await getDb()
        .select({ id: contracts.id })
        .from(contracts)
        .where(eq(contracts.messageId, body.messageId))
        .limit(1);
      contractId = row?.id ?? null;
    }
    if (!contractId) return jsonError('العقد غير موجود.', 404);

    await signContract(contractId, { id: profile.id, userId: account.user.id, fullName: profile.fullName, approved: true }, signature);
    return jsonOk({ ok: true, contractId });
  } catch (error) {
    return mapError(error, 'chat/contracts/sign');
  }
}
