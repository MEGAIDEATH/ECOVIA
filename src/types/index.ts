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
  'id' | 'userId' | 'status' | 'fullName' | 'edu' | 'years' | 'city'
>;

export type ContractStatus = 'pending' | 'signed';

export interface ContractData {
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

/** A general service request published by an organization. */
export interface ServiceRequest {
  id: string;
  organizationId: string;
  /** Specialist who took the request (set on accept). */
  specialistId?: string | null;
  serviceName: string;
  /** Cost in SAR; null only on requests created before costs existed. */
  cost?: number | null;
  durationValue?: number | null;
  durationUnit?: ServiceDurationUnit | null;
  /** Display label for the duration (always present). */
  duration: string;
  region: string;
  serviceCategory?: string | null;
  city?: string | null;
  description?: string | null;
  status: ServiceRequestStatus;
  rejectionReason?: string | null;
  conversationId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  organizationName?: string;
  /** Name of the specialist who took the request (organization view). */
  specialistName?: string;
  /** Specialist view only: this specialist declined it (stays open for others). */
  declinedByMe?: boolean;
}

