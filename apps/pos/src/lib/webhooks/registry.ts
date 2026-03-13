import { WebhookSubscription, WebhookEvent } from './types';
import { createServerRepository } from '@/lib/data/server-repository-factory';

function getWebhookRepository() {
  return createServerRepository<WebhookSubscription>('webhook_subscriptions');
}

async function register(
  url: string,
  events: WebhookEvent[],
  secret: string,
  description?: string
): Promise<WebhookSubscription> {
  const baseRepo = getWebhookRepository();
  // The current production table does not persist description yet.
  void description;

  return baseRepo.create({
    url,
    events,
    secret,
    is_active: true,
  } as Omit<WebhookSubscription, 'id' | 'created_at' | 'updated_at'>);
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
