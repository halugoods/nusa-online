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
      const invoice = await submitOrder(store!.store_id, {
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
      setLastInvoice(invoice ?? "");
      clearCart();
      setCartOpen(false);
      setCheckoutView(false);
      setSuccessView(true);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-xl font-bold text-gray-700">Toko Tidak Ditemukan</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Link <b>{slug}</b> tidak aktif atau belum tersedia.
          </p>
        </div>
      </div>
    );
  }

  // ─── SUCCESS ─────────────────────
  if (successView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pesanan Berhasil!</h1>
          <p className="text-gray-500 mt-2 text-sm">#{lastInvoice}</p>
          <p className="text-gray-400 text-sm mt-1">Pesanan Anda sedang diproses. Pantau status via menu <strong>Riwayat</strong>.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setSuccessView(false); setTab("home"); }} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm">Kembali</button>
            <button onClick={() => { setOrderPhone(customerPhone); setSuccessView(false); setTab("history"); }} className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm">Lacak Pesanan</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-primary">{store.store_name}</h1>
            <p className="text-xs text-gray-400">{store.open_hours}</p>
          </div>
          <button
            onClick={() => cart.length > 0 ? setCartOpen(true) : null}
            className="relative bg-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-md shadow-primary/30"
          >
            🛒 {cartCount > 0 && <span className="ml-1 bg-white text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold">{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* ── Search + Category ── */}
      {tab === "home" && (
        <>
          <div className="max-w-lg mx-auto px-4 py-3">
            <input type="text" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${category === c ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
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
            <p className="text-center text-gray-400 py-12">Tidak ada produk ditemukan</p>
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
              <div className="text-6xl mb-3">❤️</div>
              <p className="text-gray-400">Belum ada favorit</p>
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
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <label className="text-sm font-bold block mb-2">Nomor WhatsApp</label>
              <div className="flex gap-2">
                <input placeholder="08xx" value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <button onClick={loadOrders} disabled={ordersLoading}
                  className="bg-primary text-white font-semibold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {ordersLoading ? "..." : "Cari"}
                </button>
              </div>
            </div>
            {orders.length > 0 && (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">#{order.invoice}</p>
                        <p className="text-sm font-semibold mt-0.5">
                          {(order.items as any[])?.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</p>
                        <p className="text-sm text-gray-500">{order.payment_method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatRupiah(order.total)}</p>
                        {order.status === "Online Baru" && (
                          <button onClick={() => handleCancelOrder(order.id)} className="text-xs text-red-500 mt-1 font-medium">Batalkan</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Navbar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-lg mx-auto flex">
          {([
            { id: "home" as const, icon: "🏠", label: "Beranda", badge: undefined as number | undefined },
            { id: "favorites" as const, icon: "❤️", label: "Favorit", badge: favIds.length },
            { id: "history" as const, icon: "🕐", label: "Riwayat", badge: undefined as number | undefined },
          ]).map(({ id, icon, label, badge }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setCartOpen(false); }}
              className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${
                tab === id ? "text-primary" : "text-gray-400"
              }`}
            >
              <span className="text-lg relative">
                {icon}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-3 bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold mt-0.5">{label}</span>
              {tab === id && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Cart Bottom Sheet ── */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col animate-slide-up">
              {/* Handle + Header */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  🛒 Keranjang
                  {cartCount > 0 && <span className="text-sm font-normal text-gray-400">({cartCount} item)</span>}
                </h2>
                <div className="flex gap-2">
                  {cart.length > 0 && (
                    <button onClick={clearCart} className="text-xs text-red-500 font-semibold px-2">Kosongkan</button>
                  )}
                  <button onClick={() => setCartOpen(false)} className="text-gray-400 text-xl">✕</button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="overflow-y-auto px-5 flex-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-2">🛒</div>
                    <p className="text-gray-400 text-sm">Keranjang kosong</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <div className="text-3xl">📦</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{item.name}</h3>
                          <p className="text-xs text-gray-400">{formatRupiah(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => changeQty(item.product_id, -1)} className="w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-500 font-bold text-sm">−</button>
                          <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                          <button onClick={() => changeQty(item.product_id, 1)} className="w-7 h-7 rounded-full bg-primary text-white font-bold text-sm">+</button>
                        </div>
                        <span className="text-sm font-bold w-20 text-right">{formatRupiah(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkout form (inline) */}
              {cart.length > 0 && !checkoutView && (
                <div className="px-5 pb-5 pt-3 border-t border-gray-100">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="font-bold text-primary">{formatRupiah(subtotal)}</span>
                  </div>
                  <button
                    onClick={() => setCheckoutView(true)}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform text-sm"
                  >
                    Lanjutkan ke Checkout →
                  </button>
                </div>
              )}

              {/* Checkout form */}
              {cart.length > 0 && checkoutView && (
                <div className="px-5 pb-5 pt-2 overflow-y-auto max-h-[55vh] space-y-3 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Nama *</label>
                    <input placeholder="Nama Anda" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">No WhatsApp *</label>
                    <input placeholder="08xx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Waktu Pickup</label>
                    <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Segera">Segera</option>
                      <option value="30 menit">30 menit</option>
                      <option value="1 jam">1 jam</option>
                      <option value="2 jam">2 jam</option>
                      <option value="Besok">Besok</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Pembayaran</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Tunai">Tunai</option>
                      <option value="QRIS">QRIS</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Catatan</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Contoh: tidak pedas..." />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm">
                    <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatRupiah(subtotal)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCheckoutView(false)} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl text-sm">← Kembali</button>
                    <button onClick={handleSubmit} disabled={submitting}
                      className="flex-1 bg-primary text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 shadow-md">
                      {submitting ? "Mengirim..." : "Pesan Sekarang ✅"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
