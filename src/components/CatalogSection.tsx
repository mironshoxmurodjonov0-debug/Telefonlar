import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Product } from '../types';
import { formatUzs } from '../utils/format';
import { SafeImage } from './SafeImage';

interface CatalogSectionProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

const BRAND_TABS = ['Barchasi', 'Apple', 'Samsung', 'Xiaomi', 'Google'] as const;

export function CatalogSection({
  products,
  loading,
  error,
  onSelectProduct,
  onQuickAdd,
}: CatalogSectionProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('Barchasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedBrand !== 'Barchasi') {
      list = list.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.specs.chip.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.basePriceUzs - b.basePriceUzs);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.basePriceUzs - a.basePriceUzs);
    } else {
      list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return list;
  }, [products, selectedBrand, searchQuery, sortBy]);

  return (
    <section id="katalog" className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        {/* Section Heading */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#E3E8E4] pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium text-[#16A34A]">Sotuvdagi smartfonlar</p>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#0A0D0B] sm:text-3xl">
              Flagmanlar kolleksiyasi
            </h2>
          </div>

          <p className="font-mono text-xs text-[#5A655E] tabular-nums">
            {filteredProducts.length} ta model ko‘rsatilmoqda
          </p>
        </div>

        {/* Interactive Filter Bar & Search Controls */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented Filter Tabs */}
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F2F5F3] p-1"
            role="tablist"
            aria-label="Brendlar bo‘yicha filtrlash"
          >
            {BRAND_TABS.map((brand) => {
              const active = selectedBrand === brand;
              return (
                <button
                  key={brand}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedBrand(brand)}
                  className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#0A0D0B] text-white'
                      : 'text-[#47524B] hover:bg-white hover:text-[#0A0D0B]'
                  }`}
                >
                  {brand}
                </button>
              );
            })}
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[240px]">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7870]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Model yoki chip qidirish..."
                aria-label="Model qidirish"
                className="min-h-[40px] w-full rounded-lg border border-[#DCE3DE] bg-[#F8FAF8] py-2 pr-3 pl-9 text-sm text-[#0A0D0B] placeholder:text-[#78857D] focus:border-[#16A34A] focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              aria-label="Saralash"
              className="min-h-[40px] rounded-lg border border-[#DCE3DE] bg-[#F8FAF8] px-3 py-2 text-sm font-medium text-[#0A0D0B] focus:border-[#16A34A] focus:bg-white focus:outline-none"
            >
              <option value="featured">Ommabop modellar</option>
              <option value="price-asc">Avval arzonroq</option>
              <option value="price-desc">Avval qimmatroq</option>
            </select>
          </div>
        </div>

        {/* Loading / Error / Empty States */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-xl border border-[#E3E8E4] bg-[#F8FAF8] p-4"
              >
                <div className="aspect-[4/3] w-full rounded-lg bg-[#E6ECE8]" />
                <div className="mt-4 h-3 w-1/3 rounded bg-[#E6ECE8]" />
                <div className="mt-2 h-5 w-2/3 rounded bg-[#DCE4DF]" />
                <div className="mt-4 h-9 w-full rounded bg-[#E6ECE8]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-10 rounded-xl border border-[#E3E8E4] bg-[#F8FAF8] p-10 text-center">
            <p className="font-display text-base font-semibold text-[#0A0D0B]">
              Qidiruv bo‘yicha smartfon topilmadi
            </p>
            <p className="mt-1 text-sm text-[#5A655E]">
              Boshqa brendni tanlang yoki qidiruv so‘zini tozalang.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedBrand('Barchasi');
                setSearchQuery('');
              }}
              className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-[#0A0D0B] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16A34A]"
            >
              Filtrlarni tozalash
            </button>
          </div>
        ) : (
          /* 3-Column Product Grid */
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {filteredProducts.map((product) => {
              const firstStorage = product.storageOptions[0] || '256 GB';
              const available = product.inStock && product.stockCount > 0;
              return (
                <article
                  key={product.id}
                  className="group flex flex-col justify-between rounded-xl border border-[#E3E8E4] bg-white transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#16A34A]/50"
                >
                  <div>
                    {/* Image (70% visual lead on neutral off-white backdrop) */}
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="block w-full overflow-hidden rounded-t-[11px] bg-[#F4F7F5] text-left"
                    >
                      <SafeImage
                        src={product.image}
                        alt={product.name}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </button>

                    {/* Clean Unboxed Metadata & Title */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-center gap-2 text-xs text-[#5A655E]">
                        <span className="font-semibold text-[#0A0D0B]">{product.brand}</span>
                        <span aria-hidden="true">·</span>
                        <span>{firstStorage}</span>
                        <span aria-hidden="true">·</span>
                        <span className={available ? 'text-[#15803D] font-medium' : 'text-red-700'}>
                          {available ? `${product.stockCount} dona mavjud` : 'Tugagan'}
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-display text-base font-bold text-[#0A0D0B]">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="text-left transition-colors hover:text-[#16A34A]"
                        >
                          {product.name}
                        </button>
                      </h3>

                      <p className="mt-1 truncate text-xs text-[#616E66]">{product.specs.chip}</p>
                    </div>
                  </div>

                  {/* Aligned Price & Buy Controls */}
                  <div className="flex items-center justify-between gap-3 border-t border-[#EFF3F0] px-5 py-3.5">
                    <div>
                      <p className="font-mono text-[15px] font-semibold text-[#0A0D0B] tabular-nums">
                        {formatUzs(product.basePriceUzs)}
                      </p>
                      {product.oldPriceUzs && (
                        <p className="font-mono text-xs text-[#8A968F] line-through tabular-nums">
                          {formatUzs(product.oldPriceUzs)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="min-h-[38px] shrink-0 whitespace-nowrap rounded-lg border border-[#DCE3DE] px-3 py-1.5 text-xs font-semibold text-[#0A0D0B] transition-colors hover:border-[#0A0D0B]"
                      >
                        Batafsil
                      </button>
                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => onQuickAdd(product)}
                        className="inline-flex min-h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-[#16A34A] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:bg-[#C6D1CA]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Savatga</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
