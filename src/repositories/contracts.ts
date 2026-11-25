import 'server-only';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { contracts, organizations, serviceRequestOffers, serviceRequests, specialists } from '@/db/schema';
import { formatDuration } from '@/lib/serviceRequests';
import { isUuid } from '@/lib/utils/ids';
import type { ContractStatus } from '@/types';

export interface ContractDocument {
  id: string;
  status: ContractStatus;
  title: string;
  value: string;
  duration: string;
  organizationSignature: string;
  specialistSignature: string | null;
  organizationSignedAt: string | null;
  signedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  organization: { id: string; name: string; crNumber: string; phone: string };
  specialist: { id: string; name: string; license: string };
  request: {
    id: string;
    serviceTypes: string[];
    serviceName: string | null;
    activityDescription: string | null;
    notes: string | null;
    region: string;
    city: string | null;
  } | null;
  offer: { durationLabel: string; message: string | null } | null;
  /** Which party is looking at it (admins read as `admin`). */
  viewerRole: 'org' | 'spec' | 'admin';
}

export interface ContractViewer {
  isAdmin: boolean;
  organizationId: string | null;
  specialistId: string | null;
}

/**
 * The contract document for one of its two parties (or an administrator).
 * Anyone else — including other approved users who guess the id — gets
 * null, which callers render as "not found" so existence is not disclosed.
 */
export async function getContractDocument(id: string, viewer: ContractViewer): Promise<ContractDocument | null> {
  if (!isUuid(id)) return null;
  const rows = await getDb()
    .select({
      contract: contracts,
      orgName: organizations.orgName,
      crNumber: organizations.crNumber,
      orgPhone: organizations.phone,
      specName: specialists.fullName,
      license: specialists.license,
      request: serviceRequests,
      offer: serviceRequestOffers,
    })
    .from(contracts)
    .innerJoin(organizations, eq(contracts.organizationId, organizations.id))
    .innerJoin(specialists, eq(contracts.specialistId, specialists.id))
    .leftJoin(serviceRequests, eq(contracts.serviceRequestId, serviceRequests.id))
    .leftJoin(serviceRequestOffers, eq(contracts.offerId, serviceRequestOffers.id))
    .where(eq(contracts.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const { contract } = row;
  const viewerRole =
    viewer.organizationId === contract.organizationId
      ? 'org'
      : viewer.specialistId === contract.specialistId
        ? 'spec'
        : viewer.isAdmin
          ? 'admin'
          : null;
  if (!viewerRole) return null;

  return {
    id: contract.id,
    status: contract.status,
    title: contract.title,
    value: contract.value,
    duration: contract.duration,
    organizationSignature: contract.organizationSignature,
    specialistSignature: contract.status === 'signed' ? contract.specialistSignature : null,
    organizationSignedAt: contract.organizationSignedAt?.toISOString() ?? null,
    signedAt: contract.signedAt?.toISOString() ?? null,
    cancelledAt: contract.cancelledAt?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    organization: { id: contract.organizationId, name: row.orgName, crNumber: row.crNumber, phone: row.orgPhone },
    specialist: { id: contract.specialistId, name: row.specName, license: row.license },
    request: row.request
      ? {
          id: row.request.id,
          serviceTypes: row.request.serviceTypes ?? [],
          serviceName: row.request.serviceName,
          activityDescription: row.request.activityDescription,
          notes: row.request.notes,
          region: row.request.region,
          city: row.request.city,
        }
      : null,
    offer: row.offer
      ? { durationLabel: formatDuration(row.offer.durationValue, row.offer.durationUnit), message: row.offer.message }
      : null,
    viewerRole,
  };
}
