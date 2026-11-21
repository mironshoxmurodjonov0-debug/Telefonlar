import type { OrderStatus, PaymentMethod } from '../types';

export function formatUzs(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

export function formatDateTimeUz(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'Yangi';
    case 'confirmed':
      return 'Tasdiqlandi';
    case 'shipping':
      return "Yo'lda";
    case 'delivered':
      return 'Yetkazildi';
    case 'cancelled':
      return 'Bekor qilindi';
  }
}

export function getPaymentLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'Naqd pul';
    case 'card':
      return 'Click / Payme';
    case 'installment':
      return "Muddatli to'lov";
  }
}
