import type { Timestamp } from 'firebase/firestore';

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

/** Approval status stored on specialist/organization documents. */
export type AccountStatus = 'pending' | 'approved';

export interface Specialist {
  /** Document id = Firebase Auth uid. */
  id: string;
  status: AccountStatus;
  fullName: string;
  nationalId: string;
  email: string;
  phone: string;
  license: string;
  /** Specialization (التخصص الدقيق). */
  edu?: string | null;
  /** Experience years — legacy stored the raw input value (string). */
  years?: string | number | null;
  /** Detailed experience/projects description. */
  exp?: string | null;
  portfolio?: string | null;
  /** Profile image: Firebase Storage URL (new) or legacy data-URL. */
  profilePic?: string | null;
  /** Resume PDF: Firebase Storage URL (new) or legacy data-URL. */
  resumeFile?: string | null;
  /** License issue date captured during registration (additive field). */
  issueDate?: string | null;
  /** Uploaded license document Storage URL (additive field). */
  licenseDocUrl?: string | null;
  createdAt?: Timestamp | null;
}

export interface Organization {
  /** Document id = Firebase Auth uid. */
  id: string;
  status: AccountStatus;
  orgName: string;
  crNumber: string;
  phone: string;
  orgDesc: string;
  /** Uploaded commercial registration document Storage URL (additive field). */
  crDocUrl?: string | null;
  createdAt?: Timestamp | null;
}

export type PublicSpecialist = Omit<Specialist, 'nationalId'> & {
  /** Organization-facing masked national ID. */
  nationalId: string;
};

/** Directory-card projection; private CV fields are fetched only on demand. */
export type PublicSpecialistSummary = Pick<Specialist, 'id' | 'status' | 'fullName' | 'edu'>;

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
  /** Firestore document id. */
  id: string;
  chatId: string;
  /** [orgUid, specUid] — additive field so queries can stay constrained. */
  participants?: string[];
  senderId: string;
  text: string;
  timestamp?: Timestamp | null;
  isContract?: boolean;
  contractData?: ContractData;
}

export interface Conversation {
  chatId: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt?: Timestamp | null;
  lastMessageIsContract?: boolean;
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
  createdAt?: Timestamp | null;
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
