import { useCallback, useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { CartDrawer } from './components/CartDrawer';
import { CatalogSection } from './components/CatalogSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { ProductDetailModal } from './components/ProductDetailModal';
import { TrustSection } from './components/TrustSection';
import type { CartItem, Product } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<'store' | 'admin'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Katalogni yuklab bo‘lmadi.');
      }
      const data = (await response.json()) as { products: Product[] };
      setProducts(data.products || []);
    } catch {
      setProductsError('Smartfonlar katalogini yuklashda xatolik yuz berdi.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleNavigateView = (view: 'store' | 'admin', sectionId?: string) => {
    setActiveView(view);
    if (view === 'store' && sectionId) {
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (
    product: Product,
    storage: string,
    color: string,
    openCheckout = false
  ) => {
    const offset = product.storagePriceOffsets[storage] ?? 0;
    const unitPriceUzs = product.basePriceUzs + offset;
    const key = `${product.id}__${storage}__${color}`;

    setCartItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          image: product.image,
          storage,
          color,
          unitPriceUzs,
          quantity: 1,
        },
      ];
    });

    if (openCheckout) {
      setCartOpen(true);
    }
  };

  const handleQuickAdd = (product: Product) => {
    const defaultStorage = product.storageOptions[0] || '256 GB';
    const defaultColor = product.colors[0] || 'Qora';
    handleAddToCart(product, defaultStorage, defaultColor, true);
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(20, Math.max(0, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0D110E]">
      <Navbar
        activeView={activeView}
        onNavigateView={handleNavigateView}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'store' ? (
          <>
            <HeroSection
              onBrowseCatalog={() => handleNavigateView('store', 'katalog')}
              onOpenAdmin={() => handleNavigateView('admin')}
            />
            <CatalogSection
              products={products}
              loading={loadingProducts}
              error={productsError}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onQuickAdd={handleQuickAdd}
            />
            <TrustSection />
          </>
        ) : (
          <AdminPanel
            products={products}
            onRefreshProducts={fetchProducts}
            onBackToStore={() => handleNavigateView('store', 'katalog')}
          />
        )}
      </main>

      <Footer onNavigateView={handleNavigateView} />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, storage, color, openDrawer) => {
          handleAddToCart(product, storage, color, openDrawer);
        }}
      />

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
        onOrderSuccess={fetchProducts}
      />
    </div>
  );
}
