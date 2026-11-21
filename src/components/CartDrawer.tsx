import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, Send, Trash2, X } from 'lucide-react';
import type { CartItem, Order, PaymentMethod } from '../types';
import { formatUzs, getPaymentLabel } from '../utils/format';
import { SafeImage } from './SafeImage';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onOrderSuccess: () => void;
}

const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand',
  'Buxoro',
  "Farg'ona",
  'Andijon',
  'Namangan',
  'Xorazm',
  'Qashqadaryo',
  'Surxondaryo',
  'Navoiy',
  'Jizzax',
  'Sirdaryo',
  "Qoraqalpog'iston",
];

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'receipt'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+998 ');
  const [region, setRegion] = useState('Toshkent shahri');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPriceUzs * i.quantity, 0);

  const handleClose = () => {
    if (step === 'receipt') {
      setStep('cart');
      setConfirmedOrder(null);
    }
    setSubmitError(null);
    onClose();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          region,
          address,
          paymentMethod,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            storage: item.storage,
            color: item.color,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as { order?: Order; error?: string };
      if (!response.ok || !data.order) {
        setSubmitError(data.error || 'Buyurtma yuborishda xatolik yuz berdi.');
        return;
      }

      setConfirmedOrder(data.order);
      setStep('receipt');
      onClearCart();
      onOrderSuccess();
      setCustomerName('');
      setCustomerPhone('+998 ');
      setAddress('');
      setNotes('');
    } catch {
      setSubmitError("Server bilan bog'lanib bo'lmadi. Qaytadan urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Buyurtma savati"
      onClick={handleClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E3E8E4] px-6 py-4">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setStep('cart');
                }}
                aria-label="Savatga qaytish"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DE] text-[#0A0D0B] hover:bg-[#F4F7F5]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="font-display text-lg font-bold text-[#0A0D0B]">
              {step === 'cart'
                ? 'Xarid savati'
                : step === 'checkout'
                  ? 'Onlayn buyurtma'
                  : 'Buyurtma tasdiqlandi'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Savatni yopish"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DE] text-[#0A0D0B] transition-colors hover:bg-[#F4F7F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'receipt' && confirmedOrder ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#16A34A]/30 bg-[#ECFDF5] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#16A34A]" />
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#15803D]">
                      Buyurtma #{confirmedOrder.orderNumber}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-[#0A0D0B]">
                      Buyurtmangiz qabul qilindi
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#39453D]">
                      Operatorlarimiz tez orada {confirmedOrder.customerPhone} raqamiga qo‘ng‘iroq
                      qilib yetkazib berish vaqtini tasdiqlaydi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E3E8E4] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A655E]">Telegram kanal holati</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      confirmedOrder.telegramSent ? 'text-[#15803D]' : 'text-amber-700'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {confirmedOrder.telegramSent
                      ? 'Kanalga yuborildi'
                      : 'Admin panelda saqlandi'}
                  </span>
                </div>

                {!confirmedOrder.telegramSent && confirmedOrder.telegramError && (
                  <p className="mt-2 text-xs text-amber-800">{confirmedOrder.telegramError}</p>
                )}

                <dl className="mt-4 space-y-2 border-t border-[#EFF3F0] pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5A655E]">Mijoz</dt>
                    <dd className="font-medium text-[#0A0D0B]">{confirmedOrder.customerName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5A655E]">Manzil</dt>
                    <dd className="text-right font-medium text-[#0A0D0B]">
                      {confirmedOrder.region}, {confirmedOrder.address}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#5A655E]">To‘lov turi</dt>
                    <dd className="font-medium text-[#0A0D0B]">
                      {getPaymentLabel(confirmedOrder.paymentMethod)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-[#EFF3F0] pt-3">
                  <p className="text-xs font-semibold text-[#0A0D0B]">Tanlangan mahsulotlar</p>
                  <ul className="mt-2 space-y-2">
                    {confirmedOrder.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-2 text-xs">
                        <span className="text-[#39453D]">
                          {item.productName} ({item.storage}) × {item.quantity}
                        </span>
                        <span className="font-mono font-semibold text-[#0A0D0B] tabular-nums">
                          {formatUzs(item.lineTotalUzs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between border-t border-[#EFF3F0] pt-3 text-sm font-bold text-[#0A0D0B]">
                    <span>Jami summa</span>
                    <span className="font-mono tabular-nums">
                      {formatUzs(confirmedOrder.totalUzs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <p className="font-display text-base font-semibold text-[#0A0D0B]">
                Savatingiz hozircha bo‘sh
              </p>
              <p className="mt-1.5 max-w-[28ch] text-sm text-[#5A655E]">
                Katalogdan yoqqan smartfonni tanlab savatga qo‘shing.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-5 min-h-[42px] rounded-lg bg-[#0A0D0B] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16A34A]"
              >
                Katalogga qaytish
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="divide-y divide-[#EFF3F0]">
              {items.map((item) => (
                <div key={item.key} className="flex gap-4 py-4 first:pt-0">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#F4F7F5]">
                    <SafeImage
                      src={item.image}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#0A0D0B]">
                          {item.productName}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#5A655E]">
                          {item.storage} · {item.color}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        aria-label={`${item.productName} ni o‘chirish`}
                        className="rounded p-1 text-[#78857D] transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-lg border border-[#DCE3DE]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, -1)}
                          aria-label="Kamaytirish"
                          className="inline-flex h-8 w-8 items-center justify-center text-[#0A0D0B] hover:bg-[#F4F7F5]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, 1)}
                          aria-label="Ko‘paytirish"
                          className="inline-flex h-8 w-8 items-center justify-center text-[#0A0D0B] hover:bg-[#F4F7F5]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="font-mono text-xs font-bold text-[#0A0D0B] tabular-nums">
                        {formatUzs(item.unitPriceUzs * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                  {submitError}
                </div>
              )}

              <div>
                <label htmlFor="order-name" className="block text-xs font-semibold text-[#0A0D0B]">
                  Ism va familiyangiz
                </label>
                <input
                  id="order-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masalan: Azizbek Karimov"
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="order-phone" className="block text-xs font-semibold text-[#0A0D0B]">
                  Telefon raqamingiz
                </label>
                <input
                  id="order-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 font-mono text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="order-region" className="block text-xs font-semibold text-[#0A0D0B]">
                  Hudud / Shahar
                </label>
                <select
                  id="order-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] bg-white px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="order-address" className="block text-xs font-semibold text-[#0A0D0B]">
                  Yetkazib berish manzili
                </label>
                <input
                  id="order-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tuman, ko‘cha, uy va xonadon raqami"
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <p className="block text-xs font-semibold text-[#0A0D0B]">To‘lov usuli</p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {(
                    [
                      ['cash', 'Naqd pul (yetkazib berganda)'],
                      ['card', 'Click / Payme / Bank kartasi'],
                      ['installment', 'Muddatli to‘lov (12 oygacha)'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex min-h-[42px] cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                        paymentMethod === value
                          ? 'border-[#16A34A] bg-[#ECFDF5] text-[#0A0D0B]'
                          : 'border-[#DCE3DE] bg-white text-[#47524B] hover:border-[#0A0D0B]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value)}
                        className="accent-[#16A34A]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="order-notes" className="block text-xs font-semibold text-[#0A0D0B]">
                  Qo‘shimcha izoh (ixtiyoriy)
                </label>
                <textarea
                  id="order-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Yetkazib berish vaqti yoki qo‘shimcha istaklar..."
                  className="mt-1.5 w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {(items.length > 0 || step === 'receipt') && (
          <div className="border-t border-[#E3E8E4] bg-[#F8FAF8] px-6 py-4">
            {step === 'receipt' ? (
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] w-full rounded-lg bg-[#0A0D0B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16A34A]"
              >
                Do‘konga qaytish
              </button>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-[#5A655E]">Jami to‘lov (yetkazish bepul)</span>
                  <span className="font-mono text-base font-bold text-[#0A0D0B] tabular-nums">
                    {formatUzs(subtotal)}
                  </span>
                </div>

                {step === 'cart' ? (
                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    className="min-h-[46px] w-full rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803D]"
                  >
                    Buyurtmani rasmiylashtirish
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitting}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>{submitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
