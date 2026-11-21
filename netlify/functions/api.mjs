import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PRODUCTS } from '../../src/catalog-data.js';

const TMP_STORE_PATH = path.join('/tmp', 'verde-mobile-store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const runtimeTelegram = {};
let memoryStore = null;

function cloneDefaults() {
  return {
    products: JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)),
    orders: [],
    nextOrderSeq: 1001,
  };
}

function readStore() {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(TMP_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_STORE_PATH, 'utf-8'));
      if (Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch {
    // ignore /tmp read errors
  }
  memoryStore = cloneDefaults();
  return memoryStore;
}

function writeStore(store) {
  memoryStore = store;
  try {
    fs.writeFileSync(TMP_STORE_PATH, JSON.stringify(store), 'utf-8');
  } catch {
    // ignore /tmp write errors
  }
}

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

function checkAdminAuth(req) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  return verifyAdminToken(auth.slice(7).trim());
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

async function sendTelegramMessage(htmlText) {
  const { botToken, chatId } = getTelegramCredentials();
  if (!botToken || !chatId) {
    return {
      ok: false,
      error: 'Telegram bot tokeni yoki kanal ID Netlify muhitida sozlanmagan.',
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
      return { ok: false, error: data.description || `Telegram API xatosi (${response.status})` };
    }
    return { ok: true, messageId: data.result?.message_id };
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  path: '/api/*',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const apiPath = url.pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
  const method = req.method.toUpperCase();

  if (apiPath === '/api/health' && method === 'GET') {
    return json({ ok: true });
  }

  if (apiPath === '/api/products' && method === 'GET') {
    const store = readStore();
    return json({ products: store.products });
  }

  if (apiPath === '/api/orders' && method === 'POST') {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Noto‘g‘ri JSON so‘rov.' }, 400);
    }

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const region = typeof body.region === 'string' ? body.region.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : undefined;
    const paymentMethod = body.paymentMethod;

    if (customerName.length < 2 || customerName.length > 80) {
      return json({ error: 'Iltimos, ismingizni to‘liq kiriting (kamida 2 ta belgi).' }, 400);
    }
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return json({ error: 'Telefon raqamini to‘g‘ri formatda kiriting.' }, 400);
    }
    if (!region || region.length > 60) {
      return json({ error: 'Yetkazib berish hududini tanlang.' }, 400);
    }
    if (address.length < 4 || address.length > 200) {
      return json({ error: 'Aniq manzilni kiriting.' }, 400);
    }
    if (!['cash', 'card', 'installment'].includes(paymentMethod)) {
      return json({ error: 'Noto‘g‘ri to‘lov turi tanlandi.' }, 400);
    }
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      return json({ error: 'Buyurtma savati bo‘sh bo‘lmasligi kerak.' }, 400);
    }

    const store = readStore();
    const verifiedItems = [];
    let totalUzs = 0;

    for (const rawItem of body.items) {
      const productId = typeof rawItem?.productId === 'string' ? rawItem.productId : '';
      const quantity =
        typeof rawItem?.quantity === 'number' && Number.isInteger(rawItem.quantity)
          ? rawItem.quantity
          : 0;
      if (quantity < 1 || quantity > 20) {
        return json({ error: 'Mahsulot soni 1 dan 20 gacha bo‘lishi kerak.' }, 400);
      }

      const product = store.products.find((p) => p.id === productId);
      if (!product) return json({ error: 'Tanlangan smartfon topilmadi.' }, 404);
      if (!product.inStock || product.stockCount <= 0) {
        return json({ error: `${product.name} hozirda sotuvda mavjud emas.` }, 409);
      }

      const storage = product.storageOptions.includes(rawItem.storage)
        ? rawItem.storage
        : product.storageOptions[0] || '256 GB';
      const color = product.colors.includes(rawItem.color)
        ? rawItem.color
        : product.colors[0] || 'Qora';
      const unitPriceUzs = product.basePriceUzs + (product.storagePriceOffsets?.[storage] ?? 0);
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

    store.orders.unshift(newOrder);
    writeStore(store);

    return json({ order: newOrder }, 201);
  }

  if (apiPath === '/api/admin/auth-status' && method === 'GET') {
    const store = readStore();
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    return json({
      requiresSetup: !envPass && !store.adminCredentialHash,
      envPasscodeActive: Boolean(envPass),
    });
  }

  if (apiPath === '/api/admin/setup' && method === 'POST') {
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const store = readStore();
    if (envPass || store.adminCredentialHash) {
      return json({ error: 'Admin paroli allaqachon o‘rnatilgan.' }, 409);
    }
    const body = await req.json().catch(() => ({}));
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 64) {
      return json({ error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' }, 400);
    }
    store.adminCredentialHash = hashPasscode(passcode);
    writeStore(store);
    return json({ token: createAdminToken() }, 201);
  }

  if (apiPath === '/api/admin/login' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';
    if (!passcode) return json({ error: 'Parolni kiriting.' }, 400);

    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();
    const store = readStore();
    if (envPass) {
      if (!timingSafeCompareText(passcode, envPass)) {
        return json({ error: 'Admin paroli noto‘g‘ri.' }, 401);
      }
    } else if (store.adminCredentialHash) {
      if (!verifyPasscodeHash(passcode, store.adminCredentialHash)) {
        return json({ error: 'Admin paroli noto‘g‘ri.' }, 401);
      }
    } else {
      return json({ error: 'Avval admin parolini sozlang.' }, 409);
    }
    return json({ token: createAdminToken() });
  }

  // Protected Admin routes
  if (apiPath.startsWith('/api/admin/')) {
    if (!checkAdminAuth(req)) {
      return json({ error: 'Admin avtorizatsiyasi talab qilinadi.' }, 401);
    }

    const store = readStore();

    if (apiPath === '/api/admin/orders' && method === 'GET') {
      const orders = store.orders;
      return json({
        orders,
        stats: {
          totalOrders: orders.length,
          newOrders: orders.filter((o) => o.status === 'new').length,
          deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
          totalRevenueUzs: orders
            .filter((o) => o.status !== 'cancelled')
            .reduce((acc, o) => acc + o.totalUzs, 0),
        },
      });
    }

    const orderStatusMatch = apiPath.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (orderStatusMatch && method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const status = body.status;
      if (!['new', 'confirmed', 'shipping', 'delivered', 'cancelled'].includes(status)) {
        return json({ error: 'Noto‘g‘ri buyurtma holati.' }, 400);
      }
      const order = store.orders.find((o) => o.id === orderStatusMatch[1]);
      if (!order) return json({ error: 'Buyurtma topilmadi.' }, 404);
      order.status = status;
      order.updatedAt = new Date().toISOString();
      if (body.notifyTelegram !== false) {
        const tg = await sendTelegramMessage(buildOrderTelegramHtml(order, true));
        order.telegramSent = order.telegramSent || tg.ok;
      }
      writeStore(store);
      return json({ order });
    }

    const resendMatch = apiPath.match(/^\/api\/admin\/orders\/([^/]+)\/resend-telegram$/);
    if (resendMatch && method === 'POST') {
      const order = store.orders.find((o) => o.id === resendMatch[1]);
      if (!order) return json({ error: 'Buyurtma topilmadi.' }, 404);
      const tg = await sendTelegramMessage(buildOrderTelegramHtml(order, false));
      order.telegramSent = tg.ok;
      order.telegramError = tg.ok ? undefined : tg.error;
      writeStore(store);
      return json({ order, telegramOk: tg.ok, error: tg.error });
    }

    if (apiPath === '/api/admin/products' && method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
      const basePriceUzs = Number(body.basePriceUzs);
      if (name.length < 2 || !brand || !Number.isFinite(basePriceUzs) || basePriceUzs <= 0) {
        return json({ error: 'Mahsulot ma‘lumotlari noto‘g‘ri.' }, 400);
      }
      const newProduct = {
        id: `vm-${crypto.randomUUID().slice(0, 8)}`,
        name,
        brand,
        category: typeof body.category === 'string' ? body.category.trim() : 'Flagman',
        basePriceUzs: Math.round(basePriceUzs),
        storageOptions: ['128 GB', '256 GB', '512 GB'],
        storagePriceOffsets: { '128 GB': 0, '256 GB': 1200000, '512 GB': 2400000 },
        colors: ['Qora Obsidian', 'Yashil Emerald', 'Oq Pearl'],
        image:
          typeof body.image === 'string' && isSafeImageUrl(body.image)
            ? body.image.trim()
            : '/src/assets/images/phone_iphone_pro_black_1795237737799.jpg',
        inStock: true,
        stockCount: Number.isInteger(body.stockCount) ? body.stockCount : 10,
        featured: true,
        description: `${brand} ${name} — rasmiy kafolat bilan.`,
        specs: {
          display: body.specs?.display?.trim() || '6.7" AMOLED 120 Hz',
          chip: body.specs?.chip?.trim() || 'Flagship Pro',
          camera: body.specs?.camera?.trim() || '50 MP Triple',
          battery: body.specs?.battery?.trim() || '5000 mAh',
        },
      };
      store.products.unshift(newProduct);
      writeStore(store);
      return json({ product: newProduct }, 201);
    }

    const prodMatch = apiPath.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (prodMatch && method === 'PATCH') {
      const product = store.products.find((p) => p.id === prodMatch[1]);
      if (!product) return json({ error: 'Mahsulot topilmadi.' }, 404);
      const body = await req.json().catch(() => ({}));
      if (typeof body.inStock === 'boolean') product.inStock = body.inStock;
      if (typeof body.stockCount === 'number' && body.stockCount >= 0) {
        product.stockCount = body.stockCount;
      }
      writeStore(store);
      return json({ product });
    }

    if (prodMatch && method === 'DELETE') {
      const idx = store.products.findIndex((p) => p.id === prodMatch[1]);
      if (idx === -1) return json({ error: 'Mahsulot topilmadi.' }, 404);
      store.products.splice(idx, 1);
      writeStore(store);
      return json({ ok: true });
    }

    if (apiPath === '/api/admin/telegram' && method === 'GET') {
      const { botToken, chatId, source } = getTelegramCredentials();
      return json({
        configured: Boolean(botToken && chatId),
        maskedToken: maskToken(botToken),
        chatId,
        source,
      });
    }

    if (apiPath === '/api/admin/telegram' && method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      if (typeof body.botToken === 'string' && body.botToken.trim()) {
        runtimeTelegram.botToken = body.botToken.trim();
      }
      if (typeof body.chatId === 'string' && body.chatId.trim()) {
        runtimeTelegram.chatId = body.chatId.trim();
      }
      const { botToken, chatId, source } = getTelegramCredentials();
      return json({
        configured: Boolean(botToken && chatId),
        maskedToken: maskToken(botToken),
        chatId,
        source,
      });
    }

    if (apiPath === '/api/admin/telegram/test' && method === 'POST') {
      const { botToken, chatId } = getTelegramCredentials();
      if (!botToken || !chatId) {
        return json({ ok: false, error: 'Bot tokeni yoki kanal ID sozlanmagan.' }, 400);
      }
      const sendRes = await sendTelegramMessage(
        '<b>VERDE MOBILE — Test xabari</b>\n\nNetlify server ulanishi faol holatda.'
      );
      return json(sendRes, sendRes.ok ? 200 : 400);
    }
  }

  return json({ error: 'Topilmadi' }, 404);
}
