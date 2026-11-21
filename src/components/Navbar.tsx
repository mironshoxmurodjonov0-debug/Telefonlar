import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

interface NavbarProps {
  activeView: 'store' | 'admin';
  onNavigateView: (view: 'store' | 'admin', sectionId?: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export function Navbar({ activeView, onNavigateView, cartCount, onOpenCart }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (view: 'store' | 'admin', sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigateView(view, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E3E8E4] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-5 py-3.5 sm:px-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('store', 'hero')}
          className="shrink-0 whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-[#0A0D0B] transition-colors hover:text-[#16A34A]"
        >
          VERDE MOBILE
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#47524B] md:flex">
          <button
            type="button"
            onClick={() => handleLinkClick('store', 'katalog')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
              activeView === 'store'
                ? 'border-transparent hover:border-[#16A34A] hover:text-[#0A0D0B]'
                : 'border-transparent hover:border-[#16A34A] hover:text-[#0A0D0B]'
            }`}
          >
            Katalog
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('store', 'kafolat')}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 transition-colors hover:border-[#16A34A] hover:text-[#0A0D0B]"
          >
            Kafolat
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('store', 'yetkazish')}
            className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-1 transition-colors hover:border-[#16A34A] hover:text-[#0A0D0B]"
          >
            Yetkazish
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('admin')}
            className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
              activeView === 'admin'
                ? 'border-[#16A34A] font-semibold text-[#0A0D0B]'
                : 'border-transparent hover:border-[#16A34A] hover:text-[#0A0D0B]'
            }`}
          >
            Admin Panel
          </button>
        </nav>

        {/* Zone 3: 1 primary action + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#0A0D0B] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16A34A]"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>Savat</span>
            <span className="tabular-nums font-mono text-[#4ADE80]">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E3E8E4] text-[#0A0D0B] transition-colors hover:bg-[#F5F7F5] md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Interactive Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E3E8E4] bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleLinkClick('store', 'katalog')}
              className="flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-sm font-medium text-[#0A0D0B] transition-colors hover:bg-[#F5F7F5]"
            >
              <span>Smartfonlar katalogi</span>
              <span className="text-xs text-[#16A34A]">Ko‘rish</span>
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('store', 'kafolat')}
              className="flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-sm font-medium text-[#0A0D0B] transition-colors hover:bg-[#F5F7F5]"
            >
              <span>Rasmiy kafolat</span>
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('store', 'yetkazish')}
              className="flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-sm font-medium text-[#0A0D0B] transition-colors hover:bg-[#F5F7F5]"
            >
              <span>Yetkazib berish</span>
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('admin')}
              className="flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-sm font-semibold text-[#16A34A] transition-colors hover:bg-[#F5F7F5]"
            >
              <span>Admin Panel</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
