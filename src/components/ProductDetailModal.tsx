import { useEffect, useState } from 'react';
import { Check, ShoppingBag, X } from 'lucide-react';
import type { Product } from '../types';
import { formatUzs } from '../utils/format';
import { SafeImage } from './SafeImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, storage: string, color: string, openCheckout: boolean) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    if (product) {
      setSelectedStorage(product.storageOptions[0] || '256 GB');
      setSelectedColor(product.colors[0] || 'Qora');
    }
  }, [product]);

  if (!product) return null;

  const storageOffset = product.storagePriceOffsets[selectedStorage] ?? 0;
  const activePrice = product.basePriceUzs + storageOffset;
  const available = product.inStock && product.stockCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#DCE3DE] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Oynani yopish"
          className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE3DE] bg-white text-[#0A0D0B] transition-colors hover:bg-[#F4F7F5]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Studio Photo */}
          <div className="bg-[#F4F7F5] p-6 md:col-span-6 md:flex md:items-center md:justify-center">
            <SafeImage
              src={product.image}
              alt={product.name}
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#5A655E]">
                <span className="font-semibold text-[#16A34A]">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{available ? `${product.stockCount} dona mavjud` : 'Sotuvda yo‘q'}</span>
              </div>

              <h2
                id="pdp-title"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-[#0A0D0B]"
              >
                {product.name}
              </h2>

              <p className="mt-2 font-mono text-2xl font-bold text-[#0A0D0B] tabular-nums">
                {formatUzs(activePrice)}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-[#47524B]">{product.description}</p>

              {/* Storage Options */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#0A0D0B]">Xotira hajmi</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.storageOptions.map((opt) => {
                    const active = selectedStorage === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedStorage(opt)}
                        className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#0A0D0B] bg-[#0A0D0B] text-white'
                            : 'border-[#DCE3DE] bg-white text-[#0A0D0B] hover:border-[#16A34A]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Options */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#0A0D0B]">Rang tanlovi</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const active = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#16A34A] bg-[#ECFDF5] font-semibold text-[#15803D]'
                            : 'border-[#DCE3DE] bg-white text-[#47524B] hover:border-[#0A0D0B]'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Technical Specs */}
              <dl className="mt-6 divide-y divide-[#EFF3F0] border-t border-b border-[#EFF3F0] text-xs">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-[#5A655E]">Ekran</dt>
                  <dd className="text-right font-medium text-[#0A0D0B]">{product.specs.display}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-[#5A655E]">Protsessor</dt>
                  <dd className="text-right font-medium text-[#0A0D0B]">{product.specs.chip}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-[#5A655E]">Kamera</dt>
                  <dd className="text-right font-medium text-[#0A0D0B]">{product.specs.camera}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-[#5A655E]">Batareya</dt>
                  <dd className="text-right font-medium text-[#0A0D0B]">{product.specs.battery}</dd>
                </div>
              </dl>
            </div>

            {/* Purchase CTAs */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!available}
                onClick={() => {
                  onAddToCart(product, selectedStorage, selectedColor, false);
                  onClose();
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#0A0D0B] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A0D0B] transition-colors hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span>Savatga qo‘shish</span>
              </button>
              <button
                type="button"
                disabled={!available}
                onClick={() => {
                  onAddToCart(product, selectedStorage, selectedColor, true);
                  onClose();
                }}
                className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:bg-[#C6D1CA]"
              >
                Hozir buyurtma berish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
