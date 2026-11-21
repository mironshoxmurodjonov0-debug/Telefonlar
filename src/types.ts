export interface ProductSpec {
  display: string;
  chip: string;
  camera: string;
  battery: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  basePriceUzs: number;
  oldPriceUzs?: number;
  storageOptions: string[];
  storagePriceOffsets: Record<string, number>;
  colors: string[];
  image: string;
  inStock: boolean;
  stockCount: number;
  featured: boolean;
  tag?: string;
  description: string;
  specs: ProductSpec;
}

export interface CartItem {
  key: string;
  productId: string;
  productName: string;
  brand: string;
  image: string;
  storage: string;
  color: string;
  unitPriceUzs: number;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  storage: string;
  color: string;
  quantity: number;
  unitPriceUzs: number;
  lineTotalUzs: number;
}

export type OrderStatus = 'new' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'installment';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  region: string;
  address: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: OrderItem[];
  totalUzs: number;
  status: OrderStatus;
  telegramSent: boolean;
  telegramMessageId?: number;
  telegramError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalOrders: number;
  newOrders: number;
  deliveredOrders: number;
  totalRevenueUzs: number;
}

export interface TelegramConfigStatus {
  configured: boolean;
  maskedToken: string;
  chatId: string;
  source: 'env' | 'runtime' | 'none';
}

export interface AuthStatus {
  requiresSetup: boolean;
  envPasscodeActive: boolean;
}
