import type { KitchenTicket } from '@/types/kitchen';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const windowWithWebkit = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextCtor = windowWithWebkit.AudioContext ?? windowWithWebkit.webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainValue: number
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export function getNewPendingTicketIds(
  previousTicketIds: ReadonlySet<string>,
  tickets: KitchenTicket[]
): string[] {
  return tickets
    .map((ticket) => ticket.id)
    .filter((ticketId) => !previousTicketIds.has(ticketId));
}

export async function primeKitchenAlertAudio(): Promise<void> {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    await context.resume().catch(() => undefined);
  }
}

export async function playNewKitchenOrderSound(): Promise<void> {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    await context.resume().catch(() => undefined);
  }

  const startAt = context.currentTime + 0.01;
  scheduleTone(context, 880, startAt, 0.14, 0.12);
  scheduleTone(context, 1320, startAt + 0.16, 0.2, 0.1);
}
