import { WebhookSubscription, WebhookEvent } from './types';
import { createRepository } from '@/lib/data/repository-factory';

const baseRepo = createRepository<WebhookSubscription>('webhook_subscriptions');

async function register(
  url: string,
  events: WebhookEvent[],
  secret: string,
  description?: string
): Promise<WebhookSubscription> {
  return baseRepo.create({
    url,
    events,
    secret,
    is_active: true,
    description,
  } as Omit<WebhookSubscription, 'id' | 'created_at' | 'updated_at'>);
}

async function unregister(id: string): Promise<void> {
  return baseRepo.delete(id);
}

async function list(): Promise<WebhookSubscription[]> {
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
  return baseRepo.findMany(
    (sub) => sub.is_active && sub.events.includes(event)
  );
}

async function findById(
  id: string
): Promise<WebhookSubscription | null> {
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
