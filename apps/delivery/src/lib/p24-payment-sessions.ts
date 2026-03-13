type GenericRecord = Record<string, unknown>

export type P24SessionStatus = 'registering' | 'pending' | 'verified' | 'replaced' | 'failed'

export interface P24SessionRecord {
  sessionId: string
  token?: string
  url?: string
  status: P24SessionStatus
  createdAt: string
  replacedAt?: string
  verifiedAt?: string
  failedAt?: string
  transactionId?: string
}

interface P24Metadata {
  active_session_id?: string
  sessions: P24SessionRecord[]
}

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as GenericRecord
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeSession(value: unknown): P24SessionRecord | null {
  const record = asRecord(value)
  if (!record) return null

  const sessionId = readString(record.sessionId)
  const status = readString(record.status) as P24SessionStatus | undefined
  const createdAt = readString(record.createdAt)

  if (!sessionId || !status || !createdAt) {
    return null
  }

  return {
    sessionId,
    status,
    createdAt,
    token: readString(record.token),
    url: readString(record.url),
    replacedAt: readString(record.replacedAt),
    verifiedAt: readString(record.verifiedAt),
    failedAt: readString(record.failedAt),
    transactionId: readString(record.transactionId),
  }
}

function readP24Metadata(metadata: unknown): P24Metadata {
  const record = asRecord(metadata)
  const p24Record = asRecord(record?.p24)

  const sessions = Array.isArray(p24Record?.sessions)
    ? p24Record.sessions
        .map((entry) => normalizeSession(entry))
        .filter((entry): entry is P24SessionRecord => entry !== null)
    : []

  return {
    active_session_id: readString(p24Record?.active_session_id),
    sessions,
  }
}

export function getP24Sessions(metadata: unknown): P24SessionRecord[] {
  return readP24Metadata(metadata).sessions
}

export function getActiveP24Session(metadata: unknown): P24SessionRecord | null {
  const { active_session_id: activeSessionId, sessions } = readP24Metadata(metadata)
  if (!activeSessionId) return null
  return sessions.find((session) => session.sessionId === activeSessionId) ?? null
}

export function upsertP24Session(
  metadata: unknown,
  nextSession: P24SessionRecord,
  options?: { replaceCurrentActive?: boolean; now?: string }
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {}
  const now = options?.now ?? new Date().toISOString()
  const { active_session_id: activeSessionId, sessions } = readP24Metadata(metadata)

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
      }
    }

    if (session.sessionId === nextSession.sessionId) {
      return nextSession
    }

    return session
  })

  const hasSession = replacedSessions.some((session) => session.sessionId === nextSession.sessionId)

  return {
    ...record,
    p24: {
      active_session_id: nextSession.sessionId,
      sessions: hasSession ? replacedSessions : [...replacedSessions, nextSession],
    },
  }
}

export function markP24SessionStatus(
  metadata: unknown,
  sessionId: string,
  status: Extract<P24SessionStatus, 'verified' | 'failed' | 'replaced'>,
  now = new Date().toISOString(),
  transactionId?: string
): Record<string, unknown> {
  const record = asRecord(metadata) ?? {}
  const { active_session_id: activeSessionId, sessions } = readP24Metadata(metadata)

  const nextSessions = sessions.map((session) => {
    if (session.sessionId !== sessionId) {
      return session
    }

    return {
      ...session,
      status,
      verifiedAt: status === 'verified' ? now : session.verifiedAt,
      failedAt: status === 'failed' ? now : session.failedAt,
      replacedAt: status === 'replaced' ? now : session.replacedAt,
      transactionId: transactionId ?? session.transactionId,
    }
  })

  return {
    ...record,
    p24: {
      active_session_id: activeSessionId,
      sessions: nextSessions,
    },
  }
}
