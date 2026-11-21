import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
} from './src/types';

interface StoreData {
  products: Product[];
  orders: Order[];
  nextOrderSeq: number;
  adminCredentialHash?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

// Session signing key in memory (never exposed or written to disk)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Runtime Telegram config overrides (kept strictly in server memory)
const runtimeTelegram: { botToken?: string; chatId?: string } = {};

function getTelegramCredentials(): {
  botToken: string;
  chatId: string;
  source: 'env' | 'runtime' | 'none';
} {
  const token = (runtimeTelegram.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatId = (runtimeTelegram.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '').trim();
  const source: 'env' | 'runtime' | 'none' =
    runtimeTelegram.botToken || runtimeTelegram.chatId
      ? 'runtime'
      : token && chatId
        ? 'env'
        : 'none';
  return { botToken: token, chatId, source };
}

function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 10) return '••••••••';
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

const SEED_PRODUCTS: Product[] = [
  {
    id: 'vm-iphone-16-pro',
    name: 'iPhone 16 Pro Titanium',
    brand: 'Apple',
    category: 'Flagman',
    basePriceUzs: 15890000,
    oldPriceUzs: 16990000,
    storageOptions: ['128 GB', '256 GB', '512 GB', '1 TB'],
    storagePriceOffsets: {
      '128 GB': 0,
      '256 GB': 1400000,
      '512 GB': 3200000,
      '1 TB': 5400000,
    },
    colors: ['Qora Titanium', 'Oq Titanium', 'Tabiiy Titanium'],
    image: '/src/assets/images/phone_iphone_pro_black_1795237737799.jpg',
    inStock: true,
    stockCount: 14,
    featured: true,
    tag: 'Eng ommabop',
    description:
      'Grade 5 titan korpus, 120 Hz Super Retina XDR displey va 4K 120fps Dolby Vision video imkoniyatiga ega flagman smartfon.',
    specs: {
      display: '6.3" LTPO Super Retina XDR OLED, 120 Hz',
      chip: 'Apple A18 Pro (3 nm)',
      camera: '48 MP + 48 MP + 12 MP (5× optik zum)',
      battery: '3582 mAh, MagSafe 25W',
    },
  },
  {
    id: 'vm-galaxy-s25-ultra',
    name: 'Galaxy S25 Ultra Emerald Edition',
    brand: 'Samsung',
    category: 'Flagman',
    basePriceUzs: 14950000,
    oldPriceUzs: 15800000,
    storageOptions: ['256 GB', '512 GB', '1 TB'],
    storagePriceOffsets: {
      '256 GB': 0,
      '512 GB': 1600000,
      '1 TB': 3800000,
    },
    colors: ['Yashil Emerald', 'Qora Obsidian', 'Oq Pearl'],
    image: '/src/assets/images/phone_ultra_emerald_stylus_1795237738603.jpg',
    inStock: true,
    stockCount: 11,
    featured: true,
    tag: 'S-Pen bilan',
    description:
      'O‘rnatilgan S-Pen, 200 MP asosiy kamera va aks ettirishga qarshi Gorilla Armor 2 oynali professional smartfon.',
    specs: {
      display: '6.9" Dynamic AMOLED 2X, 120 Hz, 2600 nit',
      chip: 'Snapdragon 8 Elite for Galaxy',
      camera: '200 MP + 50 MP + 50 MP + 10 MP',
      battery: '5000 mAh, 45W tezkor quvvatlash',
    },
  },
  {
    id: 'vm-pixel-9-pro',
    name: 'Google Pixel 9 Pro Sage',
    brand: 'Google',
    category: 'Kompakt',
    basePriceUzs: 12490000,
    storageOptions: ['128 GB', '256 GB', '512 GB'],
    storagePriceOffsets: {
      '128 GB': 0,
      '256 GB': 1100000,
      '512 GB': 2500000,
    },
    colors: ['Yashil Sage', 'Qora Obsidian', 'Oq Porcelain'],
    image: '/src/assets/images/phone_pixel_green_visor_1795237738104.jpg',
    inStock: true,
    stockCount: 8,
    featured: true,
    tag: 'Toza Android',
    description:
      'Matte yashil shisha korpus, Super Actua LTPO ekran va tabiiy ranglarni aniq uzatuvchi triple-kamera tizimi.',
    specs: {
      display: '6.3" LTPO OLED Super Actua, 120 Hz',
      chip: 'Google Tensor G4 + Titan M2',
      camera: '50 MP + 48 MP + 48 MP (5× telefoto)',
      battery: '4700 mAh, 7 yil OS yangilanish',
    },
  },
  {
    id: 'vm-xiaomi-15-ultra',
    name: 'Xiaomi 15 Ultra Optics',
    brand: 'Xiaomi',
    category: 'Kamera',
    basePriceUzs: 13200000,
    oldPriceUzs: 14100000,
    storageOptions: ['256 GB', '512 GB', '1 TB'],
    storagePriceOffsets: {
      '256 GB': 0,
      '512 GB': 1300000,
      '1 TB': 2900000,
    },
    colors: ['Qora Eko-charm', 'Oq Ceramic'],
    image: '/src/assets/images/phone_camera_flagship_black_1795237738256.jpg',
    inStock: true,
    stockCount: 9,
    featured: true,
    tag: '1-dyuymli sensor',
    description:
      'Katta 1 dyuymli asosiy kamera sensori, 200 MP periskop linza va 90W tezkor quvvatlash texnologiyasi.',
    specs: {
      display: '6.73" AMOLED WQHD+, 120 Hz, 3200 nit',
      chip: 'Snapdragon 8 Elite (3 nm)',
      camera: '50 MP 1" + 200 MP periskop + 50 MP',
      battery: '5410 mAh, 90W simli / 80W simsiz',
    },
  },
  {
    id: 'vm-galaxy-z-fold-6',
    name: 'Galaxy Z Fold 6 Forest',
    brand: 'Samsung',
    category: 'Buklanuvchi',
    basePriceUzs: 19450000,
    oldPriceUzs: 20500000,
    storageOptions: ['256 GB', '512 GB', '1 TB'],
    storagePriceOffsets: {
      '256 GB': 0,
      '512 GB': 1700000,
      '1 TB': 3600000,
    },
    colors: ['Yashil Forest', 'Qora Crafted'],
    image: '/src/assets/images/phone_foldable_obsidian_1795237737969.jpg',
    inStock: true,
    stockCount: 5,
    featured: true,
    tag: 'Buklanuvchi',
    description:
      '7.6 dyuymli ichki planshet ekrani, mustahkamlangan Armor Aluminum sharnir va ko‘p vazifali ish unumdorligi.',
    specs: {
      display: '7.6" Foldable AMOLED + 6.3" tashqi ekran',
      chip: 'Snapdragon 8 Gen 3 for Galaxy',
      camera: '50 MP + 12 MP + 10 MP (3× zum)',
      battery: '4400 mAh, IP48 himoya',
    },
  },
  {
    id: 'vm-iphone-16-emerald',
    name: 'iPhone 16 Pro Max Emerald',
    brand: 'Apple',
    category: 'Flagman',
    basePriceUzs: 18290000,
    storageOptions: ['256 GB', '512 GB', '1 TB'],
    storagePriceOffsets: {
      '256 GB': 0,
      '512 GB': 2100000,
      '1 TB': 4300000,
    },
    colors: ['Yashil Emerald', 'Qora Titanium', 'Oq Titanium'],
    image: '/src/assets/images/hero_flagship_emerald_1795237738186.jpg',
    inStock: true,
    stockCount: 7,
    featured: true,
    tag: 'Maxsus kolleksiya',
    description:
      '6.9 dyuymli ulkan ekran, rekord darajadagi batareya avtonomiyasi va maxsus emerald rang uyg‘unligi.',
    specs: {
      display: '6.9" Super Retina XDR OLED, 120 Hz',
      chip: 'Apple A18 Pro (6-yadro GPU)',
      camera: '48 MP Fusion + 48 MP Ultra Wide + 5×',
      battery: '4685 mAh, 33 soatgacha video',
    },
  },
];

function ensureStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreData = {
      products: SEED_PRODUCTS,
      orders: [],
      nextOrderSeq: 1001,
    };
    writeStore(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
      throw new Error('Invalid store format');
    }
    return parsed;
  } catch {
    const fallback: StoreData = {
      products: SEED_PRODUCTS,
      orders: [],
      nextOrderSeq: 1001,
    };
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(store: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

// Scrypt password hashing helpers
function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(passcode, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function timingSafeCompareText(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Signed HMAC Bearer token helpers
function createAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      iat: Date.now(),
      exp: Date.now() + 12 * 60 * 60 * 1000,
    }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeCompareText(sig, expectedSig)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin avtorizatsiyasi talab qilinadi.' });
    return;
  }
  const token = auth.slice(7).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Sessiya muddati tugagan yoki token noto‘g‘ri.' });
    return;
  }
  next();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPriceUzs(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

function paymentLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'Naqd pul (yetkazib berganda)';
    case 'card':
      return 'Click / Payme / Karta';
    case 'installment':
      return 'Muddatli to‘lov (Nasiya)';
  }
}

function statusLabelUz(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'Yangi buyurtma';
    case 'confirmed':
      return 'Tasdiqlandi';
    case 'shipping':
      return 'Yo‘lga chiqdi';
    case 'delivered':
      return 'Yetkazib berildi';
    case 'cancelled':
      return 'Bekor qilindi';
  }
}

async function sendTelegramMessage(
  htmlText: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { botToken, chatId } = getTelegramCredentials();
  if (!botToken || !chatId) {
    return {
      ok: false,
      error: 'Telegram bot tokeni yoki kanal ID sozlanmagan.',
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `Telegram API xatosi (${response.status})`,
      };
    }

    return {
      ok: true,
      messageId: data.result?.message_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Telegram serveriga ulanishda xato.',
    };
  }
}

function buildOrderTelegramHtml(order: Order, isStatusUpdate = false): string {
  const header = isStatusUpdate
    ? `<b>BUYURTMA HOLATI YANGILANDI · #${escapeHtml(order.orderNumber)}</b>`
    : `<b>YANGI BUYURTMA · #${escapeHtml(order.orderNumber)}</b>`;

  const lines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. <b>${escapeHtml(item.productName)}</b> (${escapeHtml(item.storage)} · ${escapeHtml(item.color)}) × ${item.quantity} — <code>${escapeHtml(formatPriceUzs(item.lineTotalUzs))}</code>`
    )
    .join('\n');

  const noteLine = order.notes ? `\n<b>Izoh:</b> ${escapeHtml(order.notes)}` : '';

  return [
    header,
    '',
    `<b>Mijoz:</b> ${escapeHtml(order.customerName)}`,
    `<b>Telefon:</b> ${escapeHtml(order.customerPhone)}`,
    `<b>Hudud:</b> ${escapeHtml(order.region)}`,
    `<b>Manzil:</b> ${escapeHtml(order.address)}`,
    `<b>To'lov:</b> ${escapeHtml(paymentLabel(order.paymentMethod))}${noteLine}`,
    '',
    `<b>Mahsulotlar:</b>`,
    lines,
    '',
    `<b>Jami summa:</b> <code>${escapeHtml(formatPriceUzs(order.totalUzs))}</code>`,
    `<b>Holat:</b> ${escapeHtml(statusLabelUz(order.status))}`,
  ].join('\n');
}

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function startServer() {
  ensureStore();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public product catalog
  app.get('/api/products', (req, res) => {
    const store = ensureStore();
    const brand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    let items = store.products;
    if (brand && brand !== 'Barchasi') {
      items = items.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }
    if (category && category !== 'Barchasi') {
      items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (q) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    res.json({ products: items });
  });

  // Public order creation + real-time Telegram dispatch
  app.post('/api/orders', async (req, res) => {
    const body = req.body as {
      customerName?: unknown;
      customerPhone?: unknown;
      region?: unknown;
      address?: unknown;
      paymentMethod?: unknown;
      notes?: unknown;
      items?: unknown;
    };

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const region = typeof body.region === 'string' ? body.region.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : undefined;
    const paymentMethod = body.paymentMethod as PaymentMethod;

    if (customerName.length < 2 || customerName.length > 80) {
      res.status(400).json({ error: 'Iltimos, ismingizni to‘liq kiriting (kamida 2 ta belgi).' });
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      res.status(400).json({ error: 'Telefon raqamini to‘g‘ri formatda kiriting.' });
      return;
    }

    if (!region || region.length > 60) {
      res.status(400).json({ error: 'Yetkazib berish hududini tanlang.' });
      return;
    }

    if (address.length < 4 || address.length > 200) {
      res.status(400).json({ error: 'Aniq manzilni kiriting.' });
      return;
    }

    if (!['cash', 'card', 'installment'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Noto‘g‘ri to‘lov turi tanlandi.' });
      return;
    }

    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      res.status(400).json({ error: 'Buyurtma savati bo‘sh bo‘lmasligi kerak.' });
      return;
    }

    const store = ensureStore();
    const verifiedItems: OrderItem[] = [];
    let totalUzs = 0;

    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem !== 'object') {
        res.status(400).json({ error: 'Buyurtma mahsulotlari formati noto‘g‘ri.' });
        return;
      }
      const itemObj = rawItem as {
        productId?: unknown;
        storage?: unknown;
        color?: unknown;
        quantity?: unknown;
      };
      const productId = typeof itemObj.productId === 'string' ? itemObj.productId : '';
      const quantity =
        typeof itemObj.quantity === 'number' && Number.isInteger(itemObj.quantity)
          ? itemObj.quantity
          : 0;

      if (quantity < 1 || quantity > 20) {
        res.status(400).json({ error: 'Mahsulot soni 1 dan 20 gacha bo‘lishi kerak.' });
        return;
      }

      const product = store.products.find((p) => p.id === productId);
      if (!product) {
        res.status(404).json({ error: 'Tanlangan smartfon topilmadi.' });
        return;
      }
      if (!product.inStock || product.stockCount <= 0) {
        res.status(409).json({ error: `${product.name} hozirda sotuvda mavjud emas.` });
        return;
      }

      const requestedStorage = typeof itemObj.storage === 'string' ? itemObj.storage : '';
      const storage = product.storageOptions.includes(requestedStorage)
        ? requestedStorage
        : product.storageOptions[0] || '256 GB';

      const requestedColor = typeof itemObj.color === 'string' ? itemObj.color : '';
      const color = product.colors.includes(requestedColor)
        ? requestedColor
        : product.colors[0] || 'Qora';

      const offset = product.storagePriceOffsets[storage] ?? 0;
      const unitPriceUzs = product.basePriceUzs + offset;
      const lineTotalUzs = unitPriceUzs * quantity;

      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        storage,
        color,
        quantity,
        unitPriceUzs,
        lineTotalUzs,
      });
      totalUzs += lineTotalUzs;
    }

    const now = new Date().toISOString();
    const orderNumber = `VM-${store.nextOrderSeq}`;
    store.nextOrderSeq += 1;

    const newOrder: Order = {
      id: crypto.randomUUID(),
      orderNumber,
      customerName,
      customerPhone,
      region,
      address,
      paymentMethod,
      notes,
      items: verifiedItems,
      totalUzs,
      status: 'new',
      telegramSent: false,
      createdAt: now,
      updatedAt: now,
    };

    // Real-time Telegram dispatch
    const tgResult = await sendTelegramMessage(buildOrderTelegramHtml(newOrder, false));
    newOrder.telegramSent = tgResult.ok;
    if (tgResult.messageId) newOrder.telegramMessageId = tgResult.messageId;
    if (!tgResult.ok && tgResult.error) newOrder.telegramError = tgResult.error;

    // Decrement stock counts safely
    for (const item of verifiedItems) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockCount = Math.max(0, prod.stockCount - item.quantity);
        if (prod.stockCount === 0) {
          prod.inStock = false;
        }
      }
    }

    store.orders.unshift(newOrder);
    writeStore(store);

    res.status(201).json({ order: newOrder });
  });

  // Admin auth status check
  app.get('/api/admin/auth-status', (_req, res) => {
    const store = ensureStore();
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const envPasscodeActive = envPass.length > 0;
    const requiresSetup = !envPasscodeActive && !store.adminCredentialHash;
    res.json({ requiresSetup, envPasscodeActive });
  });

  // One-time first-run admin setup
  app.post('/api/admin/setup', (req, res) => {
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const store = ensureStore();
    if (envPass.length > 0 || store.adminCredentialHash) {
      res.status(409).json({ error: 'Admin paroli allaqachon o‘rnatilgan.' });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 64) {
      res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' });
      return;
    }

    store.adminCredentialHash = hashPasscode(passcode);
    writeStore(store);

    const token = createAdminToken();
    res.status(201).json({ token });
  });

  // Admin login
  app.post('/api/admin/login', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      res.status(400).json({ error: 'Parolni kiriting.' });
      return;
    }

    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const store = ensureStore();

    if (envPass.length > 0) {
      if (!timingSafeCompareText(passcode, envPass)) {
        res.status(401).json({ error: 'Admin paroli noto‘g‘ri.' });
        return;
      }
    } else if (store.adminCredentialHash) {
      if (!verifyPasscodeHash(passcode, store.adminCredentialHash)) {
        res.status(401).json({ error: 'Admin paroli noto‘g‘ri.' });
        return;
      }
    } else {
      res.status(409).json({ error: 'Avval admin parolini sozlang.' });
      return;
    }

    const token = createAdminToken();
    res.json({ token });
  });

  // Protected Admin: Orders list & stats
  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    const store = ensureStore();
    const orders = store.orders;
    const stats = {
      totalOrders: orders.length,
      newOrders: orders.filter((o) => o.status === 'new').length,
      deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
      totalRevenueUzs: orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((acc, o) => acc + o.totalUzs, 0),
    };
    res.json({ orders, stats });
  });

  // Protected Admin: Update order status + optional Telegram notification
  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const status = req.body?.status as OrderStatus;
    const notifyTelegram = req.body?.notifyTelegram !== false;

    if (!['new', 'confirmed', 'shipping', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Noto‘g‘ri buyurtma holati.' });
      return;
    }

    const store = ensureStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Buyurtma topilmadi.' });
      return;
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (notifyTelegram) {
      const tg = await sendTelegramMessage(buildOrderTelegramHtml(order, true));
      order.telegramSent = order.telegramSent || tg.ok;
      if (tg.messageId) order.telegramMessageId = tg.messageId;
      if (!tg.ok && tg.error) order.telegramError = tg.error;
    }

    writeStore(store);
    res.json({ order });
  });

  // Protected Admin: Resend order to Telegram
  app.post('/api/admin/orders/:id/resend-telegram', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const store = ensureStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Buyurtma topilmadi.' });
      return;
    }

    const tg = await sendTelegramMessage(buildOrderTelegramHtml(order, false));
    order.telegramSent = tg.ok;
    if (tg.messageId) order.telegramMessageId = tg.messageId;
    order.telegramError = tg.ok ? undefined : tg.error;
    order.updatedAt = new Date().toISOString();

    writeStore(store);
    res.json({ order, telegramOk: tg.ok, error: tg.error });
  });

  // Protected Admin: Create product
  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body as Partial<Product>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'Flagman';
    const basePriceUzs = Number(body.basePriceUzs);
    const stockCount = Number.isInteger(body.stockCount) ? Number(body.stockCount) : 10;
    const image =
      typeof body.image === 'string' && isSafeImageUrl(body.image)
        ? body.image.trim()
        : '/src/assets/images/phone_iphone_pro_black_1795237737799.jpg';

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Model nomini kiriting.' });
      return;
    }
    if (!brand) {
      res.status(400).json({ error: 'Brend nomini kiriting.' });
      return;
    }
    if (!Number.isFinite(basePriceUzs) || basePriceUzs <= 0) {
      res.status(400).json({ error: 'Narx musbat son bo‘lishi kerak.' });
      return;
    }

    const storageOptions =
      Array.isArray(body.storageOptions) && body.storageOptions.length > 0
        ? body.storageOptions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        : ['128 GB', '256 GB', '512 GB'];

    const colors =
      Array.isArray(body.colors) && body.colors.length > 0
        ? body.colors.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : ['Qora Obsidian', 'Yashil Emerald', 'Oq Pearl'];

    const storagePriceOffsets: Record<string, number> = {};
    storageOptions.forEach((opt, idx) => {
      const provided = body.storagePriceOffsets?.[opt];
      storagePriceOffsets[opt] =
        typeof provided === 'number' && Number.isFinite(provided) ? provided : idx * 1200000;
    });

    const newProduct: Product = {
      id: `vm-${crypto.randomUUID().slice(0, 8)}`,
      name,
      brand,
      category,
      basePriceUzs: Math.round(basePriceUzs),
      oldPriceUzs:
        typeof body.oldPriceUzs === 'number' && body.oldPriceUzs > basePriceUzs
          ? Math.round(body.oldPriceUzs)
          : undefined,
      storageOptions,
      storagePriceOffsets,
      colors,
      image,
      inStock: stockCount > 0 && body.inStock !== false,
      stockCount: Math.max(0, stockCount),
      featured: Boolean(body.featured),
      tag: typeof body.tag === 'string' && body.tag.trim() ? body.tag.trim().slice(0, 28) : undefined,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim().slice(0, 400)
          : `${brand} ${name} — rasmiy kafolat va tezkor yetkazib berish bilan.`,
      specs: {
        display: body.specs?.display?.trim() || '6.7" AMOLED 120 Hz',
        chip: body.specs?.chip?.trim() || 'Flagship Pro Processor',
        camera: body.specs?.camera?.trim() || '50 MP Triple Camera',
        battery: body.specs?.battery?.trim() || '5000 mAh',
      },
    };

    const store = ensureStore();
    store.products.unshift(newProduct);
    writeStore(store);

    res.status(201).json({ product: newProduct });
  });

  // Protected Admin: Update product
  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const store = ensureStore();
    const product = store.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Mahsulot topilmadi.' });
      return;
    }

    const body = req.body as Partial<Product>;
    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      product.name = body.name.trim();
    }
    if (typeof body.brand === 'string' && body.brand.trim()) {
      product.brand = body.brand.trim();
    }
    if (typeof body.category === 'string' && body.category.trim()) {
      product.category = body.category.trim();
    }
    if (typeof body.basePriceUzs === 'number' && Number.isFinite(body.basePriceUzs) && body.basePriceUzs > 0) {
      product.basePriceUzs = Math.round(body.basePriceUzs);
    }
    if (typeof body.stockCount === 'number' && Number.isInteger(body.stockCount) && body.stockCount >= 0) {
      product.stockCount = body.stockCount;
      if (body.stockCount === 0) {
        product.inStock = false;
      }
    }
    if (typeof body.inStock === 'boolean') {
      product.inStock = body.inStock;
    }
    if (typeof body.featured === 'boolean') {
      product.featured = body.featured;
    }
    if (typeof body.description === 'string' && body.description.trim()) {
      product.description = body.description.trim().slice(0, 400);
    }
    if (typeof body.image === 'string' && isSafeImageUrl(body.image)) {
      product.image = body.image.trim();
    }

    writeStore(store);
    res.json({ product });
  });

  // Protected Admin: Delete product
  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const store = ensureStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Mahsulot topilmadi.' });
      return;
    }
    store.products.splice(idx, 1);
    writeStore(store);
    res.json({ ok: true });
  });

  // Protected Admin: Telegram configuration status (never returns raw token)
  app.get('/api/admin/telegram', requireAdmin, (_req, res) => {
    const { botToken, chatId, source } = getTelegramCredentials();
    res.json({
      configured: Boolean(botToken && chatId),
      maskedToken: maskToken(botToken),
      chatId,
      source,
    });
  });

  // Protected Admin: Update Telegram runtime settings in memory
  app.put('/api/admin/telegram', requireAdmin, (req, res) => {
    const botToken = typeof req.body?.botToken === 'string' ? req.body.botToken.trim() : '';
    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : '';

    if (botToken) {
      runtimeTelegram.botToken = botToken;
    }
    if (chatId) {
      runtimeTelegram.chatId = chatId;
    }

    const current = getTelegramCredentials();
    res.json({
      configured: Boolean(current.botToken && current.chatId),
      maskedToken: maskToken(current.botToken),
      chatId: current.chatId,
      source: current.source,
    });
  });

  // Protected Admin: Test Telegram bot & channel delivery
  app.post('/api/admin/telegram/test', requireAdmin, async (_req, res) => {
    const { botToken, chatId } = getTelegramCredentials();
    if (!botToken || !chatId) {
      res.status(400).json({ ok: false, error: 'Bot tokeni yoki kanal ID kiritilmagan.' });
      return;
    }

    try {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: AbortSignal.timeout(6000),
      });
      const meData = (await meRes.json()) as {
        ok?: boolean;
        result?: { username?: string };
        description?: string;
      };
      if (!meRes.ok || !meData.ok) {
        res.status(400).json({
          ok: false,
          error: meData.description || 'Bot tokeni yaroqsiz.',
        });
        return;
      }

      const sendRes = await sendTelegramMessage(
        `<b>VERDE MOBILE — Test xabari</b>\n\nTelegram kanal ulanishi faol holatda. Yangi buyurtmalar real vaqt rejimida shu kanalga yuboriladi.`
      );

      if (!sendRes.ok) {
        res.status(400).json({
          ok: false,
          botUsername: meData.result?.username,
          error: sendRes.error,
        });
        return;
      }

      res.json({
        ok: true,
        botUsername: meData.result?.username,
        messageId: sendRes.messageId,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Telegram bilan bog‘lanishda xato.',
      });
    }
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VERDE MOBILE server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
