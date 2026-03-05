import { NextRequest, NextResponse } from 'next/server';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import { OrderStatus } from '@/types/enums';
import type { KitchenTicket } from '@/types/kitchen';

export async function GET(request: NextRequest) {
  try {
    const repo = createServerRepository<KitchenTicket>('kitchen_tickets');
    const filter = request.nextUrl.searchParams.get('filter');

    let tickets: KitchenTicket[];

    if (filter === 'completed_today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      tickets = await repo.findMany(
        (ticket) =>
          ticket.status === OrderStatus.DELIVERED &&
          !!ticket.completed_at &&
          ticket.completed_at >= todayISO
      );
    } else {
      tickets = await repo.findMany(
        (ticket) =>
          ticket.status === OrderStatus.PENDING ||
          ticket.status === OrderStatus.PREPARING ||
          ticket.status === OrderStatus.READY
      );
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[KDS GET] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
