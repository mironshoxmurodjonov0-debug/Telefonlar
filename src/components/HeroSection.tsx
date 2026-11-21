import { ArrowRight } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface HeroSectionProps {
  onBrowseCatalog: () => void;
  onOpenAdmin: () => void;
}

export function HeroSection({ onBrowseCatalog, onOpenAdmin }: HeroSectionProps) {
  return (
    <section id="hero" className="bg-[#0A0D0B] text-white">
      <div className="mx-auto max-w-[1280px] px-5 pt-10 pb-12 sm:px-8 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Typography & Focal CTA */}
          <div className="flex flex-col justify-between py-2 lg:col-span-6">
            <div>
              <p className="text-xs font-medium tracking-wider text-[#4ADE80]">
                Flagman smartfonlar · Rasmiy IMEI · Toshkent
              </p>
              <h1 className="text-balance mt-4 font-display text-[clamp(2.25rem,4vw,3.65rem)] font-bold leading-[1.08] tracking-tight text-white">
                Yangi avlod smartfonlari birgina bosishda
              </h1>
              <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[#B6C0B9] sm:text-base">
                Original Apple, Samsung, Xiaomi va Google flagmanlari. Onlayn buyurtma bering —
                so‘rovingiz bir soniyada Telegram kanalimizga tushadi va operatorlarimiz bog‘lanadi.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="inline-flex min-h-[46px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#15803D]"
              >
                <span>Modellarni ko‘rish</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex min-h-[46px] shrink-0 items-center whitespace-nowrap rounded-lg border border-white/20 px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:border-[#4ADE80] hover:text-[#4ADE80]"
              >
                Admin boshqaruvi
              </button>
            </div>
          </div>

          {/* Right Studio Media */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121714] lg:col-span-6">
            <SafeImage
              src="/src/assets/images/hero_flagship_emerald_1795237738186.jpg"
              alt="Yashil va qora titan korpusli flagman smartfon"
              darkSurface
              className="aspect-[16/9] h-full w-full object-cover lg:aspect-auto"
            />
          </div>
        </div>

        {/* Full-width 4-column Architectural Trust Strip */}
        <div className="mt-10 grid grid-cols-2 border-t border-white/15 pt-8 sm:grid-cols-4">
          <div className="pr-4">
            <p className="font-mono text-sm font-semibold text-[#4ADE80] tabular-nums">100% Original</p>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA7A0]">
              Barcha qurilmalar UzIMEI tizimida ro‘yxatdan o‘tgan
            </p>
          </div>
          <div className="border-l border-white/15 pl-4 pr-4">
            <p className="font-mono text-sm font-semibold text-white tabular-nums">12 oy kafolat</p>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA7A0]">
              Rasmiy servis markazi orqali bepul texnik xizmat
            </p>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 pr-4 sm:mt-0 sm:border-t-0 sm:border-l sm:border-white/15 sm:pt-0 sm:pl-4">
            <p className="font-mono text-sm font-semibold text-white tabular-nums">2 soatda yetkazish</p>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA7A0]">
              Toshkent bo‘ylab tezkor kuryer, viloyatlarga 24 soat
            </p>
          </div>
          <div className="mt-6 border-t border-l border-white/10 pt-4 pl-4 sm:mt-0 sm:border-t-0 sm:border-white/15 sm:pt-0">
            <p className="font-mono text-sm font-semibold text-white tabular-nums">Real-vaqt Telegram</p>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA7A0]">
              Buyurtma tasdiqlanishi bilan kanalga tezkor uzatish
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
