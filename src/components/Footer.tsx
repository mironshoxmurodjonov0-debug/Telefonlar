interface FooterProps {
  onNavigateView: (view: 'store' | 'admin', sectionId?: string) => void;
}

export function Footer({ onNavigateView }: FooterProps) {
  return (
    <footer className="bg-[#0A0D0B] text-white">
      <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-white/15 pb-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-lg font-extrabold tracking-tight text-white">
              VERDE MOBILE
            </p>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-[#9CA7A0]">
              Toshkent shahri, Amir Temur shoh ko‘chasi 108. Har kuni 09:00 dan 21:00 gacha xizmat
              ko‘rsatamiz.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-[#4ADE80]">Bo‘limlar</p>
            <ul className="mt-3 space-y-2 text-sm text-[#B6C0B9]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('store', 'katalog')}
                  className="hover:text-white"
                >
                  Smartfonlar katalogi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('store', 'kafolat')}
                  className="hover:text-white"
                >
                  Rasmiy kafolat
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('admin')}
                  className="hover:text-white"
                >
                  Admin Panel
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold text-[#4ADE80]">Aloqa</p>
            <p className="mt-3 font-mono text-sm text-white tabular-nums">+998 71 200 45 45</p>
            <p className="mt-1 text-xs text-[#9CA7A0]">Onlayn buyurtmalar 24/7 qabul qilinadi</p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 pt-6 text-xs text-[#7B867F] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} VERDE MOBILE. Barcha huquqlar himoyalangan.</p>
          <p>Original smartfonlar do‘koni</p>
        </div>
      </div>
    </footer>
  );
}
