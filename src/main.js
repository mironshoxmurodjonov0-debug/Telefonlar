// Pure Vanilla JavaScript storefront + real-time Telegram checkout + Admin Panel

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

const STUDIO_IMAGES = [
  {
    label: 'iPhone Pro Titanium (Qora)',
    url: '/src/assets/images/phone_iphone_pro_black_1795237737799.jpg',
  },
  {
    label: 'Galaxy Ultra (Yashil Emerald)',
    url: '/src/assets/images/phone_ultra_emerald_stylus_1795237738603.jpg',
  },
  {
    label: 'Pixel Pro (Yashil Sage)',
    url: '/src/assets/images/phone_pixel_green_visor_1795237738104.jpg',
  },
  {
    label: 'Kamera Flagman (Qora)',
    url: '/src/assets/images/phone_camera_flagship_black_1795237738256.jpg',
  },
  {
    label: 'Buklanuvchi (Yashil-Qora)',
    url: '/src/assets/images/phone_foldable_obsidian_1795237737969.jpg',
  },
  {
    label: 'Hero Emerald Edition',
    url: '/src/assets/images/hero_flagship_emerald_1795237738186.jpg',
  },
];

const state = {
  activeView: 'store',
  products: [],
  loadingProducts: true,
  productsError: null,
  selectedBrand: 'Barchasi',
  searchQuery: '',
  sortBy: 'featured',
  cartItems: [],
  cartStep: 'cart',
  confirmedOrder: null,
  selectedProduct: null,
  modalStorage: '',
  modalColor: '',
  // Admin state (Bearer token stored strictly in JS memory)
  adminToken: null,
  authStatus: null,
  adminTab: 'orders',
  orders: [],
  stats: { totalOrders: 0, newOrders: 0, deliveredOrders: 0, totalRevenueUzs: 0 },
  statusFilter: 'all',
  showAddProduct: false,
  tgConfig: null,
  adminMessage: null,
  tgFeedback: null,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeImageUrl(url) {
  const s = String(url || '').trim();
  if (!s) return false;
  if (s.startsWith('/')) return !s.startsWith('//');
  try {
    const parsed = new URL(s);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function formatUzs(amount) {
  return `${Math.round(amount).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

function formatDateTimeUz(iso) {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso || '');
  }
}

function getStatusLabel(status) {
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
    default:
      return String(status);
  }
}

function getPaymentLabel(method) {
  switch (method) {
    case 'cash':
      return 'Naqd pul';
    case 'card':
      return 'Click / Payme';
    case 'installment':
      return "Muddatli to'lov";
    default:
      return String(method);
  }
}

// DOM Refs
const storeViewEl = document.getElementById('store-view');
const adminViewEl = document.getElementById('admin-view');
const navAdminBtn = document.getElementById('nav-admin-btn');
const headerCartCountEl = document.getElementById('header-cart-count');
const catalogGridEl = document.getElementById('catalog-grid');
const catalogCountEl = document.getElementById('catalog-count');
const brandTabsEl = document.getElementById('brand-tabs');
const searchInputEl = document.getElementById('search-input');
const sortSelectEl = document.getElementById('sort-select');
const mobileMenuToggleEl = document.getElementById('mobile-menu-toggle');
const mobileNavDrawerEl = document.getElementById('mobile-nav-drawer');
const productModalEl = document.getElementById('product-modal');
const productModalContentEl = document.getElementById('product-modal-content');
const cartDrawerEl = document.getElementById('cart-drawer');
const cartDrawerPanelEl = document.getElementById('cart-drawer-panel');
const footerYearEl = document.getElementById('footer-year');

if (footerYearEl) {
  footerYearEl.textContent = String(new Date().getFullYear());
}

function updateCartCounter() {
  const count = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  if (headerCartCountEl) {
    headerCartCountEl.textContent = `(${count})`;
  }
}

function navigateView(view, sectionId) {
  state.activeView = view;
  mobileNavDrawerEl?.classList.add('hidden');
  mobileMenuToggleEl?.setAttribute('aria-expanded', 'false');

  if (view === 'store') {
    storeViewEl?.classList.remove('hidden');
    adminViewEl?.classList.add('hidden');
    navAdminBtn?.classList.remove('active');
    if (sectionId) {
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } else {
    storeViewEl?.classList.add('hidden');
    adminViewEl?.classList.remove('hidden');
    navAdminBtn?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadAdminGate();
  }
}

async function fetchProducts() {
  state.loadingProducts = true;
  state.productsError = null;
  renderCatalog();
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Katalogni yuklab bo‘lmadi.');
    const data = await res.json();
    state.products = Array.isArray(data.products) ? data.products : [];
  } catch {
    state.productsError = 'Smartfonlar katalogini yuklashda xatolik yuz berdi.';
  } finally {
    state.loadingProducts = false;
    renderCatalog();
  }
}

function getFilteredProducts() {
  let list = [...state.products];
  if (state.selectedBrand !== 'Barchasi') {
    list = list.filter((p) => p.brand.toLowerCase() === state.selectedBrand.toLowerCase());
  }
  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.specs?.chip || '').toLowerCase().includes(q)
    );
  }
  if (state.sortBy === 'price-asc') {
    list.sort((a, b) => a.basePriceUzs - b.basePriceUzs);
  } else if (state.sortBy === 'price-desc') {
    list.sort((a, b) => b.basePriceUzs - a.basePriceUzs);
  } else {
    list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return list;
}

function renderCatalog() {
  if (!catalogGridEl || !catalogCountEl) return;

  if (state.loadingProducts) {
    catalogCountEl.textContent = 'Yuklanmoqda...';
    catalogGridEl.innerHTML =
      '<div class="empty-box"><h3>Smartfonlar yuklanmoqda...</h3></div>';
    return;
  }

  if (state.productsError) {
    catalogCountEl.textContent = 'Xatolik';
    catalogGridEl.innerHTML = `<div class="alert-error">${escapeHtml(state.productsError)}</div>`;
    return;
  }

  const list = getFilteredProducts();
  catalogCountEl.textContent = `${list.length} ta model ko‘rsatilmoqda`;

  if (list.length === 0) {
    catalogGridEl.innerHTML = `
      <div class="empty-box" style="grid-column: 1 / -1;">
        <h3>Qidiruv bo‘yicha smartfon topilmadi</h3>
        <p>Boshqa brendni tanlang yoki qidiruv so‘zini tozalang.</p>
        <button type="button" id="reset-filters-btn" class="btn-primary" style="margin-top: 16px;">Filtrlarni tozalash</button>
      </div>
    `;
    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
      state.selectedBrand = 'Barchasi';
      state.searchQuery = '';
      if (searchInputEl) searchInputEl.value = '';
      brandTabsEl?.querySelectorAll('.brand-tab').forEach((btn) => {
        const isAll = btn.dataset.brand === 'Barchasi';
        btn.classList.toggle('active', isAll);
        btn.setAttribute('aria-selected', String(isAll));
      });
      renderCatalog();
    });
    return;
  }

  catalogGridEl.innerHTML = list
    .map((p) => {
      const firstStorage = (p.storageOptions && p.storageOptions[0]) || '256 GB';
      const available = p.inStock && p.stockCount > 0;
      const safeImg = isSafeImageUrl(p.image) ? escapeHtml(p.image) : '';
      const oldPriceHtml = p.oldPriceUzs
        ? `<p class="product-old-price tabular-nums">${escapeHtml(formatUzs(p.oldPriceUzs))}</p>`
        : '';

      return `
        <article class="product-card" data-product-id="${escapeHtml(p.id)}">
          <div>
            <button type="button" class="product-image-btn" data-open-pdp="${escapeHtml(p.id)}">
              <img src="${safeImg}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" />
            </button>
            <div class="product-body">
              <div class="product-meta">
                <span class="product-meta-brand">${escapeHtml(p.brand)}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(firstStorage)}</span>
                <span aria-hidden="true">·</span>
                <span class="${available ? 'product-meta-stock' : 'product-meta-out'}">
                  ${available ? `${escapeHtml(p.stockCount)} dona mavjud` : 'Tugagan'}
                </span>
              </div>
              <h3 class="product-title">
                <button type="button" data-open-pdp="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>
              </h3>
              <p class="product-chip">${escapeHtml(p.specs?.chip || '')}</p>
            </div>
          </div>

          <div class="product-footer">
            <div>
              <p class="product-price tabular-nums">${escapeHtml(formatUzs(p.basePriceUzs))}</p>
              ${oldPriceHtml}
            </div>
            <div class="product-actions">
              <button type="button" class="btn-secondary-sm" data-open-pdp="${escapeHtml(p.id)}">Batafsil</button>
              <button type="button" class="btn-add-sm" data-quick-add="${escapeHtml(p.id)}" ${available ? '' : 'disabled'}>
                + Savatga
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  catalogGridEl.querySelectorAll('[data-open-pdp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-pdp');
      const prod = state.products.find((p) => p.id === id);
      if (prod) openProductModal(prod);
    });
  });

  catalogGridEl.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-quick-add');
      const prod = state.products.find((p) => p.id === id);
      if (prod) {
        const storage = prod.storageOptions?.[0] || '256 GB';
        const color = prod.colors?.[0] || 'Qora';
        addToCart(prod, storage, color, true);
      }
    });
  });
}

function addToCart(product, storage, color, openDrawer = false) {
  const offset = product.storagePriceOffsets?.[storage] || 0;
  const unitPriceUzs = product.basePriceUzs + offset;
  const key = `${product.id}__${storage}__${color}`;
  const existing = state.cartItems.find((item) => item.key === key);

  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + 1);
  } else {
    state.cartItems.push({
      key,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      image: product.image,
      storage,
      color,
      unitPriceUzs,
      quantity: 1,
    });
  }

  updateCartCounter();
  if (openDrawer) {
    state.cartStep = 'cart';
    openCartDrawer();
  }
}

function openProductModal(product) {
  state.selectedProduct = product;
  state.modalStorage = product.storageOptions?.[0] || '256 GB';
  state.modalColor = product.colors?.[0] || 'Qora';
  renderProductModal();
  productModalEl?.classList.remove('hidden');
}

function closeProductModal() {
  state.selectedProduct = null;
  productModalEl?.classList.add('hidden');
}

function renderProductModal() {
  const p = state.selectedProduct;
  if (!p || !productModalContentEl) return;

  const offset = p.storagePriceOffsets?.[state.modalStorage] || 0;
  const activePrice = p.basePriceUzs + offset;
  const available = p.inStock && p.stockCount > 0;
  const safeImg = isSafeImageUrl(p.image) ? escapeHtml(p.image) : '';

  productModalContentEl.innerHTML = `
    <button type="button" class="modal-close" id="close-pdp-btn" aria-label="Oynani yopish">✕</button>
    <div class="pdp-layout">
      <div class="pdp-media">
        <img src="${safeImg}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" />
      </div>
      <div class="pdp-content">
        <div>
          <div class="product-meta">
            <span class="product-meta-stock">${escapeHtml(p.brand)}</span>
            <span aria-hidden="true">·</span>
            <span>${escapeHtml(p.category)}</span>
            <span aria-hidden="true">·</span>
            <span>${available ? `${escapeHtml(p.stockCount)} dona mavjud` : 'Sotuvda yo‘q'}</span>
          </div>
          <h2 id="pdp-title" class="pdp-title">${escapeHtml(p.name)}</h2>
          <p class="pdp-price tabular-nums">${escapeHtml(formatUzs(activePrice))}</p>
          <p class="pdp-desc">${escapeHtml(p.description)}</p>

          <div class="variant-block">
            <p class="variant-label">Xotira hajmi</p>
            <div class="variant-list">
              ${(p.storageOptions || [])
                .map(
                  (opt) => `
                  <button type="button" class="variant-btn ${opt === state.modalStorage ? 'active-dark' : ''}" data-storage="${escapeHtml(opt)}">
                    ${escapeHtml(opt)}
                  </button>`
                )
                .join('')}
            </div>
          </div>

          <div class="variant-block">
            <p class="variant-label">Rang tanlovi</p>
            <div class="variant-list">
              ${(p.colors || [])
                .map(
                  (col) => `
                  <button type="button" class="variant-btn ${col === state.modalColor ? 'active-green' : ''}" data-color="${escapeHtml(col)}">
                    ${escapeHtml(col)}
                  </button>`
                )
                .join('')}
            </div>
          </div>

          <dl class="spec-list">
            <div class="spec-row"><dt>Ekran</dt><dd>${escapeHtml(p.specs?.display)}</dd></div>
            <div class="spec-row"><dt>Protsessor</dt><dd>${escapeHtml(p.specs?.chip)}</dd></div>
            <div class="spec-row"><dt>Kamera</dt><dd>${escapeHtml(p.specs?.camera)}</dd></div>
            <div class="spec-row"><dt>Batareya</dt><dd>${escapeHtml(p.specs?.battery)}</dd></div>
          </dl>
        </div>

        <div class="pdp-actions">
          <button type="button" class="btn-outline-dark" id="pdp-add-btn" ${available ? '' : 'disabled'}>Savatga qo‘shish</button>
          <button type="button" class="btn-primary" id="pdp-buy-now-btn" ${available ? '' : 'disabled'}>Hozir buyurtma berish</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('close-pdp-btn')?.addEventListener('click', closeProductModal);
  productModalContentEl.querySelectorAll('[data-storage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.modalStorage = btn.getAttribute('data-storage') || '';
      renderProductModal();
    });
  });
  productModalContentEl.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.modalColor = btn.getAttribute('data-color') || '';
      renderProductModal();
    });
  });
  document.getElementById('pdp-add-btn')?.addEventListener('click', () => {
    addToCart(p, state.modalStorage, state.modalColor, false);
    closeProductModal();
  });
  document.getElementById('pdp-buy-now-btn')?.addEventListener('click', () => {
    addToCart(p, state.modalStorage, state.modalColor, true);
    closeProductModal();
  });
}

function openCartDrawer() {
  renderCartDrawer();
  cartDrawerEl?.classList.remove('hidden');
}

function closeCartDrawer() {
  if (state.cartStep === 'receipt') {
    state.cartStep = 'cart';
    state.confirmedOrder = null;
  }
  cartDrawerEl?.classList.add('hidden');
}

function renderCartDrawer() {
  if (!cartDrawerPanelEl) return;

  const subtotal = state.cartItems.reduce((sum, i) => sum + i.unitPriceUzs * i.quantity, 0);
  const titleText =
    state.cartStep === 'cart'
      ? 'Xarid savati'
      : state.cartStep === 'checkout'
        ? 'Onlayn buyurtma'
        : 'Buyurtma tasdiqlandi';

  let bodyHtml = '';
  let footerHtml = '';

  if (state.cartStep === 'receipt' && state.confirmedOrder) {
    const o = state.confirmedOrder;
    bodyHtml = `
      <div class="form-stack">
        <div class="alert-success">
          <p style="font-family: var(--font-mono); font-weight: 700;">Buyurtma #${escapeHtml(o.orderNumber)}</p>
          <h3 style="margin-top: 6px; font-size: 17px; color: var(--ink-primary);">Buyurtmangiz qabul qilindi</h3>
          <p style="margin-top: 6px; color: var(--ink-secondary); line-height: 1.5;">
            Operatorlarimiz tez orada ${escapeHtml(o.customerPhone)} raqamiga qo‘ng‘iroq qilib yetkazib berish vaqtini tasdiqlaydi.
          </p>
        </div>

        <div style="border: 1px solid var(--border-light); border-radius: 12px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--ink-muted);">Telegram kanal holati</span>
            <strong style="color: ${o.telegramSent ? 'var(--green-deep)' : '#b45309'};">
              ${o.telegramSent ? 'Kanalga yuborildi' : 'Admin panelda saqlandi'}
            </strong>
          </div>
          ${o.telegramError && !o.telegramSent ? `<p style="margin-top: 8px; font-size: 12px; color: #92400e;">${escapeHtml(o.telegramError)}</p>` : ''}

          <dl class="spec-list" style="margin-top: 12px;">
            <div class="spec-row"><dt>Mijoz</dt><dd>${escapeHtml(o.customerName)}</dd></div>
            <div class="spec-row"><dt>Manzil</dt><dd>${escapeHtml(o.region)}, ${escapeHtml(o.address)}</dd></div>
            <div class="spec-row"><dt>To‘lov turi</dt><dd>${escapeHtml(getPaymentLabel(o.paymentMethod))}</dd></div>
            <div class="spec-row"><dt>Jami summa</dt><dd style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(formatUzs(o.totalUzs))}</dd></div>
          </dl>
        </div>
      </div>
    `;
    footerHtml = `<button type="button" id="drawer-done-btn" class="btn-primary full-width" style="background-color: var(--bg-obsidian);">Do‘konga qaytish</button>`;
  } else if (state.cartItems.length === 0) {
    bodyHtml = `
      <div class="empty-box" style="margin-top: 40px;">
        <h3>Savatingiz hozircha bo‘sh</h3>
        <p>Katalogdan yoqqan smartfonni tanlab savatga qo‘shing.</p>
        <button type="button" id="empty-back-btn" class="btn-primary" style="margin-top: 16px; background-color: var(--bg-obsidian);">Katalogga qaytish</button>
      </div>
    `;
  } else if (state.cartStep === 'cart') {
    bodyHtml = state.cartItems
      .map((item) => {
        const safeImg = isSafeImageUrl(item.image) ? escapeHtml(item.image) : '';
        return `
        <div class="cart-item-row">
          <img class="cart-item-img" src="${safeImg}" alt="${escapeHtml(item.productName)}" referrerpolicy="no-referrer" />
          <div class="cart-item-info">
            <div class="cart-item-top">
              <div>
                <p class="cart-item-name">${escapeHtml(item.productName)}</p>
                <p class="cart-item-sub">${escapeHtml(item.storage)} · ${escapeHtml(item.color)}</p>
              </div>
              <button type="button" class="remove-btn" data-remove-key="${escapeHtml(item.key)}" aria-label="O‘chirish">✕</button>
            </div>
            <div class="cart-item-bottom">
              <div class="qty-stepper">
                <button type="button" data-qty-delta="-1" data-qty-key="${escapeHtml(item.key)}" aria-label="Kamaytirish">-</button>
                <span class="tabular-nums">${item.quantity}</span>
                <button type="button" data-qty-delta="1" data-qty-key="${escapeHtml(item.key)}" aria-label="Ko‘paytirish">+</button>
              </div>
              <strong class="tabular-nums" style="font-family: var(--font-mono); font-size: 13px;">
                ${escapeHtml(formatUzs(item.unitPriceUzs * item.quantity))}
              </strong>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    footerHtml = `
      <div class="summary-row">
        <span style="color: var(--ink-muted);">Jami to‘lov (yetkazish bepul)</span>
        <strong class="tabular-nums" style="font-family: var(--font-mono); font-size: 16px;">${escapeHtml(formatUzs(subtotal))}</strong>
      </div>
      <button type="button" id="go-checkout-btn" class="btn-primary full-width">Buyurtmani rasmiylashtirish</button>
    `;
  } else {
    bodyHtml = `
      <form id="checkout-form" class="form-stack">
        <div id="checkout-error" class="alert-error hidden"></div>

        <div>
          <label class="field-label" for="order-name">Ism va familiyangiz</label>
          <input id="order-name" class="field-input" type="text" required placeholder="Masalan: Azizbek Karimov" />
        </div>

        <div>
          <label class="field-label" for="order-phone">Telefon raqamingiz</label>
          <input id="order-phone" class="field-input" type="tel" required value="+998 " style="font-family: var(--font-mono);" />
        </div>

        <div>
          <label class="field-label" for="order-region">Hudud / Shahar</label>
          <select id="order-region" class="field-select">
            ${REGIONS.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="field-label" for="order-address">Yetkazib berish manzili</label>
          <input id="order-address" class="field-input" type="text" required placeholder="Tuman, ko‘cha, uy va xonadon raqami" />
        </div>

        <div>
          <span class="field-label">To‘lov usuli</span>
          <div class="radio-group">
            <label class="radio-option selected">
              <input type="radio" name="paymentMethod" value="cash" checked />
              <span>Naqd pul (yetkazib berganda)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="paymentMethod" value="card" />
              <span>Click / Payme / Bank kartasi</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="paymentMethod" value="installment" />
              <span>Muddatli to‘lov (12 oygacha)</span>
            </label>
          </div>
        </div>

        <div>
          <label class="field-label" for="order-notes">Qo‘shimcha izoh (ixtiyoriy)</label>
          <textarea id="order-notes" class="field-textarea" placeholder="Yetkazib berish vaqti yoki qo‘shimcha istaklar..."></textarea>
        </div>
      </form>
    `;

    footerHtml = `
      <div class="summary-row">
        <span style="color: var(--ink-muted);">Jami to‘lov</span>
        <strong class="tabular-nums" style="font-family: var(--font-mono); font-size: 16px;">${escapeHtml(formatUzs(subtotal))}</strong>
      </div>
      <button type="submit" form="checkout-form" id="submit-order-btn" class="btn-primary full-width">
        Buyurtmani tasdiqlash
      </button>
    `;
  }

  cartDrawerPanelEl.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-header-left">
        ${state.cartStep === 'checkout' ? '<button type="button" class="icon-btn" id="back-to-cart-btn" aria-label="Savatga qaytish">←</button>' : ''}
        <h2 class="drawer-title">${escapeHtml(titleText)}</h2>
      </div>
      <button type="button" class="icon-btn" id="close-cart-btn" aria-label="Savatni yopish">✕</button>
    </div>
    <div class="drawer-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="drawer-footer">${footerHtml}</div>` : ''}
  `;

  document.getElementById('close-cart-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('empty-back-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('drawer-done-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('back-to-cart-btn')?.addEventListener('click', () => {
    state.cartStep = 'cart';
    renderCartDrawer();
  });
  document.getElementById('go-checkout-btn')?.addEventListener('click', () => {
    state.cartStep = 'checkout';
    renderCartDrawer();
  });

  cartDrawerPanelEl.querySelectorAll('[data-remove-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-remove-key');
      state.cartItems = state.cartItems.filter((i) => i.key !== key);
      updateCartCounter();
      renderCartDrawer();
    });
  });

  cartDrawerPanelEl.querySelectorAll('[data-qty-delta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-qty-key');
      const delta = Number(btn.getAttribute('data-qty-delta'));
      state.cartItems = state.cartItems
        .map((i) =>
          i.key === key ? { ...i, quantity: Math.min(20, Math.max(0, i.quantity + delta)) } : i
        )
        .filter((i) => i.quantity > 0);
      updateCartCounter();
      renderCartDrawer();
    });
  });

  cartDrawerPanelEl.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      cartDrawerPanelEl.querySelectorAll('.radio-option').forEach((lbl) => lbl.classList.remove('selected'));
      radio.closest('.radio-option')?.classList.add('selected');
    });
  });

  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('checkout-error');
    const submitBtn = document.getElementById('submit-order-btn');
    if (errEl) errEl.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Yuborilmoqda...';
    }

    const payload = {
      customerName: document.getElementById('order-name')?.value || '',
      customerPhone: document.getElementById('order-phone')?.value || '',
      region: document.getElementById('order-region')?.value || 'Toshkent shahri',
      address: document.getElementById('order-address')?.value || '',
      paymentMethod:
        cartDrawerPanelEl.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash',
      notes: document.getElementById('order-notes')?.value || '',
      items: state.cartItems.map((i) => ({
        productId: i.productId,
        storage: i.storage,
        color: i.color,
        quantity: i.quantity,
      })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        if (errEl) {
          errEl.textContent = data.error || 'Buyurtma yuborishda xatolik yuz berdi.';
          errEl.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Buyurtmani tasdiqlash';
        }
        return;
      }

      state.confirmedOrder = data.order;
      state.cartItems = [];
      state.cartStep = 'receipt';
      updateCartCounter();
      renderCartDrawer();
      fetchProducts();
    } catch {
      if (errEl) {
        errEl.textContent = "Server bilan bog'lanib bo'lmadi. Qaytadan urinib ko'ring.";
        errEl.classList.remove('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Buyurtmani tasdiqlash';
      }
    }
  });
}

// Admin Panel Logic
async function loadAdminGate() {
  if (!adminViewEl) return;
  if (!state.adminToken) {
    adminViewEl.innerHTML = `<div class="container"><div class="auth-card"><p>Tekshirilmoqda...</p></div></div>`;
    try {
      const res = await fetch('/api/admin/auth-status');
      state.authStatus = await res.json();
    } catch {
      state.authStatus = { requiresSetup: false };
    }
    renderAdminView();
  } else {
    await Promise.all([fetchAdminOrders(), fetchAdminTelegram()]);
    renderAdminView();
  }
}

async function fetchAdminOrders() {
  if (!state.adminToken) return;
  const res = await fetch('/api/admin/orders', {
    headers: { Authorization: `Bearer ${state.adminToken}` },
  });
  if (res.status === 401) {
    state.adminToken = null;
    renderAdminView();
    return;
  }
  const data = await res.json();
  state.orders = data.orders || [];
  if (data.stats) state.stats = data.stats;
}

async function fetchAdminTelegram() {
  if (!state.adminToken) return;
  const res = await fetch('/api/admin/telegram', {
    headers: { Authorization: `Bearer ${state.adminToken}` },
  });
  if (res.ok) {
    state.tgConfig = await res.json();
  }
}

function renderAdminView() {
  if (!adminViewEl) return;

  if (!state.adminToken) {
    const isSetup = Boolean(state.authStatus?.requiresSetup);
    adminViewEl.innerHTML = `
      <div class="container">
        <div class="auth-card">
          <p class="section-kicker">Boshqaruv tizimi</p>
          <h1 style="margin-top: 6px; font-size: 22px; font-weight: 700;">
            ${isSetup ? 'Admin parolini o‘rnatish' : 'Admin Panelga kirish'}
          </h1>
          <p style="margin-top: 8px; font-size: 13px; line-height: 1.5; color: var(--ink-secondary);">
            ${
              isSetup
                ? 'Birinchi ishga tushirish uchun administrator parolini yarating (kamida 6 ta belgi).'
                : 'Buyurtmalar, smartfon katalogi va Telegram botini boshqarish uchun parolni kiriting.'
            }
          </p>

          <form id="admin-auth-form" class="form-stack" style="margin-top: 20px;">
            <div id="admin-auth-err" class="alert-error hidden"></div>
            <div>
              <label class="field-label" for="admin-pass-input">${isSetup ? 'Yangi admin paroli' : 'Admin paroli'}</label>
              <input id="admin-pass-input" class="field-input" type="password" required ${isSetup ? 'minlength="6"' : ''} placeholder="Parolni kiriting" />
            </div>
            ${
              isSetup
                ? `<div>
                    <label class="field-label" for="admin-pass-confirm">Parolni tasdiqlang</label>
                    <input id="admin-pass-confirm" class="field-input" type="password" required minlength="6" placeholder="Parolni qayta kiriting" />
                  </div>`
                : ''
            }
            <button type="submit" class="btn-primary full-width" style="background-color: ${isSetup ? 'var(--green-brand)' : 'var(--bg-obsidian)'};">
              ${isSetup ? 'Parolni saqlash va kirish' : 'Kirish'}
            </button>
          </form>

          <button type="button" id="admin-back-store" style="margin-top: 16px; width: 100%; border: none; background: none; font-size: 12px; color: var(--ink-muted);">
            Do‘konga qaytish
          </button>
        </div>
      </div>
    `;

    document.getElementById('admin-back-store')?.addEventListener('click', () => navigateView('store', 'katalog'));
    document.getElementById('admin-auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('admin-auth-err');
      const pass = document.getElementById('admin-pass-input')?.value || '';
      const confirm = document.getElementById('admin-pass-confirm')?.value || '';

      if (isSetup && pass !== confirm) {
        if (errEl) {
          errEl.textContent = 'Parollar bir-biriga mos kelmadi.';
          errEl.classList.remove('hidden');
        }
        return;
      }

      const endpoint = isSetup ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: pass }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        if (errEl) {
          errEl.textContent = data.error || 'Kirishda xatolik yuz berdi.';
          errEl.classList.remove('hidden');
        }
        return;
      }

      state.adminToken = data.token;
      await Promise.all([fetchAdminOrders(), fetchAdminTelegram()]);
      renderAdminView();
    });
    return;
  }

  const filteredOrders =
    state.statusFilter === 'all'
      ? state.orders
      : state.orders.filter((o) => o.status === state.statusFilter);

  let tabContentHtml = '';

  if (state.adminTab === 'orders') {
    const filterButtons = [
      ['all', 'Barchasi'],
      ['new', 'Yangi'],
      ['confirmed', 'Tasdiqlandi'],
      ['shipping', "Yo'lda"],
      ['delivered', 'Yetkazildi'],
      ['cancelled', 'Bekor qilindi'],
    ]
      .map(
        ([st, lbl]) =>
          `<button type="button" class="brand-tab ${state.statusFilter === st ? 'active' : ''}" data-order-filter="${st}">${lbl}</button>`
      )
      .join('');

    const ordersHtml =
      filteredOrders.length === 0
        ? `<div class="empty-box" style="margin: 0; border: none;"><h3>Hozircha buyurtmalar yo‘q</h3><p>Do‘kondan birinchi buyurtma berilganda u shu yerda ko‘rinadi.</p></div>`
        : filteredOrders
            .map(
              (o) => `
          <div class="order-row">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="product-meta">
                <strong style="font-family: var(--font-mono); color: var(--ink-primary);">#${escapeHtml(o.orderNumber)}</strong>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums">${escapeHtml(formatDateTimeUz(o.createdAt))}</span>
                <span aria-hidden="true">·</span>
                <strong style="color: ${o.telegramSent ? 'var(--green-deep)' : '#b45309'};">
                  ${o.telegramSent ? 'Telegramga yuborilgan' : 'Telegramga yuborilmagan'}
                </strong>
              </div>
              <p style="font-size: 14px; font-weight: 700;">
                ${escapeHtml(o.customerName)} <span style="font-family: var(--font-mono); font-weight: 400; color: var(--ink-secondary);">(${escapeHtml(o.customerPhone)})</span>
              </p>
              <p style="font-size: 12px; color: var(--ink-muted);">
                ${escapeHtml(o.region)}, ${escapeHtml(o.address)} · ${escapeHtml(getPaymentLabel(o.paymentMethod))}
              </p>
              <p style="font-size: 12px; color: var(--ink-primary);">
                ${o.items
                  .map((it) => `${escapeHtml(it.productName)} (${escapeHtml(it.storage)}, ${escapeHtml(it.color)}) × ${it.quantity}`)
                  .join(' · ')}
              </p>
            </div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
              <strong class="tabular-nums" style="font-family: var(--font-mono); font-size: 14px;">${escapeHtml(formatUzs(o.totalUzs))}</strong>
              <select class="btn-secondary-sm" data-status-order="${escapeHtml(o.id)}">
                ${['new', 'confirmed', 'shipping', 'delivered', 'cancelled']
                  .map(
                    (st) =>
                      `<option value="${st}" ${o.status === st ? 'selected' : ''}>${escapeHtml(getStatusLabel(st))}</option>`
                  )
                  .join('')}
              </select>
              <button type="button" class="btn-secondary-sm" data-resend-tg="${escapeHtml(o.id)}">
                Telegramga yuborish
              </button>
            </div>
          </div>
        `
            )
            .join('');

    tabContentHtml = `
      <div class="admin-panel-box">
        <div style="padding: 14px 20px; border-bottom: 1px solid #eff3f0;">
          <div class="brand-tabs">${filterButtons}</div>
        </div>
        ${ordersHtml}
      </div>
    `;
  } else if (state.adminTab === 'products') {
    const addFormHtml = state.showAddProduct
      ? `
        <form id="add-product-form" class="admin-panel-box" style="padding: 24px;">
          <h3 style="font-size: 16px; font-weight: 700;">Yangi smartfon qo‘shish</h3>
          <div class="form-grid-3">
            <div>
              <label class="field-label">Model nomi</label>
              <input id="np-name" class="field-input" type="text" required placeholder="iPhone 16 Plus" />
            </div>
            <div>
              <label class="field-label">Brend</label>
              <select id="np-brand" class="field-select">
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Xiaomi">Xiaomi</option>
                <option value="Google">Google</option>
              </select>
            </div>
            <div>
              <label class="field-label">Toifa</label>
              <select id="np-category" class="field-select">
                <option value="Flagman">Flagman</option>
                <option value="Kamera">Kamera</option>
                <option value="Buklanuvchi">Buklanuvchi</option>
                <option value="Kompakt">Kompakt</option>
              </select>
            </div>
            <div>
              <label class="field-label">Boshlang‘ich narx (so‘m)</label>
              <input id="np-price" class="field-input" type="number" required min="100000" step="10000" value="14500000" />
            </div>
            <div>
              <label class="field-label">Ombordagi soni</label>
              <input id="np-stock" class="field-input" type="number" required min="0" value="10" />
            </div>
            <div>
              <label class="field-label">Rasm shabloni</label>
              <select id="np-image" class="field-select">
                ${STUDIO_IMAGES.map((img) => `<option value="${escapeHtml(img.url)}">${escapeHtml(img.label)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="field-label">Ekran</label>
              <input id="np-display" class="field-input" type="text" value='6.7" LTPO OLED, 120 Hz' />
            </div>
            <div>
              <label class="field-label">Protsessor</label>
              <input id="np-chip" class="field-input" type="text" value="Flagship 3nm Pro" />
            </div>
            <div>
              <label class="field-label">Kamera</label>
              <input id="np-camera" class="field-input" type="text" value="50 MP Triple Pro" />
            </div>
          </div>
          <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button type="submit" class="btn-primary">Katalogga saqlash</button>
          </div>
        </form>
      `
      : '';

    const productRows = state.products
      .map((p) => {
        const safeImg = isSafeImageUrl(p.image) ? escapeHtml(p.image) : '';
        return `
          <div class="order-row">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${safeImg}" alt="${escapeHtml(p.name)}" style="width: 76px; height: 60px; border-radius: 8px; object-fit: cover; background: #f4f7f5;" />
              <div>
                <p style="font-size: 12px; color: var(--ink-muted);">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</p>
                <h3 style="font-size: 15px; font-weight: 700;">${escapeHtml(p.name)}</h3>
                <p class="tabular-nums" style="font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--green-deep);">
                  ${escapeHtml(formatUzs(p.basePriceUzs))} · ${escapeHtml(p.stockCount)} dona
                </p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn-secondary-sm" data-toggle-stock="${escapeHtml(p.id)}" style="${p.inStock ? 'border-color: var(--green-brand); background: var(--green-tint); color: var(--green-deep);' : ''}">
                ${p.inStock ? 'Sotuvda bor' : 'Sotuvda yo‘q'}
              </button>
              <button type="button" class="btn-secondary-sm" data-delete-product="${escapeHtml(p.id)}" style="color: var(--danger);">
                O‘chirish
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    tabContentHtml = `
      <div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between;">
        <h2 style="font-size: 18px; font-weight: 700;">Katalogdagi smartfonlar</h2>
        <button type="button" id="toggle-add-prod-btn" class="btn-primary" style="min-height: 40px; padding: 8px 16px; font-size: 12px;">
          ${state.showAddProduct ? 'Yopish' : "+ Yangi smartfon qo'shish"}
        </button>
      </div>
      ${addFormHtml}
      <div class="admin-panel-box">${productRows}</div>
    `;
  } else {
    const tg = state.tgConfig || {};
    tabContentHtml = `
      <div class="tg-grid">
        <div class="admin-panel-box" style="margin-top: 0; padding: 24px;">
          <h2 style="font-size: 18px; font-weight: 700;">Telegram kanal ulanishi</h2>
          <p style="margin-top: 6px; font-size: 12px; line-height: 1.5; color: var(--ink-muted);">
            Har bir yangi buyurtma real vaqt rejimida belgilangan Telegram kanalga avtomatik tarzda yuboriladi.
          </p>
          <dl class="spec-list" style="margin-top: 16px;">
            <div class="spec-row"><dt>Ulanish holati</dt><dd style="color: var(--green-deep); font-weight: 600;">${tg.configured ? 'Faol (Sozlangan)' : 'Sozlanmagan'}</dd></div>
            <div class="spec-row"><dt>Bot tokeni</dt><dd style="font-family: var(--font-mono);">${escapeHtml(tg.maskedToken || 'Kiritilmagan')}</dd></div>
            <div class="spec-row"><dt>Kanal ID</dt><dd style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(tg.chatId || 'Kiritilmagan')}</dd></div>
          </dl>
          <div style="margin-top: 20px;">
            <button type="button" id="test-tg-btn" class="btn-primary" style="min-height: 42px; font-size: 13px;">
              Kanalga test xabar yuborish
            </button>
          </div>
          ${
            state.tgFeedback
              ? `<div class="${state.tgFeedback.ok ? 'alert-success' : 'alert-error'}" style="margin-top: 14px;">${escapeHtml(state.tgFeedback.text)}</div>`
              : ''
          }
        </div>

        <form id="tg-settings-form" class="admin-panel-box" style="margin-top: 0; padding: 24px;">
          <h3 style="font-size: 16px; font-weight: 700;">Bot va kanalni operativ almashtirish</h3>
          <p style="margin-top: 6px; font-size: 12px; color: var(--ink-muted);">
            Yangi bot tokeni yoki kanal ID kiritish uchun quyidagi maydonlarni to‘ldiring.
          </p>
          <div class="form-stack" style="margin-top: 16px;">
            <div>
              <label class="field-label" for="tg-token-input">Yangi Bot Token (ixtiyoriy)</label>
              <input id="tg-token-input" class="field-input" type="password" placeholder="O‘zgartirmaslik uchun bo‘sh qoldiring" style="font-family: var(--font-mono); font-size: 12px;" />
            </div>
            <div>
              <label class="field-label" for="tg-chat-input">Kanal ID</label>
              <input id="tg-chat-input" class="field-input" type="text" value="${escapeHtml(tg.chatId || '')}" placeholder="-1003957660682" style="font-family: var(--font-mono); font-size: 12px;" />
            </div>
            <div>
              <button type="submit" class="btn-primary" style="background-color: var(--bg-obsidian);">Sozlamalarni yangilash</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  adminViewEl.innerHTML = `
    <div class="container">
      <div class="admin-header">
        <div>
          <p class="section-kicker">VERDE MOBILE Boshqaruv</p>
          <h1 style="margin-top: 4px; font-size: 26px; font-weight: 700;">Admin Panel</h1>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" id="admin-refresh-btn" class="btn-secondary-sm">Yangilash</button>
          <button type="button" id="admin-logout-btn" class="btn-secondary-sm" style="background-color: var(--bg-obsidian); color: #fff; border-color: var(--bg-obsidian);">Chiqish</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><p class="kpi-label">Jami buyurtmalar</p><p class="kpi-value tabular-nums">${state.stats.totalOrders}</p></div>
        <div class="kpi-card"><p class="kpi-label">Yangi buyurtmalar</p><p class="kpi-value tabular-nums" style="color: var(--green-brand);">${state.stats.newOrders}</p></div>
        <div class="kpi-card"><p class="kpi-label">Yetkazib berildi</p><p class="kpi-value tabular-nums">${state.stats.deliveredOrders}</p></div>
        <div class="kpi-card dark"><p class="kpi-label">Umumiy tushum</p><p class="kpi-value tabular-nums" style="color: var(--green-bright);">${escapeHtml(formatUzs(state.stats.totalRevenueUzs))}</p></div>
      </div>

      <div class="admin-tabs-bar">
        <div class="admin-tabs">
          <button type="button" class="admin-tab ${state.adminTab === 'orders' ? 'active' : ''}" data-admin-tab="orders">Buyurtmalar (${state.orders.length})</button>
          <button type="button" class="admin-tab ${state.adminTab === 'products' ? 'active' : ''}" data-admin-tab="products">Mahsulotlar (${state.products.length})</button>
          <button type="button" class="admin-tab ${state.adminTab === 'telegram' ? 'active' : ''}" data-admin-tab="telegram">Telegram sozlamalari</button>
        </div>
        ${state.adminMessage ? `<p style="font-size: 12px; font-weight: 600; color: var(--green-deep);">${escapeHtml(state.adminMessage)}</p>` : ''}
      </div>

      ${tabContentHtml}
    </div>
  `;

  document.getElementById('admin-refresh-btn')?.addEventListener('click', async () => {
    await Promise.all([fetchAdminOrders(), fetchProducts()]);
    renderAdminView();
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    state.adminToken = null;
    renderAdminView();
  });

  adminViewEl.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.adminTab = btn.getAttribute('data-admin-tab') || 'orders';
      state.adminMessage = null;
      renderAdminView();
    });
  });

  adminViewEl.querySelectorAll('[data-order-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.statusFilter = btn.getAttribute('data-order-filter') || 'all';
      renderAdminView();
    });
  });

  adminViewEl.querySelectorAll('[data-status-order]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const orderId = sel.getAttribute('data-status-order');
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.adminToken}`,
        },
        body: JSON.stringify({ status: sel.value, notifyTelegram: true }),
      });
      if (res.ok) {
        state.adminMessage = `Buyurtma holati "${getStatusLabel(sel.value)}" ga o'zgartirildi.`;
        await fetchAdminOrders();
        renderAdminView();
      }
    });
  });

  adminViewEl.querySelectorAll('[data-resend-tg]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.getAttribute('data-resend-tg');
      const res = await fetch(`/api/admin/orders/${orderId}/resend-telegram`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.adminToken}` },
      });
      const data = await res.json();
      state.adminMessage = data.telegramOk
        ? 'Buyurtma Telegram kanalga qayta yuborildi.'
        : data.error || 'Telegramga yuborishda xatolik.';
      await fetchAdminOrders();
      renderAdminView();
    });
  });

  document.getElementById('toggle-add-prod-btn')?.addEventListener('click', () => {
    state.showAddProduct = !state.showAddProduct;
    renderAdminView();
  });

  document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: JSON.stringify({
        name: document.getElementById('np-name')?.value || '',
        brand: document.getElementById('np-brand')?.value || 'Apple',
        category: document.getElementById('np-category')?.value || 'Flagman',
        basePriceUzs: Number(document.getElementById('np-price')?.value || 0),
        stockCount: Number(document.getElementById('np-stock')?.value || 0),
        image: document.getElementById('np-image')?.value || STUDIO_IMAGES[0].url,
        featured: true,
        specs: {
          display: document.getElementById('np-display')?.value || '',
          chip: document.getElementById('np-chip')?.value || '',
          camera: document.getElementById('np-camera')?.value || '',
          battery: '5000 mAh',
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.product) {
      state.adminMessage = `"${data.product.name}" katalogga qo'shildi.`;
      state.showAddProduct = false;
      await fetchProducts();
      renderAdminView();
    } else {
      state.adminMessage = data.error || "Mahsulot qo'shishda xato.";
      renderAdminView();
    }
  });

  adminViewEl.querySelectorAll('[data-toggle-stock]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-toggle-stock');
      const prod = state.products.find((p) => p.id === id);
      if (!prod) return;
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.adminToken}`,
        },
        body: JSON.stringify({
          inStock: !prod.inStock,
          stockCount: !prod.inStock && prod.stockCount === 0 ? 5 : prod.stockCount,
        }),
      });
      if (res.ok) {
        await fetchProducts();
        renderAdminView();
      }
    });
  });

  adminViewEl.querySelectorAll('[data-delete-product]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-product');
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.adminToken}` },
      });
      if (res.ok) {
        state.adminMessage = "Mahsulot katalogdan o'chirildi.";
        await fetchProducts();
        renderAdminView();
      }
    });
  });

  document.getElementById('test-tg-btn')?.addEventListener('click', async () => {
    const res = await fetch('/api/admin/telegram/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    const data = await res.json();
    state.tgFeedback = data.ok
      ? {
          ok: true,
          text: `Test xabar @${data.botUsername || 'bot'} orqali kanalga yuborildi (ID: ${data.messageId}).`,
        }
      : { ok: false, text: data.error || 'Telegram kanalga xabar yuborib bo‘lmadi.' };
    renderAdminView();
  });

  document.getElementById('tg-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/telegram', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: JSON.stringify({
        botToken: document.getElementById('tg-token-input')?.value?.trim() || undefined,
        chatId: document.getElementById('tg-chat-input')?.value?.trim() || undefined,
      }),
    });
    if (res.ok) {
      state.tgConfig = await res.json();
      state.tgFeedback = { ok: true, text: 'Telegram sozlamalari yangilandi.' };
    } else {
      state.tgFeedback = { ok: false, text: 'Sozlamalarni saqlashda xato.' };
    }
    renderAdminView();
  });
}

// Wire Global Interactive Navigation & Event Listeners
document.querySelectorAll('[data-nav]').forEach((el) => {
  el.addEventListener('click', () => {
    const view = el.getAttribute('data-nav') || 'store';
    const section = el.getAttribute('data-section') || undefined;
    navigateView(view, section);
  });
});

mobileMenuToggleEl?.addEventListener('click', () => {
  const isHidden = mobileNavDrawerEl?.classList.contains('hidden');
  mobileNavDrawerEl?.classList.toggle('hidden');
  mobileMenuToggleEl.setAttribute('aria-expanded', String(isHidden));
});

document.getElementById('open-cart-btn')?.addEventListener('click', openCartDrawer);

productModalEl?.addEventListener('click', (e) => {
  if (e.target === productModalEl) closeProductModal();
});

cartDrawerEl?.addEventListener('click', (e) => {
  if (e.target === cartDrawerEl) closeCartDrawer();
});

brandTabsEl?.querySelectorAll('.brand-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.selectedBrand = btn.getAttribute('data-brand') || 'Barchasi';
    brandTabsEl.querySelectorAll('.brand-tab').forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    renderCatalog();
  });
});

searchInputEl?.addEventListener('input', (e) => {
  state.searchQuery = e.target.value || '';
  renderCatalog();
});

sortSelectEl?.addEventListener('change', (e) => {
  state.sortBy = e.target.value || 'featured';
  renderCatalog();
});

// Initialize
updateCartCounter();
fetchProducts();
