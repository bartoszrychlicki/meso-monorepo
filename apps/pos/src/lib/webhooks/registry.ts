import { WebhookSubscription, WebhookEvent } from './types';
import { createServerRepository } from '@/lib/data/server-repository-factory';

function getWebhookRepository() {
  return createServerRepository<WebhookSubscription>('webhook_subscriptions');
}

function canonicalizeEvents(events: WebhookEvent[]): WebhookEvent[] {
  return [...new Set(events)].sort() as WebhookEvent[];
}

function eventsMatch(left: WebhookEvent[], right: WebhookEvent[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((event, index) => event === right[index]);
}

function isDuplicateWebhookError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('duplicate key value') &&
    message.includes('idx_integrations_webhook_subscriptions_unique_target');
}

async function findExactMatches(
  url: string,
  secret: string,
  events: WebhookEvent[]
): Promise<WebhookSubscription[]> {
  const baseRepo = getWebhookRepository();
  const canonicalEvents = canonicalizeEvents(events);

  const matches = await baseRepo.findMany(
    (subscription) =>
      subscription.url === url &&
      subscription.secret === secret &&
      eventsMatch(
        canonicalizeEvents(subscription.events as WebhookEvent[]),
        canonicalEvents
      )
  );

  return matches.sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    const leftUpdated = new Date(left.updated_at).getTime();
    const rightUpdated = new Date(right.updated_at).getTime();
    return rightUpdated - leftUpdated;
  });
}

async function reactivateExactMatch(
  subscription: WebhookSubscription,
  events: WebhookEvent[]
): Promise<WebhookSubscription> {
  const baseRepo = getWebhookRepository();
  return baseRepo.update(subscription.id, {
    is_active: true,
    events,
  });
}

async function register(
  url: string,
  events: WebhookEvent[],
  secret: string,
  description?: string
): Promise<WebhookSubscription> {
  const baseRepo = getWebhookRepository();
  const canonicalEvents = canonicalizeEvents(events);
  // The current production table does not persist description yet.
  void description;

  const exactMatches = await findExactMatches(url, secret, canonicalEvents);
  const activeMatch = exactMatches.find((subscription) => subscription.is_active);
  if (activeMatch) {
    return activeMatch;
  }

  const inactiveMatch = exactMatches[0];
  if (inactiveMatch) {
    return reactivateExactMatch(inactiveMatch, canonicalEvents);
  }

  try {
    return await baseRepo.create({
      url,
      events: canonicalEvents,
      secret,
      is_active: true,
    } as Omit<WebhookSubscription, 'id' | 'created_at' | 'updated_at'>);
  } catch (error) {
    if (!isDuplicateWebhookError(error)) {
      throw error;
    }

    const concurrentMatch = (await findExactMatches(url, secret, canonicalEvents))[0];
    if (concurrentMatch) {
      return concurrentMatch.is_active
        ? concurrentMatch
        : reactivateExactMatch(concurrentMatch, canonicalEvents);
    }

    throw error;
  }
}

async function unregister(id: string): Promise<void> {
  const baseRepo = getWebhookRepository();
  return baseRepo.delete(id);
}

async function list(): Promise<WebhookSubscription[]> {
  const baseRepo = getWebhookRepository();
  const result = await baseRepo.findAll({
    page: 1,
    per_page: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  return result.data;
}

async function getSubscriptionsForEvent(
  event: WebhookEvent
): Promise<WebhookSubscription[]> {
  const baseRepo = getWebhookRepository();
  return baseRepo.findMany(
    (sub) => sub.is_active && sub.events.includes(event)
  );
}

async function findById(
  id: string
): Promise<WebhookSubscription | null> {
  const baseRepo = getWebhookRepository();
  try {
    return await baseRepo.findById(id);
  } catch {
    return null;
  }
}

export const webhookRegistry = {
  register,
  unregister,
  list,
  getSubscriptionsForEvent,
  findById,
};
