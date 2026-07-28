"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getStoreBySlug,
  getProducts,
  submitOrder,
  formatRupiah,
  CartItem,
  OnlineProduct,
  StoreSettings,
  statusColor,
  getOrders,
  cancelOrder,
  OnlineOrder,
  SubmitOrderResult,
} from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Sembako", "Lainnya"];

const FAV_KEY = "nusa_favorites";

function loadFavorites(): number[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch { return []; }
}
function saveFavorites(ids: number[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  } catch { return d; }
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"home" | "favorites" | "history">("home");
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout form
  const [checkoutView, setCheckoutView] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("Segera");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState("");
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState("");
  const [successView, setSuccessView] = useState(false);

  // Favorites
  const [favIds, setFavIds] = useState<number[]>([]);

  // Orders view
  const [orderPhone, setOrderPhone] = useState("");
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    setFavIds(loadFavorites());
  }, []);

  useEffect(() => {
    if (!slug) return;
    getStoreBySlug(slug).then((s) => {
      if (!s) { setLoading(false); return; }
      setStore(s);
      getProducts(s.store_id).then((p) => {
        setProducts(p ?? []);
        setLoading(false);
      });
    });
  }, [slug]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);

  const addToCart = (product: OnlineProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
            : i
        );
      }
      return [...prev, { product_id: product.product_id, name: product.name, qty: 1, price: product.price, subtotal: product.price }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const nq = i.qty + delta;
        return nq <= 0 ? null : { ...i, qty: nq, subtotal: nq * i.price };
      }).filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setCart([]);

  const toggleFav = useCallback((productId: number) => {
    setFavIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!customerName.trim()) return alert("Nama wajib diisi");
    if (!customerPhone.trim()) return alert("Nomor WhatsApp wajib diisi");
    if (cart.length === 0) return alert("Keranjang kosong");
    setSubmitting(true);
    try {
      const result = await submitOrder(store!.store_id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart,
        subtotal,
        discount: 0,
        promoCode: "",
        handlingFee: 0,
        total: subtotal,
        paymentMethod,
        pickupTime,
        branch: "Pusat",
        notes,
      });
      setLastInvoice(result?.invoice ?? "");
      setLastWhatsappUrl(result?.whatsappUrl ?? "");
      clearCart();
      setCartOpen(false);
      setCheckoutView(false);
      setSuccessView(true);

      // Auto-open WhatsApp notification to store owner
      if (result?.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank");
      }
    } catch (e: any) {
      alert("Gagal mengirim pesanan: " + (e.message ?? "Coba lagi nanti"));
    }
    setSubmitting(false);
  };

  const loadOrders = async () => {
    if (!orderPhone.trim()) return;
    setOrdersLoading(true);
    try {
      const data = await getOrders(store!.store_id, orderPhone.trim());
      setOrders(data ?? []);
    } catch {
      alert("Gagal memuat pesanan");
    }
    setOrdersLoading(false);
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Yakin batalkan pesanan ini?")) return;
    const ok = await cancelOrder(store!.store_id, orderId, orderPhone.trim());
    alert(ok ? "Pesanan dibatalkan" : "Gagal membatalkan pesanan");
    if (ok) loadOrders();
  };

  const filtered = products.filter((p) => {
    if (category !== "Semua" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const favProducts = products.filter((p) => favIds.includes(p.product_id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
        <div>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-800">Toko Tidak Ditemukan</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Link <b className="text-gray-500">{slug}</b> tidak aktif atau belum tersedia.
          </p>
        </div>
      </div>
    );
  }

  const isOpen = store.is_active;

  // ─── SUCCESS ─────────────────────
  if (successView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pesanan Berhasil!</h1>
          <p className="text-primary font-bold text-lg mt-1">#{lastInvoice}</p>
          <p className="text-gray-400 text-sm mt-2">
            Pesanan Anda sedang diproses. Pantau status via menu <strong>Riwayat</strong>.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => { setSuccessView(false); setTab("home"); }}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => { setOrderPhone(customerPhone); setSuccessView(false); setTab("history"); }}
              className="flex-1 bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors"
            >
              Lacak Pesanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 font-inter">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Store info row */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-extrabold text-gray-900 truncate">{store.store_name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isOpen ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                  {isOpen ? "Buka" : "Tutup"}
                </span>
              </div>
              {store.address && (
                <p className="text-xs text-gray-400 truncate mb-0.5">{store.address}</p>
              )}
              {store.open_hours && (
                <p className="text-xs text-gray-400">{store.open_hours}</p>
              )}
            </div>
            <button
              onClick={() => cart.length > 0 ? setCartOpen(true) : null}
              className="relative ml-3 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-md shadow-primary/25 hover:bg-primary-dark transition-colors active:scale-95"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Search + Category ── */}
      {tab === "home" && (
        <>
          <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
            </div>
          </div>
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  category === c
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Tab Content ── */}
      <div className="max-w-lg mx-auto px-4">
        {/* HOME */}
        {tab === "home" && (
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <span className="text-3xl">📦</span>
              </div>
              <p className="text-gray-400 font-medium">
                {search ? "Tidak ada produk ditemukan" : "Belum ada produk"}
              </p>
              <p className="text-gray-300 text-xs mt-1">
                {search ? "Coba kata kunci lain" : "Produk akan muncul di sini"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onAddToCart={addToCart}
                  isFav={favIds.includes(product.product_id)}
                  onToggleFav={() => toggleFav(product.product_id)}
                />
              ))}
            </div>
          )
        )}

        {/* FAVORITES */}
        {tab === "favorites" && (
          favProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <span className="text-3xl">❤️</span>
              </div>
              <p className="text-gray-400 font-medium">Belum ada favorit</p>
              <p className="text-gray-300 text-xs mt-1">Tap ikon hati di produk untuk menambahkan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favProducts.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onAddToCart={addToCart}
                  isFav={true}
                  onToggleFav={() => toggleFav(product.product_id)}
                />
              ))}
            </div>
          )
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
              <label className="text-sm font-bold text-gray-700 block mb-3">
                📱 Nomor WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  placeholder="08xx"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={loadOrders}
                  disabled={ordersLoading}
                  className="bg-primary text-white font-semibold px-5 py-3 rounded-xl text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors active:scale-95"
                >
                  {ordersLoading ? "..." : "Cari"}
                </button>
              </div>
            </div>

            {orders.length === 0 && orderPhone && !ordersLoading && (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <span className="text-3xl">📋</span>
                </div>
                <p className="text-gray-400 font-medium">Tidak ada pesanan</p>
                <p className="text-gray-300 text-xs mt-1">Pesanan Anda akan muncul di sini</p>
              </div>
            )}

            {orders.length > 0 && (
              <div className="space-y-3">
                {orders.map((order) => {
                  const items = (order.items as any[]) || [];
                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-400 font-mono font-semibold">#{order.invoice}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1 line-clamp-2">
                            {items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                          <p className="text-sm text-gray-500 font-medium">{order.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{formatRupiah(order.total)}</p>
                          {order.status === "Online Baru" && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="text-xs text-red-500 mt-1 font-semibold hover:text-red-600"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Navbar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          {([
            { id: "home" as const, icon: "🏠", label: "Beranda", badge: undefined as number | undefined },
            { id: "favorites" as const, icon: "❤️", label: "Favorit", badge: favIds.length },
            { id: "history" as const, icon: "📋", label: "Riwayat", badge: undefined as number | undefined },
          ]).map(({ id, icon, label, badge }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setCartOpen(false); }}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                tab === id ? "text-primary" : "text-gray-400 hover:text-gray-500"
              }`}
            >
              <span className="text-xl relative">
                {icon}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-3 bg-primary text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-sm">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold mt-0.5">{label}</span>
              {tab === id && <div className="w-5 h-0.5 rounded-full bg-primary mt-1" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Cart Bottom Sheet ── */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => { setCartOpen(false); setCheckoutView(false); }}
          />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
              {/* Handle + Header */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-gray-300" />
              </div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  🛒 Keranjang
                  {cartCount > 0 && <span className="text-sm font-medium text-gray-400">({cartCount} item)</span>}
                </h2>
                <div className="flex items-center gap-3">
                  {cart.length > 0 && (
                    <button onClick={clearCart} className="text-xs text-red-500 font-semibold hover:text-red-600">
                      Kosongkan
                    </button>
                  )}
                  <button onClick={() => { setCartOpen(false); setCheckoutView(false); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                    ✕
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="overflow-y-auto px-5 flex-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">🛒</span>
                    </div>
                    <p className="text-gray-400 font-medium">Keranjang kosong</p>
                    <p className="text-gray-300 text-xs mt-1">Tambahkan produk untuk mulai belanja</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                          📦
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h3>
                          <p className="text-xs text-gray-400 font-medium">{formatRupiah(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeQty(item.product_id, -1)}
                            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 font-bold text-sm hover:bg-gray-100 active:scale-90 transition-all"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold text-gray-800 w-6 text-center">{item.qty}</span>
                          <button
                            onClick={() => changeQty(item.product_id, 1)}
                            className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-dark active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-primary w-24 text-right">{formatRupiah(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom area */}
              {cart.length > 0 && (
                <div className="border-t border-gray-100">
                  {!checkoutView ? (
                    /* Cart summary + checkout button */
                    <div className="px-5 py-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-gray-500">Subtotal</span>
                        <span className="text-lg font-extrabold text-primary">{formatRupiah(subtotal)}</span>
                      </div>
                      <button
                        onClick={() => setCheckoutView(true)}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all text-sm hover:bg-primary-dark"
                      >
                        Lanjutkan ke Checkout →
                      </button>
                    </div>
                  ) : (
                    /* Checkout form */
                    <div className="px-5 py-4 overflow-y-auto max-h-[50vh] space-y-3">
                      <p className="text-sm font-bold text-gray-700 mb-1">📝 Isi Data Pesanan</p>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Nama *</label>
                        <input
                          placeholder="Nama Anda"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">No WhatsApp *</label>
                        <input
                          placeholder="08xx"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Waktu Pickup</label>
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                          <option value="Segera">Segera</option>
                          <option value="30 menit">30 menit</option>
                          <option value="1 jam">1 jam</option>
                          <option value="2 jam">2 jam</option>
                          <option value="Besok">Besok</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Pembayaran</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                          <option value="Tunai">Tunai</option>
                          <option value="QRIS">QRIS</option>
                          <option value="Transfer">Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">Catatan</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
                          placeholder="Contoh: tidak pedas..."
                        />
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700">Total</span>
                          <span className="text-lg font-extrabold text-primary">{formatRupiah(subtotal)}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setCheckoutView(false)}
                          className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3.5 rounded-2xl text-sm hover:bg-gray-200 transition-colors active:scale-95"
                        >
                          ← Kembali
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50 shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors active:scale-95"
                        >
                          {submitting ? "Mengirim..." : "Pesan Sekarang ✅"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
