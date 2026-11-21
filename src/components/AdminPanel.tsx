import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import type {
  AdminStats,
  AuthStatus,
  Order,
  OrderStatus,
  Product,
  TelegramConfigStatus,
} from '../types';
import {
  formatDateTimeUz,
  formatUzs,
  getPaymentLabel,
  getStatusLabel,
} from '../utils/format';
import { SafeImage } from './SafeImage';

interface AdminPanelProps {
  products: Product[];
  onRefreshProducts: () => void;
  onBackToStore: () => void;
}

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

export function AdminPanel({
  products,
  onRefreshProducts,
  onBackToStore,
}: AdminPanelProps) {
  // Bearer token strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'telegram'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    newOrders: 0,
    deliveredOrders: 0,
    totalRevenueUzs: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Apple');
  const [newCategory, setNewCategory] = useState('Flagman');
  const [newPrice, setNewPrice] = useState('14500000');
  const [newStock, setNewStock] = useState('10');
  const [newImage, setNewImage] = useState(STUDIO_IMAGES[0].url);
  const [newDisplay, setNewDisplay] = useState('6.7" LTPO OLED, 120 Hz');
  const [newChip, setNewChip] = useState('Flagship 3nm Pro');
  const [newCamera, setNewCamera] = useState('50 MP Triple Pro');
  const [newBattery, setNewBattery] = useState('5000 mAh');
  const [newDesc, setNewDesc] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Telegram Settings State
  const [tgConfig, setTgConfig] = useState<TelegramConfigStatus | null>(null);
  const [tgTokenInput, setTgTokenInput] = useState('');
  const [tgChatIdInput, setTgChatIdInput] = useState('');
  const [tgTesting, setTgTesting] = useState(false);
  const [tgFeedback, setTgFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = (await res.json()) as AuthStatus;
      setAuthStatus(data);
    } catch {
      setAuthError("Server holatini tekshirib bo'lmadi.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

  const fetchOrders = useCallback(
    async (token: string) => {
      setLoadingOrders(true);
      try {
        const res = await fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          setAdminToken(null);
          return;
        }
        const data = (await res.json()) as { orders: Order[]; stats: AdminStats };
        setOrders(data.orders || []);
        if (data.stats) setStats(data.stats);
      } finally {
        setLoadingOrders(false);
      }
    },
    []
  );

  const fetchTelegramStatus = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/telegram', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as TelegramConfigStatus;
      setTgConfig(data);
      setTgChatIdInput(data.chatId || '');
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      fetchOrders(adminToken);
      fetchTelegramStatus(adminToken);
    }
  }, [adminToken, fetchOrders, fetchTelegramStatus]);

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passcodeInput.length < 6) {
      setAuthError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (passcodeInput !== confirmPasscodeInput) {
      setAuthError('Parollar bir-biriga mos kelmadi.');
      return;
    }

    setSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || "Parolni o'rnatishda xatolik.");
        return;
      }
      setAdminToken(data.token);
      setPasscodeInput('');
      setConfirmPasscodeInput('');
      await fetchAuthStatus();
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || "Parol noto'g'ri.");
        return;
      }
      setAdminToken(data.token);
      setPasscodeInput('');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!adminToken) return;
    setActionMessage(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: newStatus, notifyTelegram: true }),
    });
    if (res.ok) {
      setActionMessage(`Buyurtma holati "${getStatusLabel(newStatus)}" ga o'zgartirildi.`);
      await fetchOrders(adminToken);
    }
  };

  const handleResendTelegram = async (orderId: string) => {
    if (!adminToken) return;
    setActionMessage(null);
    const res = await fetch(`/api/admin/orders/${orderId}/resend-telegram`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as { telegramOk?: boolean; error?: string };
    if (data.telegramOk) {
      setActionMessage('Buyurtma Telegram kanalga qayta yuborildi.');
    } else {
      setActionMessage(data.error || 'Telegramga yuborishda xatolik.');
    }
    await fetchOrders(adminToken);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingProduct(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: newName,
          brand: newBrand,
          category: newCategory,
          basePriceUzs: Number(newPrice),
          stockCount: Number(newStock),
          image: newImage,
          description: newDesc,
          featured: true,
          specs: {
            display: newDisplay,
            chip: newChip,
            camera: newCamera,
            battery: newBattery,
          },
        }),
      });
      const data = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok || !data.product) {
        setActionMessage(data.error || "Mahsulot qo'shishda xato.");
        return;
      }
      setActionMessage(`"${data.product.name}" katalogga qo'shildi.`);
      setNewName('');
      setNewDesc('');
      setShowAddProduct(false);
      onRefreshProducts();
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        inStock: !product.inStock,
        stockCount: !product.inStock && product.stockCount === 0 ? 5 : product.stockCount,
      }),
    });
    if (res.ok) {
      onRefreshProducts();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setActionMessage(`"${product.name}" katalogdan o'chirildi.`);
      onRefreshProducts();
    }
  };

  const handleSaveTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setTgFeedback(null);
    const res = await fetch('/api/admin/telegram', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        botToken: tgTokenInput.trim() || undefined,
        chatId: tgChatIdInput.trim() || undefined,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as TelegramConfigStatus;
      setTgConfig(updated);
      setTgTokenInput('');
      setTgFeedback({ ok: true, text: 'Telegram sozlamalari yangilandi.' });
    } else {
      setTgFeedback({ ok: false, text: 'Sozlamalarni saqlashda xato.' });
    }
  };

  const handleTestTelegram = async () => {
    if (!adminToken) return;
    setTgTesting(true);
    setTgFeedback(null);
    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        botUsername?: string;
        messageId?: number;
        error?: string;
      };
      if (data.ok) {
        setTgFeedback({
          ok: true,
          text: `Test xabar @${data.botUsername || 'bot'} orqali kanalga yuborildi (ID: ${data.messageId}).`,
        });
      } else {
        setTgFeedback({
          ok: false,
          text: data.error || 'Telegram kanalga xabar yuborib bo‘lmadi.',
        });
      }
    } finally {
      setTgTesting(false);
    }
  };

  if (!adminToken) {
    return (
      <section className="min-h-[75vh] bg-[#F5F7F5] py-14 sm:py-20">
        <div className="mx-auto max-w-md px-5">
          <div className="rounded-2xl border border-[#DCE3DE] bg-white p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A0D0B] text-[#4ADE80]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#16A34A]">Boshqaruv tizimi</p>
                <h1 className="font-display text-xl font-bold text-[#0A0D0B]">
                  {authStatus?.requiresSetup
                    ? 'Admin parolini o‘rnatish'
                    : 'Admin Panelga kirish'}
                </h1>
              </div>
            </div>

            {authLoading ? (
              <p className="mt-6 text-sm text-[#5A655E]">Tekshirilmoqda...</p>
            ) : authStatus?.requiresSetup ? (
              <form onSubmit={handleSetupAdmin} className="mt-6 space-y-4">
                <p className="text-xs leading-relaxed text-[#47524B]">
                  Birinchi ishga tushirish uchun administrator parolini yarating. Ushbu parol
                  buyurtmalar, katalog va Telegram sozlamalarini himoya qiladi.
                </p>

                {authError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    {authError}
                  </div>
                )}

                <div>
                  <label htmlFor="setup-pass" className="block text-xs font-semibold text-[#0A0D0B]">
                    Yangi admin paroli (kamida 6 ta belgi)
                  </label>
                  <input
                    id="setup-pass"
                    type="password"
                    required
                    minLength={6}
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-confirm"
                    className="block text-xs font-semibold text-[#0A0D0B]"
                  >
                    Parolni tasdiqlang
                  </label>
                  <input
                    id="setup-confirm"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPasscodeInput}
                    onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="min-h-[44px] w-full rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
                >
                  {submittingAuth ? 'Saqlanmoqda...' : 'Parolni saqlash va kirish'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginAdmin} className="mt-6 space-y-4">
                <p className="text-xs leading-relaxed text-[#47524B]">
                  Buyurtmalar, smartfon katalogi va Telegram botini boshqarish uchun parolni
                  kiriting.
                </p>

                {authError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    {authError}
                  </div>
                )}

                <div>
                  <label htmlFor="login-pass" className="block text-xs font-semibold text-[#0A0D0B]">
                    Admin paroli
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    required
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Parolni kiriting"
                    className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DCE3DE] px-3.5 py-2 text-sm text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="min-h-[44px] w-full rounded-lg bg-[#0A0D0B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16A34A] disabled:opacity-60"
                >
                  {submittingAuth ? 'Tekshirilmoqda...' : 'Kirish'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={onBackToStore}
              className="mt-5 block w-full text-center text-xs font-medium text-[#5A655E] hover:text-[#0A0D0B]"
            >
              Do‘konga qaytish
            </button>
          </div>
        </div>
      </section>
    );
  }

  const filteredOrders =
    statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <section className="min-h-[80vh] bg-[#F5F7F5] py-10 sm:py-12">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        {/* Admin Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#DCE3DE] pb-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-medium text-[#16A34A]">VERDE MOBILE Boshqaruv</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0A0D0B]">
              Admin Panel
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchOrders(adminToken);
                onRefreshProducts();
              }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#DCE3DE] bg-white px-4 py-2 text-xs font-semibold text-[#0A0D0B] transition-colors hover:border-[#0A0D0B]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Yangilash</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminToken(null)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0A0D0B] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        {/* 4-Column KPI Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
            <p className="text-xs text-[#5A655E]">Jami buyurtmalar</p>
            <p className="mt-2 font-mono text-2xl font-bold text-[#0A0D0B] tabular-nums">
              {stats.totalOrders}
            </p>
          </div>
          <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
            <p className="text-xs text-[#5A655E]">Yangi buyurtmalar</p>
            <p className="mt-2 font-mono text-2xl font-bold text-[#16A34A] tabular-nums">
              {stats.newOrders}
            </p>
          </div>
          <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
            <p className="text-xs text-[#5A655E]">Yetkazib berildi</p>
            <p className="mt-2 font-mono text-2xl font-bold text-[#0A0D0B] tabular-nums">
              {stats.deliveredOrders}
            </p>
          </div>
          <div className="rounded-xl border border-[#DCE3DE] bg-[#0A0D0B] p-5 text-white">
            <p className="text-xs text-[#9CA7A0]">Umumiy tushum</p>
            <p className="mt-2 font-mono text-xl font-bold text-[#4ADE80] tabular-nums sm:text-2xl">
              {formatUzs(stats.totalRevenueUzs)}
            </p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border border-[#DCE3DE] bg-white p-1">
            {(
              [
                ['orders', `Buyurtmalar (${orders.length})`],
                ['products', `Mahsulotlar (${products.length})`],
                ['telegram', 'Telegram sozlamalari'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`min-h-[38px] shrink-0 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === id
                    ? 'bg-[#0A0D0B] text-white'
                    : 'text-[#47524B] hover:text-[#0A0D0B]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {actionMessage && (
            <p className="text-xs font-semibold text-[#15803D]">{actionMessage}</p>
          )}
        </div>

        {/* Tab 1: Orders Management */}
        {activeTab === 'orders' && (
          <div className="mt-6 rounded-xl border border-[#DCE3DE] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFF3F0] px-5 py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['all', 'Barchasi'],
                    ['new', 'Yangi'],
                    ['confirmed', 'Tasdiqlandi'],
                    ['shipping', "Yo'lda"],
                    ['delivered', 'Yetkazildi'],
                    ['cancelled', 'Bekor qilindi'],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-[#F4F7F5] text-[#47524B] hover:text-[#0A0D0B]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loadingOrders ? (
              <div className="p-8 text-center text-sm text-[#5A655E]">
                Buyurtmalar yuklanmoqda...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-display text-base font-semibold text-[#0A0D0B]">
                  Hozircha buyurtmalar yo‘q
                </p>
                <p className="mt-1 text-xs text-[#5A655E]">
                  Do‘kondan birinchi buyurtma berilganda u shu yerda va Telegram kanalda ko‘rinadi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFF3F0]">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0A0D0B] tabular-nums">
                          #{order.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#5A655E] tabular-nums">
                          {formatDateTimeUz(order.createdAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            order.telegramSent ? 'text-[#15803D]' : 'text-amber-700'
                          }`}
                        >
                          {order.telegramSent
                            ? 'Telegramga yuborilgan'
                            : 'Telegramga yuborilmagan'}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-[#0A0D0B]">
                        {order.customerName}{' '}
                        <span className="font-mono font-normal text-[#47524B] tabular-nums">
                          ({order.customerPhone})
                        </span>
                      </p>

                      <p className="text-xs text-[#5A655E]">
                        {order.region}, {order.address} · {getPaymentLabel(order.paymentMethod)}
                      </p>

                      <p className="text-xs text-[#0A0D0B]">
                        {order.items
                          .map(
                            (it) => `${it.productName} (${it.storage}, ${it.color}) × ${it.quantity}`
                          )
                          .join(' · ')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <p className="font-mono text-sm font-bold text-[#0A0D0B] tabular-nums">
                        {formatUzs(order.totalUzs)}
                      </p>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        aria-label={`Buyurtma ${order.orderNumber} holati`}
                        className="min-h-[38px] rounded-lg border border-[#DCE3DE] bg-[#F8FAF8] px-3 py-1.5 text-xs font-semibold text-[#0A0D0B] focus:border-[#16A34A] focus:outline-none"
                      >
                        <option value="new">Yangi</option>
                        <option value="confirmed">Tasdiqlandi</option>
                        <option value="shipping">Yo‘lda</option>
                        <option value="delivered">Yetkazildi</option>
                        <option value="cancelled">Bekor qilindi</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleResendTelegram(order.id)}
                        className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#DCE3DE] px-3 py-1.5 text-xs font-semibold text-[#0A0D0B] transition-colors hover:border-[#16A34A] hover:text-[#16A34A]"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Telegramga yuborish</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products Management */}
        {activeTab === 'products' && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0A0D0B]">
                Katalogdagi smartfonlar
              </h2>
              <button
                type="button"
                onClick={() => setShowAddProduct((prev) => !prev)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#15803D]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{showAddProduct ? 'Yopish' : "Yangi smartfon qo'shish"}</span>
              </button>
            </div>

            {showAddProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="rounded-xl border border-[#DCE3DE] bg-white p-6"
              >
                <h3 className="font-display text-base font-bold text-[#0A0D0B]">
                  Yangi model qo‘shish
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Model nomi</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Masalan: iPhone 16 Plus"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Brend</label>
                    <select
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    >
                      <option value="Apple">Apple</option>
                      <option value="Samsung">Samsung</option>
                      <option value="Xiaomi">Xiaomi</option>
                      <option value="Google">Google</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Toifa</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    >
                      <option value="Flagman">Flagman</option>
                      <option value="Kamera">Kamera</option>
                      <option value="Buklanuvchi">Buklanuvchi</option>
                      <option value="Kompakt">Kompakt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">
                      Boshlang‘ich narx (so‘m)
                    </label>
                    <input
                      type="number"
                      required
                      min={100000}
                      step={10000}
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 font-mono text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Ombordagi soni</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 font-mono text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Rasm shabloni</label>
                    <select
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    >
                      {STUDIO_IMAGES.map((img) => (
                        <option key={img.url} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Ekran</label>
                    <input
                      type="text"
                      value={newDisplay}
                      onChange={(e) => setNewDisplay(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Protsessor</label>
                    <input
                      type="text"
                      value={newChip}
                      onChange={(e) => setNewChip(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Kamera</label>
                    <input
                      type="text"
                      value={newCamera}
                      onChange={(e) => setNewCamera(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-[#0A0D0B]">Qisqa tavsif</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Smartfonning asosiy afzalliklari haqida qisqacha..."
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="min-h-[42px] rounded-lg bg-[#0A0D0B] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16A34A] disabled:opacity-60"
                  >
                    {savingProduct ? 'Saqlanmoqda...' : 'Katalogga saqlash'}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden rounded-xl border border-[#DCE3DE] bg-white">
              <div className="divide-y divide-[#EFF3F0]">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F4F7F5]">
                        <SafeImage
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-[#5A655E]">
                          {product.brand} · {product.category}
                        </p>
                        <h3 className="font-display text-sm font-bold text-[#0A0D0B]">
                          {product.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-[#15803D] tabular-nums">
                          {formatUzs(product.basePriceUzs)} · {product.stockCount} dona
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStock(product)}
                        className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          product.inStock
                            ? 'border-[#16A34A] bg-[#ECFDF5] text-[#15803D]'
                            : 'border-[#DCE3DE] bg-[#F4F7F5] text-[#5A655E]'
                        }`}
                      >
                        {product.inStock ? 'Sotuvda bor' : 'Sotuvda yo‘q'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        aria-label={`${product.name} ni o‘chirish`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DE] text-[#5A655E] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Telegram Bot & Channel Controls */}
        {activeTab === 'telegram' && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-6">
              <h2 className="font-display text-lg font-bold text-[#0A0D0B]">
                Telegram kanal ulanishi
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5A655E]">
                Har bir yangi buyurtma real vaqt rejimida belgilangan Telegram kanalga avtomatik
                tarzda yuboriladi. Bot kanalda administrator bo‘lishi zarur.
              </p>

              <dl className="mt-5 divide-y divide-[#EFF3F0] border-t border-b border-[#EFF3F0] text-xs">
                <div className="flex justify-between py-3">
                  <dt className="text-[#5A655E]">Ulanish holati</dt>
                  <dd className="font-semibold text-[#15803D]">
                    {tgConfig?.configured ? 'Faol (Sozlangan)' : 'Sozlanmagan'}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-[#5A655E]">Bot tokeni</dt>
                  <dd className="font-mono font-medium text-[#0A0D0B]">
                    {tgConfig?.maskedToken || 'Kiritilmagan'}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-[#5A655E]">Kanal ID</dt>
                  <dd className="font-mono font-semibold text-[#0A0D0B] tabular-nums">
                    {tgConfig?.chatId || 'Kiritilmagan'}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <button
                  type="button"
                  disabled={tgTesting}
                  onClick={handleTestTelegram}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{tgTesting ? 'Yuborilmoqda...' : 'Kanalga test xabar yuborish'}</span>
                </button>
              </div>

              {tgFeedback && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                    tgFeedback.ok
                      ? 'border-[#16A34A]/30 bg-[#ECFDF5] text-[#15803D]'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {tgFeedback.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{tgFeedback.text}</span>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSaveTelegramSettings}
              className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-6"
            >
              <h3 className="font-display text-base font-bold text-[#0A0D0B]">
                Bot va kanalni operativ almashtirish
              </h3>
              <p className="mt-1 text-xs text-[#5A655E]">
                Agar yangi bot tokeni yoki boshqa Telegram kanal ID kiritmoqchi bo‘lsangiz,
                quyidagi maydonlarni to‘ldiring.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="tg-token" className="block text-xs font-semibold text-[#0A0D0B]">
                    Yangi Bot Token (ixtiyoriy)
                  </label>
                  <input
                    id="tg-token"
                    type="password"
                    value={tgTokenInput}
                    onChange={(e) => setTgTokenInput(e.target.value)}
                    placeholder="O‘zgartirmaslik uchun bo‘sh qoldiring"
                    className="mt-1.5 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 font-mono text-xs focus:border-[#16A34A] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="tg-chat" className="block text-xs font-semibold text-[#0A0D0B]">
                    Kanal ID
                  </label>
                  <input
                    id="tg-chat"
                    type="text"
                    value={tgChatIdInput}
                    onChange={(e) => setTgChatIdInput(e.target.value)}
                    placeholder="-1003957660682"
                    className="mt-1.5 min-h-[40px] w-full rounded-lg border border-[#DCE3DE] px-3 py-2 font-mono text-xs focus:border-[#16A34A] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[42px] rounded-lg bg-[#0A0D0B] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16A34A]"
                >
                  Sozlamalarni yangilash
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
