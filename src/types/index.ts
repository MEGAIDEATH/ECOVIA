/**
 * Shared domain types.
 *
 * Timestamps are plain ISO-8601 strings produced by the server, and records
 * are keyed by PostgreSQL `uuid` ids plus Better Auth user ids (`user.id`).
 */

export interface OrganizationDirectoryEntry {
  id: string;
  orgName: string;
}

export interface SpecialistDirectoryEntry {
  id: string;
  fullName: string;
  edu?: string | null;
}

export type UserRole = 'spec' | 'org';

/** Approval status stored on specialist/organization accounts. */
export type AccountStatus = 'pending' | 'approved' | 'rejected';

export interface Specialist {
  /** Profile id (`specialists.id`). */
  id: string;
  /** Owning account id (`user.id`). */
  userId: string;
  status: AccountStatus;
  rejectionReason?: string | null;
  fullName: string;
  nationalId: string;
  email: string | null;
  phone: string;
  license: string;
  /** Specialization (التخصص الدقيق). */
  edu?: string | null;
  city?: string | null;
  /** Canonical region the specialist serves (regional notifications). */
  region?: string | null;
  years?: string | number | null;
  /** Detailed experience/projects description. */
  exp?: string | null;
  portfolio?: string | null;
  /** Uploaded profile image document id (served through /api/files/{id}). */
  profilePicId?: string | null;
  /** Resume PDF document id. */
  resumeFileId?: string | null;
  /** License issue date captured during registration. */
  issueDate?: string | null;
  /** Uploaded license document id. */
  licenseDocId?: string | null;
  createdAt?: string | null;
}

export interface Organization {
  id: string;
  userId: string;
  status: AccountStatus;
  rejectionReason?: string | null;
  orgName: string;
  crNumber: string;
  phone: string;
  orgDesc: string;
  /** Field(s) of business shown on the facility profile. */
  businessFields?: string[];
  /** Logo / profile picture document id. */
  profileImageId?: string | null;
  website?: string | null;
  /** Uploaded commercial registration document id. */
  crDocId?: string | null;
  createdAt?: string | null;
}

export type PublicSpecialist = Omit<Specialist, 'nationalId'> & {
  /** Organization-facing masked national ID. */
  nationalId: string;
};

/** Directory-card projection; private CV fields are fetched only on demand.
 * `userId` lets the organization side build the legacy chat key
 * (`chat_{orgUserId}_{specUserId}`) the server expects. */
export type PublicSpecialistSummary = Pick<
  Specialist,
  'id' | 'userId' | 'status' | 'fullName' | 'edu' | 'years' | 'city' | 'region'
>;

export type ContractStatus = 'pending' | 'signed' | 'cancelled';

export interface ContractData {
  /** Contract id (`contracts.id`) — opens the contract document page. */
  contractId?: string;
  /** Request the contract belongs to (null on legacy chat contracts). */
  serviceRequestId?: string | null;
  title: string;
  value: string;
  duration: string;
  orgSig: string;
  specSig: string | null;
  status: ContractStatus;
}

export interface Message {
  id: string;
  /** Conversation id (`conversations.id`). */
  conversationId: string;
  senderUserId: string;
  text: string;
  /** ISO-8601 timestamp. */
  timestamp?: string | null;
  isContract?: boolean;
  contractData?: ContractData;
}

export interface Conversation {
  chatId: string;
  /** [organizationUserId, specialistUserId] — kept for client display logic. */
  participants: string[];
  /** Profile ids of both sides (CV / facility links use these, never user ids). */
  organizationId?: string;
  specialistId?: string;
  lastMessage: string;
  lastMessageAt?: string | null;
  lastMessageIsContract?: boolean;
  /** Display names of both participants (each side shows the other's). */
  organizationName?: string;
  specialistName?: string;
}

export type ApplicationStatus = 'submitted';

export interface Application {
  id: string;
  specialistId: string;
  organizationId: string;
  /** Denormalized for display without extra lookups. */
  organizationName?: string;
  status: ApplicationStatus;
  chatId: string;
  createdAt?: string | null;
}

/** Result of running OCR extraction over an uploaded document. */
export interface OCRResult {
  name?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  license?: string | null;
  issueDate?: string | null;
  crNumber?: string | null;
}
export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ServiceDurationUnit = 'day' | 'week' | 'month';

export type RequestVisibility = 'public' | 'private';

export type OfferStatus = 'submitted' | 'selected' | 'accepted' | 'declined' | 'withdrawn';

/** A specialist's offer on a service request (facility and specialist views). */
export interface Offer {
  id: string;
  serviceRequestId: string;
  specialistId: string;
  specialistName: string;
  specialistEdu?: string | null;
  specialistRegion?: string | null;
  specialistYears?: string | null;
  durationValue: number;
  durationUnit: ServiceDurationUnit;
  /** Display label, e.g. "3 أسابيع". */
  durationLabel: string;
  message?: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

/** Contract as listed on request / offer screens (no signatures). */
export interface ContractSummary {
  id: string;
  serviceRequestId: string | null;
  offerId: string | null;
  status: ContractStatus;
  title: string;
  value: string;
  duration: string;
  specialistId: string;
  organizationId: string;
  createdAt: string;
  signedAt: string | null;
}

/**
 * A service request published by a facility.
 * Legacy rows (before the 0006 form) carry `serviceName`, `cost` and
 * `duration` instead of `serviceTypes` / `activityDescription`.
 */
export interface ServiceRequest {
  id: string;
  organizationId: string;
  organizationName?: string;
  /** The contracted specialist (set when the contract is signed). */
  specialistId?: string | null;
  specialistName?: string;
  serviceTypes: string[];
  activityDescription?: string | null;
  notes?: string | null;
  visibility: RequestVisibility;
  /** Private requests: the only specialist who can see and answer it. */
  targetSpecialistId?: string | null;
  targetSpecialistName?: string;
  region: string;
  city?: string | null;
  status: ServiceRequestStatus;
  rejectionReason?: string | null;
  conversationId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Legacy fields (pre-0006 form). */
  serviceName?: string | null;
  serviceCategory?: string | null;
  cost?: number | null;
  duration?: string | null;
  description?: string | null;
  /** Facility view: number of active offers. */
  offerCount?: number;
  /** A contract awaiting the specialist's signature exists. */
  hasPendingContract?: boolean;
  /** Specialist view: this specialist declined it (stays open for others). */
  declinedByMe?: boolean;
  /** Specialist view: status of this specialist's own offer. */
  myOfferStatus?: OfferStatus | null;
}

export type NotificationType =
  | 'request.published'
  | 'request.private'
  | 'offer.received'
  | 'offer.updated'
  | 'offer.withdrawn'
  | 'offer.declined'
  | 'contract.prepared'
  | 'contract.withdrawn'
  | 'contract.signed'
  | 'request.awarded_elsewhere'
  | 'request.cancelled'
  | 'request.status';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string | null;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}
