export function TrustSection() {
  return (
    <section id="kafolat" className="border-t border-[#E3E8E4] bg-[#F5F7F5] py-14 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-medium text-[#16A34A]">Nima uchun Verde Mobile</p>
          <h2 className="text-balance mt-1.5 font-display text-2xl font-bold tracking-tight text-[#0A0D0B] sm:text-3xl">
            Har bir qurilma kafolatlangan va tezkor yetkaziladi
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="border-t border-[#D6DFD9] pt-5">
            <h3 className="font-display text-base font-bold text-[#0A0D0B]">
              01. Rasmiy UzIMEI va kafolat
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#47524B]">
              Har bir smartfon zavod plombasi bilan keladi, UzIMEI tizimidan rasman o‘tkazilgan va
              12 oylik servis kafolat taloniga ega.
            </p>
          </div>

          <div id="yetkazish" className="border-t border-[#D6DFD9] pt-5">
            <h3 className="font-display text-base font-bold text-[#0A0D0B]">
              02. Bepul va tezkor yetkazish
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#47524B]">
              Toshkent shahri ichida 2 soat ichida kuryer orqali bepul yetkazib beramiz. Boshqa
              viloyatlarga 24 soat ichida ishonchli pochta xizmati mavjud.
            </p>
          </div>

          <div className="border-t border-[#D6DFD9] pt-5">
            <h3 className="font-display text-base font-bold text-[#0A0D0B]">
              03. Telegram orqali tezkor nazorat
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#47524B]">
              Saytda qoldirilgan har bir buyurtma shu zahotiyoq Telegram kanalga tushadi va menejer
              tomonidan real vaqt rejimida tasdiqlanadi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
