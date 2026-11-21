import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_PRODUCTS } from './src/catalog-data.js';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

// Session signing key held strictly in memory
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Runtime Telegram config overrides held strictly in server memory
const runtimeTelegram = {};

function getTelegramCredentials() {
  const botToken = (runtimeTelegram.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatId = (runtimeTelegram.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '').trim();
  const source =
    runtimeTelegram.botToken || runtimeTelegram.chatId
      ? 'runtime'
      : botToken && chatId
        ? 'env'
        : 'none';
  return { botToken, chatId, source };
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '••••••••';
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

const SEED_PRODUCTS = DEFAULT_PRODUCTS;

function writeStore(store) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = {
      products: SEED_PRODUCTS,
      orders: [],
      nextOrderSeq: 1001,
    };
    writeStore(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
      throw new Error('Invalid store format');
    }
    return parsed;
  } catch {
    const fallback = {
      products: SEED_PRODUCTS,
      orders: [],
      nextOrderSeq: 1001,
    };
    writeStore(fallback);
    return fallback;
  }
}

function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode, storedHash) {
  const [salt, keyHex] = String(storedHash).split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(passcode, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function timingSafeCompareText(a, b) {
  const bufA = Buffer.from(String(a), 'utf-8');
  const bufB = Buffer.from(String(b), 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken() {
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

function verifyAdminToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeCompareText(sig, expectedSig)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded.role === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPriceUzs(amount) {
  return `${Math.round(amount).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

function paymentLabel(method) {
  switch (method) {
    case 'cash':
      return 'Naqd pul (yetkazib berganda)';
    case 'card':
      return 'Click / Payme / Karta';
    case 'installment':
      return 'Muddatli to‘lov (Nasiya)';
    default:
      return String(method);
  }
}

function statusLabelUz(status) {
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
    default:
      return String(status);
  }
}

async function sendTelegramMessage(htmlText) {
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

    const data = await response.json();
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

function buildOrderTelegramHtml(order, isStatusUpdate = false) {
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

function isSafeImageUrl(url) {
  const trimmed = String(url || '').trim();
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

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

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

  app.post('/api/orders', async (req, res) => {
    const body = req.body || {};
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const region = typeof body.region === 'string' ? body.region.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : undefined;
    const paymentMethod = body.paymentMethod;

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
    const verifiedItems = [];
    let totalUzs = 0;

    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem !== 'object') {
        res.status(400).json({ error: 'Buyurtma mahsulotlari formati noto‘g‘ri.' });
        return;
      }
      const productId = typeof rawItem.productId === 'string' ? rawItem.productId : '';
      const quantity =
        typeof rawItem.quantity === 'number' && Number.isInteger(rawItem.quantity)
          ? rawItem.quantity
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

      const requestedStorage = typeof rawItem.storage === 'string' ? rawItem.storage : '';
      const storage = product.storageOptions.includes(requestedStorage)
        ? requestedStorage
        : product.storageOptions[0] || '256 GB';

      const requestedColor = typeof rawItem.color === 'string' ? rawItem.color : '';
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

    const newOrder = {
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

    const tgResult = await sendTelegramMessage(buildOrderTelegramHtml(newOrder, false));
    newOrder.telegramSent = tgResult.ok;
    if (tgResult.messageId) newOrder.telegramMessageId = tgResult.messageId;
    if (!tgResult.ok && tgResult.error) newOrder.telegramError = tgResult.error;

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

  app.get('/api/admin/auth-status', (_req, res) => {
    const store = ensureStore();
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const envPasscodeActive = envPass.length > 0;
    const requiresSetup = !envPasscodeActive && !store.adminCredentialHash;
    res.json({ requiresSetup, envPasscodeActive });
  });

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

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const status = req.body?.status;
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

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body || {};
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
        ? body.storageOptions.filter((s) => typeof s === 'string' && s.trim().length > 0)
        : ['128 GB', '256 GB', '512 GB'];

    const colors =
      Array.isArray(body.colors) && body.colors.length > 0
        ? body.colors.filter((c) => typeof c === 'string' && c.trim().length > 0)
        : ['Qora Obsidian', 'Yashil Emerald', 'Oq Pearl'];

    const storagePriceOffsets = {};
    storageOptions.forEach((opt, idx) => {
      const provided = body.storagePriceOffsets?.[opt];
      storagePriceOffsets[opt] =
        typeof provided === 'number' && Number.isFinite(provided) ? provided : idx * 1200000;
    });

    const newProduct = {
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

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const store = ensureStore();
    const product = store.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Mahsulot topilmadi.' });
      return;
    }

    const body = req.body || {};
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

  app.get('/api/admin/telegram', requireAdmin, (_req, res) => {
    const { botToken, chatId, source } = getTelegramCredentials();
    res.json({
      configured: Boolean(botToken && chatId),
      maskedToken: maskToken(botToken),
      chatId,
      source,
    });
  });

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
      const meData = await meRes.json();
      if (!meRes.ok || !meData.ok) {
        res.status(400).json({
          ok: false,
          error: meData.description || 'Bot tokeni yaroqsiz.',
        });
        return;
      }

      const sendRes = await sendTelegramMessage(
        '<b>VERDE MOBILE — Test xabari</b>\n\nTelegram kanal ulanishi faol holatda. Yangi buyurtmalar real vaqt rejimida shu kanalga yuboriladi.'
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
