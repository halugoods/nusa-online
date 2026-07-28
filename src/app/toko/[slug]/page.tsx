"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getStoreBySlug, getProducts, submitOrder, formatRupiah,
  CartItem, OnlineProduct, StoreSettings, statusColor,
  getOrders, cancelOrder, OnlineOrder, SubmitOrderResult,
} from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

const CATS = ["Semua", "Makanan", "Minuman", "Sembako", "Lainnya"];

const FAV_KEY = "nusa_fav";
function loadFavs(): number[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
function saveFavs(ids: number[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}

const ORD_KEY = "nusa_ord";
function loadOrds(): OnlineOrder[] {
  try { return JSON.parse(localStorage.getItem(ORD_KEY) || "[]"); } catch { return []; }
}
function saveOrds(ords: OnlineOrder[]) {
  try { localStorage.setItem(ORD_KEY, JSON.stringify(ords)); } catch {}
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"home" | "favorites" | "history">("home");

  /* cart */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutView, setCheckoutView] = useState(false);

  /* checkout */
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [payment, setPayment] = useState("Tunai");
  const [submitting, setSubmitting] = useState(false);

  /* success */
  const [lastInv, setLastInv] = useState("");
  const [lastWa, setLastWa] = useState("");
  const [success, setSuccess] = useState(false);

  /* favorites */
  const [favIds, setFavIds] = useState<number[]>([]);

  /* history */
  const [histPhone, setHistPhone] = useState("");
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [ordLoading, setOrdLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFavIds(loadFavs()); }, []);

  useEffect(() => {
    if (!slug) return;
    getStoreBySlug(slug).then((s) => {
      if (!s) { setLoading(false); return; }
      setStore(s);
      getProducts(s.store_id).then((p) => { setProducts(p ?? []); setLoading(false); });
    });
  }, [slug]);

  /* ── cart helpers ── */
  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (product: OnlineProduct) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.product_id === product.product_id);
      if (ex) return prev.map((c) => c.product_id === product.product_id ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.price } : c);
      return [...prev, { product_id: product.product_id, name: product.name, qty: 1, price: product.price, subtotal: product.price }];
    });
  };

  const decCart = (pid: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product_id !== pid) return c;
      const n = c.qty - 1;
      return n <= 0 ? null : { ...c, qty: n, subtotal: n * c.price };
    }).filter(Boolean) as CartItem[]);
  };

  const clearCart = () => setCart([]);

  const toggleFav = useCallback((pid: number) => {
    setFavIds((prev) => {
      const next = prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid];
      saveFavs(next);
      return next;
    });
  }, []);

  /* ── order ── */
  const handleSubmit = async () => {
    if (!custName.trim()) return alert("Nama wajib diisi");
    if (!custPhone.trim()) return alert("Nomor WhatsApp wajib diisi");
    if (cart.length === 0) return alert("Keranjang kosong");
    setSubmitting(true);
    try {
      const res: SubmitOrderResult | null = await submitOrder(store!.store_id, {
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        items: cart, subtotal: cartTotal, discount: 0, promoCode: "",
        handlingFee: 0, total: cartTotal,
        paymentMethod: payment, pickupTime: "Segera", branch: "Pusat", notes: "",
      });
      setLastInv(res?.invoice ?? "");
      setLastWa(res?.whatsappUrl ?? "");
      clearCart(); setCartOpen(false); setCheckoutView(false); setSuccess(true);
      if (res?.whatsappUrl) window.open(res.whatsappUrl, "_blank");
    } catch (e: any) {
      alert("Gagal: " + (e.message ?? "Coba lagi"));
    }
    setSubmitting(false);
  };

  /* ── history ── */
  const searchOrders = async () => {
    if (!histPhone.trim()) return;
    setOrdLoading(true);
    try {
      const data = await getOrders(store!.store_id, histPhone.trim());
      setOrders(data ?? []);
    } catch { alert("Gagal memuat"); }
    setOrdLoading(false);
  };

  const cancelOrd = async (oid: number) => {
    if (!confirm("Yakin batalkan?")) return;
    await cancelOrder(store!.store_id, oid, histPhone.trim());
    searchOrders();
  };

  /* ── filter ── */
  const filtered = products.filter((p) => {
    if (category !== "Semua" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const favProducts = products.filter((p) => favIds.includes(p.product_id));
  const isOpen = store?.is_active ?? false;

  /* ── loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── not found ── */
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
        <div>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center text-3xl">T</div>
          <h1 className="text-xl font-extrabold text-text-primary">Toko Tidak Ditemukan</h1>
          <p className="text-text-tertiary text-sm mt-2">Link <b className="text-text-secondary">{slug}</b> tidak aktif.</p>
        </div>
      </div>
    );
  }

  /* ── success view ── */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-sm">
          <div className="mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" className="mx-auto">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">Pesanan Berhasil!</h1>
          <p className="text-lg font-extrabold text-primary mt-1">#{lastInv}</p>
          <p className="text-text-secondary text-sm mt-2">Pesanan Anda sedang diproses.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setSuccess(false); setTab("home"); }} className="flex-1 border-[1.5px] border-divider rounded-[14px] py-3.5 text-sm font-semibold text-text-secondary active:bg-background transition-colors">
              Kembali
            </button>
            <button onClick={() => { setHistPhone(custPhone); setSuccess(false); setTab("history"); }} className="flex-1 bg-primary text-white rounded-[14px] py-3.5 text-sm font-bold active:opacity-90 active:scale-[0.98] transition-all">
              Lacak Pesanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24 max-w-[480px] mx-auto">
      {/* ═══════ HEADER (match Flutter StorefrontScreen header) ═══════ */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-lg border-b border-divider">
        <div className="flex items-start gap-3 px-3 py-3">
          {/* Logo avatar — gradient N */}
          <div className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #E40000, #B80000)", boxShadow: "0 4px 8px rgba(228,0,0,.3)" }}>
            <span className="text-white text-[22px] font-extrabold">N</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-text-primary truncate">{store.store_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-[7px] h-[7px] rounded-full ${isOpen ? "bg-success" : "bg-error"}`} />
              <span className="text-[11px] text-text-tertiary">{isOpen ? "Buka" : "Tutup"} · Online Order</span>
            </div>
            {store.address && <p className="text-[11px] text-text-tertiary truncate mt-0.5">{store.address}</p>}
          </div>
          {/* Cart icon button */}
          <button onClick={() => setCartOpen(true)} className="relative w-11 h-11 rounded-[14px] bg-input-fill flex items-center justify-center flex-shrink-0 active:scale-95 active:bg-divider transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ═══════ SEARCH ═══════ */}
      {tab === "home" && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 h-11 bg-input-fill rounded-[14px] px-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef} type="text" placeholder="Cari menu..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>
      )}

      {/* ═══════ CATEGORY CHIPS (match Flutter FilterChip) ═══════ */}
      {tab === "home" && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-none">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-[18px] py-[9px] rounded-full text-[13px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                category === c
                  ? "bg-primary text-white border-primary shadow-[0_2px_8px_rgba(228,0,0,.25)]"
                  : "bg-surface text-text-secondary border border-divider"
              }`}
              style={{ borderWidth: category === c ? "0px" : "1px" }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ═══════ PRODUCT GRID (match Flutter 2-column GridView) ═══════ */}
      <div className="px-3 pt-1">
        {tab === "home" && (
          filtered.length === 0 ? (
            <div className="text-center py-12">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1" opacity=".5" className="mx-auto mb-3"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="8" y1="2" x2="8" y2="22"/></svg>
              <p className="text-sm font-semibold text-text-secondary">Belum ada produk</p>
              <p className="text-xs text-text-tertiary mt-1">Produk akan muncul di sini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.product_id} product={p}
                  onAddToCart={addToCart}
                  cartQty={cart.find((c) => c.product_id === p.product_id)?.qty ?? 0}
                  onDecrement={(pid) => decCart(pid)}
                  onIncrement={(pid) => addToCart(p)}
                  isFav={favIds.includes(p.product_id)}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )
        )}

        {/* FAVORITES */}
        {tab === "favorites" && (
          favProducts.length === 0 ? (
            <div className="text-center py-12">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1" opacity=".5" className="mx-auto mb-3"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              <p className="text-sm font-semibold text-text-secondary">Belum ada favorit</p>
              <p className="text-xs text-text-tertiary mt-1">Tap hati di produk untuk menambahkan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {favProducts.map((p) => (
                <ProductCard
                  key={p.product_id} product={p}
                  onAddToCart={addToCart}
                  cartQty={cart.find((c) => c.product_id === p.product_id)?.qty ?? 0}
                  onDecrement={(pid) => decCart(pid)}
                  onIncrement={(pid) => addToCart(p)}
                  isFav={true} onToggleFav={toggleFav}
                />
              ))}
            </div>
          )
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <>
            <div className="bg-surface rounded-lg p-4 border border-divider mb-3">
              <p className="text-xs font-bold text-text-secondary mb-2">NOMOR WHATSAPP</p>
              <div className="flex gap-2">
                <input
                  placeholder="0812-3456-7890" value={histPhone}
                  onChange={(e) => setHistPhone(e.target.value)}
                  className="flex-1 px-3 h-11 rounded-[10px] border border-divider text-sm text-text-primary outline-none focus:border-primary transition-colors"
                />
                <button onClick={searchOrders} disabled={ordLoading} className="bg-primary text-white text-sm font-bold px-5 h-11 rounded-[10px] active:opacity-90 disabled:opacity-50 transition-all">
                  {ordLoading ? "..." : "Cari"}
                </button>
              </div>
            </div>

            {orders.length === 0 && histPhone && !ordLoading && (
              <div className="text-center py-10">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1" opacity=".5" className="mx-auto mb-3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
                <p className="text-sm font-semibold text-text-secondary">Tidak ada pesanan</p>
              </div>
            )}

            {orders.length > 0 && (
              <div className="space-y-2.5">
                {orders.map((o) => {
                  const items = (o.items ?? []) as any[];
                  return (
                    <div key={o.id} className="bg-surface p-4 rounded-[14px] border border-divider">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-text-tertiary font-bold">#{o.invoice}</p>
                          <p className="text-sm font-semibold text-text-primary mt-1">{items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          o.status === "Online Baru" ? "bg-info/10 text-info" :
                          o.status === "Disiapkan" || o.status === "Siap Diambil" ? "bg-warning/10 text-warning" :
                          o.status === "Lunas" ? "bg-success/10 text-success" :
                          "bg-error/10 text-error"
                        }`}>{o.status}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-text-secondary">{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</p>
                          <p className="text-xs text-text-secondary font-medium mt-0.5">{o.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-primary">{formatRupiah(o.total)}</p>
                          {o.status === "Online Baru" && (
                            <button onClick={() => cancelOrd(o.id)} className="text-xs text-error font-bold mt-1 hover:underline">Batalkan</button>
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

      {/* ═══════ CART BAR (match Flutter _buildCartBar) ═══════ */}
      {cartCount > 0 && tab === "home" && !cartOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 z-40 max-w-[480px] mx-auto px-3">
          <button onClick={() => setCartOpen(true)} className="w-full flex items-center px-[18px] py-[14px] rounded-xl shadow-bar active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(90deg, #E40000, #B80000)" }}>
            <div className="flex-1 text-left">
              <p className="text-xs text-white/85">{cartCount} item</p>
              <p className="text-xl font-extrabold text-white tracking-[-0.5px]">{formatRupiah(cartTotal)}</p>
            </div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" className="mr-2"><path d="M6 9l6 6 6-6"/></svg>
            <span className="bg-white text-primary text-[15px] font-bold px-7 py-[14px] rounded-[14px] active:scale-95 transition-transform">Bayar</span>
          </button>
        </div>
      )}

      {/* ═══════ BOTTOM NAV ═══════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-[480px] mx-auto bg-surface/95 backdrop-blur-xl border-t border-divider flex">
        {([
          { id: "home" as const, label: "Beranda", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { id: "favorites" as const, label: "Favorit", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
          { id: "history" as const, label: "Riwayat", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
        ]).map(({ id, label, svg }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setCartOpen(false); }}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${tab === id ? "text-primary" : "text-text-tertiary"}`}
          >
            {svg}
            <span className="text-[11px] font-semibold mt-0.5">{label}</span>
            {tab === id && <div className="w-5 h-[3px] rounded-full bg-primary mt-1" />}
            {tab !== id && <div className="w-5 h-[3px] mt-1" />}
          </button>
        ))}
      </nav>

      {/* ═══════ CART SHEET ═══════ */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm animate-fade-in" onClick={() => { setCartOpen(false); setCheckoutView(false); }} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-w-[480px] mx-auto animate-slide-up">
            <div className="bg-surface rounded-t-xl max-h-[82dvh] flex flex-col shadow-2xl">
              {/* Handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-divider" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2">
                <h2 className="text-base font-bold text-text-primary">Keranjang</h2>
                {cart.length > 0 && <button onClick={clearCart} className="text-[13px] font-semibold text-primary">Kosongkan</button>}
              </div>

              <div className="flex-1 overflow-y-auto px-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1" opacity=".5" className="mx-auto mb-3"><path d="M4 4h16l1.33 13.34A2 2 0 0119.34 20H4.66a2 2 0 01-1.99-2.34L4 4z"/><path d="M9 4V2h6v2"/></svg>
                    <p className="text-sm font-semibold text-text-secondary">Keranjang masih kosong</p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex items-center gap-0 p-3 rounded-[14px] border border-border bg-surface">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{formatRupiah(item.price)}</p>
                        </div>
                        {/* Qty stepper (match _CartItemTile / storefront cart) */}
                        <div className="flex items-center h-8 border border-divider rounded-[10px] bg-background flex-shrink-0">
                          <button onClick={() => decCart(item.product_id)} className="w-[30px] h-8 flex items-center justify-center text-text-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                          </button>
                          <span className="text-[13px] font-bold text-text-primary">{item.qty}</span>
                          <button onClick={() => addToCart({ product_id: item.product_id, name: item.name, price: item.price } as OnlineProduct)} className="w-[30px] h-8 flex items-center justify-center text-text-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-primary ml-2 min-w-[70px] text-right">{formatRupiah(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="border-t border-divider bg-background px-4 py-3">
                  {!checkoutView ? (
                    <>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-semibold text-text-secondary">{cartCount} item</span>
                        <span className="text-base font-extrabold text-primary">{formatRupiah(cartTotal)}</span>
                      </div>
                      <button onClick={() => setCheckoutView(true)} className="w-full bg-primary text-white rounded-[14px] py-3.5 text-[15px] font-bold active:opacity-90 active:scale-[0.98] transition-all">
                        Lanjutkan Pesanan
                      </button>
                    </>
                  ) : (
                    /* Checkout form (match Flutter _showCheckoutSheet) */
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pb-2">
                      <p className="text-lg font-bold text-text-primary">Selesaikan Pembayaran</p>
                      <p className="text-[32px] font-extrabold text-primary tracking-[-1px]">{formatRupiah(cartTotal)}</p>

                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">DATA PEMESAN</p>
                      <div className="flex items-center gap-2 bg-input-fill border border-divider rounded-md px-3 h-[50px]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Nama Anda" className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary" />
                      </div>
                      <div className="flex items-center gap-2 bg-input-fill border border-divider rounded-md px-3 h-[50px]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                        <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="0812-3456-7890" type="tel" className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary" />
                      </div>

                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">METODE PEMBAYARAN</p>
                      <div className="flex gap-2">
                        {["Tunai", "QRIS", "Transfer"].map((m) => {
                          const icons: Record<string, JSX.Element> = {
                            Tunai: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="12" x2="6.01" y2="12"/></svg>,
                            QRIS: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01"/></svg>,
                            Transfer: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
                          };
                          return (
                            <button
                              key={m}
                              onClick={() => setPayment(m)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] border-2 text-[13px] font-bold transition-all active:scale-95 ${
                                payment === m ? "border-primary bg-primary-soft text-primary" : "border-divider bg-surface text-text-secondary"
                              }`}
                            >
                              {icons[m]} {m}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => setCheckoutView(false)} className="flex-1 border-[1.5px] border-divider rounded-[14px] py-3.5 text-[15px] font-semibold text-text-secondary active:bg-background transition-colors">
                          Kembali
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-primary text-white rounded-[14px] py-3.5 text-[15px] font-bold active:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                          {submitting ? "Mengirim..." : "Pesan Sekarang"}
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
