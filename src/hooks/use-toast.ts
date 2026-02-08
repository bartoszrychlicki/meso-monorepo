/**
 * Toast Hook
 *
 * Simple toast notification hook for user feedback.
 * This is a minimal implementation for MVP.
 */

type ToastVariant = 'default' | 'destructive';

interface Toast {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

/**
 * Toast hook
 * For MVP, this uses browser alerts. In production, integrate with a proper toast library.
 */
export function useToast() {
  const toast = ({ title, description, variant }: Toast) => {
    const message = description ? `${title}\n${description}` : title;

    if (variant === 'destructive') {
      console.error(`[Toast Error] ${message}`);
      alert(`❌ ${message}`);
    } else {
      console.log(`[Toast] ${message}`);
      alert(`✓ ${message}`);
    }
  };

  return { toast };
}
