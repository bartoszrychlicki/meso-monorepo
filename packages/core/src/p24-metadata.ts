type GenericRecord = Record<string, unknown>;

export type P24SessionStatus =
  | 'registering'
  | 'pending'
  | 'verified'
  | 'replaced'
  | 'failed';

export interface P24SessionRecord {
  sessionId: string;
  token?: string;
  url?: string;
  status: P24SessionStatus;
  createdAt: string;
  replacedAt?: string;
  verifiedAt?: string;
  failedAt?: string;
  transactionId?: string;
  p24OrderId?: string;
}

export type P24RefundStatus =
  | 'requested'
  | 'completed'
  | 'rejected'
  | 'manual_action_required';

export interface P24RefundRecord {
  requestId: string;
  refundsUuid: string;
  sessionId: string;
  p24OrderId: string;
  amount: number;
  description: string;
  status: P24RefundStatus;
  requestedAt: string;
  requestedBy?: string;
  requestedFrom?: 'pos' | 'kds' | 'system';
  completedAt?: string;
  rejectedAt?: string;
  errorMessage?: string;
  rawStatus?: number;
}

export interface P24Metadata {
  active_session_id?: string;
  sessions: P24SessionRecord[];
  refunds: P24RefundRecord[];
}

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as GenericRecord;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeSession(value: unknown): P24SessionRecord | null {
  const record = asRecord(value);
  if (!record) return null;

  const sessionId = readString(record.sessionId);
  const status = readString(record.status) as P24SessionStatus | undefined;
  const createdAt = readString(record.createdAt);

  if (!sessionId || !status || !createdAt) {
    return null;
  }

  const transactionId = readString(record.transactionId);
  const p24OrderId = readString(record.p24OrderId) ?? transactionId;

  return {
    sessionId,
    status,
    createdAt,
    token: readString(record.token),
    url: readString(record.url),
    replacedAt: readString(record.replacedAt),
    verifiedAt: readString(record.verifiedAt),
    failedAt: readString(record.failedAt),
    transactionId,
    p24OrderId,
  };
}

function normalizeRefund(value: unknown): P24RefundRecord | null {
  const record = asRecord(value);
  if (!record) return null;

  const requestId = readString(record.requestId);
  const refundsUuid = readString(record.refundsUuid);
  const sessionId = readString(record.sessionId);
  const p24OrderId = readString(record.p24OrderId) ?? readString(record.transactionId);
  const amount = readNumber(record.amount);
  const description = readString(record.description);
  const status = readString(record.status) as P24RefundStatus | undefined;
  const requestedAt = readString(record.requestedAt);

  if (
    !requestId ||
    !refundsUuid ||
    !sessionId ||
    !p24OrderId ||
    amount === undefined ||
    !description ||
    !status ||
    !requestedAt
  ) {
    return null;
  }

  return {
    requestId,
    refundsUuid,
    sessionId,
    p24OrderId,
    amount,
    description,
    status,
    requestedAt,
    requestedBy: readString(record.requestedBy),
    requestedFrom: readString(record.requestedFrom) as P24RefundRecord['requestedFrom'],
    completedAt: readString(record.completedAt),
    rejectedAt: readString(record.rejectedAt),
    errorMessage: readString(record.errorMessage),
    rawStatus: readNumber(record.rawStatus),
  };
}

export function readP24Metadata(metadata: unknown): P24Metadata {
  const record = asRecord(metadata);
  const p24Record = asRecord(record?.p24);

  const sessions = Array.isArray(p24Record?.sessions)
    ? p24Record.sessions
        .map((entry) => normalizeSession(entry))
        .filter((entry): entry is P24SessionRecord => entry !== null)
    : [];

  const refunds = Array.isArray(p24Record?.refunds)
    ? p24Record.refunds
        .map((entry) => normalizeRefund(entry))
        .filter((entry): entry is P24RefundRecord => entry !== null)
    : [];

  return {
    active_session_id: readString(p24Record?.active_session_id),
    sessions,
    refunds,
  };
}

export function getP24Sessions(metadata: unknown): P24SessionRecord[] {
  return readP24Metadata(metadata).sessions;
}

export function getActiveP24Session(metadata: unknown): P24SessionRecord | null {
  const { active_session_id: activeSessionId, sessions } = readP24Metadata(metadata);
  if (!activeSessionId) return null;
  return sessions.find((session) => session.sessionId === activeSessionId) ?? null;
}

export function getLatestVerifiedP24Session(metadata: unknown): P24SessionRecord | null {
  const sessions = getP24Sessions(metadata)
    .filter((session) => session.status === 'verified' && !!session.p24OrderId)
    .sort((left, right) => {
      const leftDate = left.verifiedAt ?? left.createdAt;
      const rightDate = right.verifiedAt ?? right.createdAt;
      return rightDate.localeCompare(leftDate);
    });

  return sessions[0] ?? null;
}

export function upsertP24Session(
  metadata: unknown,
  nextSession: P24SessionRecord,
  options?: { replaceCurrentActive?: boolean; now?: string }
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {};
  const now = options?.now ?? new Date().toISOString();
  const { active_session_id: activeSessionId, sessions, refunds } = readP24Metadata(metadata);

  const replacedSessions = sessions.map((session) => {
    if (
      options?.replaceCurrentActive &&
      activeSessionId &&
      session.sessionId === activeSessionId &&
      session.sessionId !== nextSession.sessionId &&
      (session.status === 'registering' || session.status === 'pending')
    ) {
      return {
        ...session,
        status: 'replaced' as const,
        replacedAt: now,
      };
    }

    if (session.sessionId === nextSession.sessionId) {
      return nextSession;
    }

    return session;
  });

  const hasSession = replacedSessions.some((session) => session.sessionId === nextSession.sessionId);

  return {
    ...record,
    p24: {
      active_session_id: nextSession.sessionId,
      sessions: hasSession ? replacedSessions : [...replacedSessions, nextSession],
      refunds,
    },
  };
}

export function markP24SessionStatus(
  metadata: unknown,
  sessionId: string,
  status: Extract<P24SessionStatus, 'verified' | 'failed' | 'replaced'>,
  now = new Date().toISOString(),
  p24OrderId?: string
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {};
  const { active_session_id: activeSessionId, sessions, refunds } = readP24Metadata(metadata);

  const nextSessions = sessions.map((session) => {
    if (session.sessionId !== sessionId) {
      return session;
    }

    return {
      ...session,
      status,
      verifiedAt: status === 'verified' ? now : session.verifiedAt,
      failedAt: status === 'failed' ? now : session.failedAt,
      replacedAt: status === 'replaced' ? now : session.replacedAt,
      transactionId: p24OrderId ?? session.transactionId,
      p24OrderId: p24OrderId ?? session.p24OrderId ?? session.transactionId,
    };
  });

  return {
    ...record,
    p24: {
      active_session_id: activeSessionId,
      sessions: nextSessions,
      refunds,
    },
  };
}

export function getP24Refunds(metadata: unknown): P24RefundRecord[] {
  return readP24Metadata(metadata).refunds;
}

export function getLatestP24Refund(metadata: unknown): P24RefundRecord | null {
  const refunds = getP24Refunds(metadata).sort((left, right) =>
    right.requestedAt.localeCompare(left.requestedAt)
  );
  return refunds[0] ?? null;
}

export function upsertP24Refund(
  metadata: unknown,
  nextRefund: P24RefundRecord
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {};
  const { active_session_id: activeSessionId, sessions, refunds } = readP24Metadata(metadata);

  const nextRefunds = refunds.map((refund) =>
    refund.refundsUuid === nextRefund.refundsUuid ? nextRefund : refund
  );
  const hasRefund = nextRefunds.some((refund) => refund.refundsUuid === nextRefund.refundsUuid);

  return {
    ...record,
    p24: {
      active_session_id: activeSessionId,
      sessions,
      refunds: hasRefund ? nextRefunds : [...nextRefunds, nextRefund],
    },
  };
}

export function markP24RefundStatus(
  metadata: unknown,
  refundsUuid: string,
  status: Extract<P24RefundStatus, 'completed' | 'rejected' | 'manual_action_required'>,
  now = new Date().toISOString(),
  options?: {
    errorMessage?: string;
    rawStatus?: number;
  }
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {};
  const { active_session_id: activeSessionId, sessions, refunds } = readP24Metadata(metadata);

  const nextRefunds = refunds.map((refund) => {
    if (refund.refundsUuid !== refundsUuid) {
      return refund;
    }

    return {
      ...refund,
      status,
      completedAt: status === 'completed' ? now : refund.completedAt,
      rejectedAt:
        status === 'rejected' || status === 'manual_action_required'
          ? now
          : refund.rejectedAt,
      errorMessage: options?.errorMessage ?? refund.errorMessage,
      rawStatus: options?.rawStatus ?? refund.rawStatus,
    };
  });

  return {
    ...record,
    p24: {
      active_session_id: activeSessionId,
      sessions,
      refunds: nextRefunds,
    },
  };
}
