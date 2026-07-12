"use client";

import { useEffect, useState } from "react";
import {
  getStore,
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

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Sembako", "Lainnya"];

export default function StorePage({ params }: { params: { storeId: string } }) {
  const storeId = params.storeId;

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"home" | "cart" | "checkout" | "orders" | "success">("home");
  const [lastInvoice, setLastInvoice] = useState("");

  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("Segera");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Orders view
  const [orderPhone, setOrderPhone] = useState("");
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    Promise.all([getStore(storeId), getProducts(storeId)]).then(([s, p]) => {
      setStore(s);
      setProducts(p ?? []);
      setLoading(false);
    });
  }, [storeId]);

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

  const handleSubmit = async () => {
    if (!customerName.trim()) return alert("Nama wajib diisi");
    if (!customerPhone.trim()) return alert("Nomor WhatsApp wajib diisi");
    if (cart.length === 0) return alert("Keranjang kosong");
    setSubmitting(true);
    try {
      const invoice = await submitOrder(storeId, {
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
      setView("success");
    } catch (e: any) {
      alert("Gagal mengirim pesanan: " + (e.message ?? "Coba lagi nanti"));
    }
    setSubmitting(false);
  };

  const loadOrders = async () => {
    if (!orderPhone.trim()) return;
    setOrdersLoading(true);
    try {
      const data = await getOrders(storeId, orderPhone.trim());
      setOrders(data ?? []);
    } catch {
      alert("Gagal memuat pesanan");
    }
    setOrdersLoading(false);
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Yakin batalkan pesanan ini?")) return;
    const ok = await cancelOrder(storeId, orderId, orderPhone.trim());
    alert(ok ? "Pesanan dibatalkan" : "Gagal membatalkan pesanan");
    if (ok) loadOrders();
  };

  const filtered = products.filter((p) => {
    if (category !== "Semua" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          <p className="text-gray-400 mt-2 text-sm">Toko online ini belum diaktifkan atau tidak tersedia.</p>
        </div>
      </div>
    );
  }

  // ─── HOME ────────────────────────
  if (view === "home") {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-primary">{store.store_name}</h1>
              <p className="text-xs text-gray-400">{store.open_hours}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView("orders")} className="text-xs text-gray-500 hover:text-primary font-medium px-3 py-2">Lacak</button>
              <button onClick={() => setView(cart.length ? "cart" : "home")} className="relative bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full">
                🛒 {cartCount > 0 && <span className="ml-1">{cartCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-3">
          <input type="text" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${category === c ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="max-w-lg mx-auto px-4">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Tidak ada produk ditemukan</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <div key={product.product_id} onClick={() => addToCart(product)}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden active:scale-95 transition-transform cursor-pointer shadow-sm hover:shadow-md">
                  <div className="h-28 bg-gray-100 flex items-center justify-center text-4xl">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : "📦"}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</h3>
                    <p className="text-primary font-bold text-sm mt-1">{formatRupiah(product.price)}</p>
                    {product.stock <= 5 && product.stock > 0 && <p className="text-orange-500 text-xs mt-0.5">Sisa {product.stock}</p>}
                    {product.stock <= 0 && <p className="text-red-400 text-xs mt-0.5">Habis</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-20">
            <div className="max-w-lg mx-auto">
              <button onClick={() => setView("cart")}
                className="w-full bg-primary text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-between active:scale-[0.98] transition-transform">
                <span>🛒 {cartCount} item</span>
                <span>{formatRupiah(subtotal)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CART ────────────────────────
  if (view === "cart") {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setView("home")} className="text-2xl">←</button>
            <h1 className="text-lg font-bold">Keranjang</h1>
            {cart.length > 0 && <button onClick={clearCart} className="ml-auto text-xs text-red-500 font-medium">Kosongkan</button>}
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-3">🛒</div>
              <p className="text-gray-400">Keranjang kosong</p>
              <button onClick={() => setView("home")} className="mt-4 text-primary font-semibold text-sm">← Lihat produk</button>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product_id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                  <div className="text-3xl">📦</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{item.name}</h3>
                    <p className="text-xs text-gray-400">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(item.product_id, -1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 font-bold text-sm">−</button>
                    <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                    <button onClick={() => changeQty(item.product_id, 1)} className="w-7 h-7 rounded-full bg-primary text-white font-bold text-sm">+</button>
                  </div>
                  <span className="text-sm font-bold ml-2 w-20 text-right">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-20">
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{formatRupiah(subtotal)}</span></div>
              </div>
              <button onClick={() => setView("checkout")} className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform">
                Lanjutkan ke Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CHECKOUT ────────────────────
  if (view === "checkout") {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setView("cart")} className="text-2xl">←</button>
            <h1 className="text-lg font-bold">Checkout</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-bold mb-3">Data Diri</h2>
            <input placeholder="Nama *" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <input placeholder="Nomor WhatsApp * (08xx)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-bold mb-3">Detail Pesanan</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Waktu Pickup</span>
                <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="text-right bg-transparent font-medium">
                  <option value="Segera">Segera</option>
                  <option value="30 menit">30 menit</option>
                  <option value="1 jam">1 jam</option>
                  <option value="2 jam">2 jam</option>
                  <option value="Besok">Besok</option>
                </select>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pembayaran</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="text-right bg-transparent font-medium">
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Catatan (opsional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Contoh: tidak pedas, extra sambal..." />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h2 className="text-sm font-bold mb-3">Ringkasan Pesanan</h2>
            <div className="space-y-1 text-sm">
              {cart.map((i) => (
                <div key={i.product_id} className="flex justify-between">
                  <span className="text-gray-500">{i.qty}x {i.name}</span>
                  <span>{formatRupiah(i.subtotal)}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-bold pt-1">
                <span>Total</span><span className="text-primary">{formatRupiah(subtotal)}</span>
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 active:scale-[0.98] transition-transform">
            {submitting ? "Mengirim..." : "Pesan Sekarang"}
          </button>
          <p className="text-xs text-gray-400 text-center">Dengan memesan, Anda setuju untuk dihubungi via WhatsApp untuk konfirmasi.</p>
        </div>
      </div>
    );
  }

  // ─── SUCCESS ─────────────────────
  if (view === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pesanan Berhasil!</h1>
          <p className="text-gray-500 mt-2 text-sm">#{lastInvoice}</p>
          <p className="text-gray-400 text-sm mt-1">Pesanan Anda sedang diproses. Pantau status via menu <strong>Lacak</strong>.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setView("home")} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm">Kembali</button>
            <button onClick={() => { setOrderPhone(customerPhone); setView("orders"); }} className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm">Lacak Pesanan</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ORDERS ─────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("home")} className="text-2xl">←</button>
          <h1 className="text-lg font-bold">Lacak Pesanan</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4">
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
      </div>
    </div>
  );
}
