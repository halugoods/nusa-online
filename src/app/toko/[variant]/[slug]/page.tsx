"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getStoreByVariantSlugOrLegacy, getProducts, submitOrder, formatRupiah,
  CartItem, OnlineProduct, StoreSettings, getOrders, cancelOrder,
  OnlineOrder, getStoreTheme, normalizePhoneTo08, getPaymentMethods,
  getOrderTypes, getPickupOptions, getMemberSettings, getBranches, getPromos,
  getCustomer, PaymentMethod, SubmitOrderInput, Promo, Branch, OnlineCustomer,
  formatWA, memberLevelOf, tierDiscountPercent,
} from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

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

// ── Profil tersimpan otomatis (tanpa Google Client ID — pilihan user) ──
// Pembeli isi nama + WA sekali → localStorage nusa_online_profile →
// kunjungan berikut langsung terisi; "ganti profil" untuk edit ulang.
const PROFILE_KEY = "nusa_online_profile";
function loadProfile(): { name: string; phone: string } {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"name":"","phone":""}'); } catch { return { name: "", phone: "" }; }
}
function saveProfile(name: string, phone: string) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone })); } catch {}
}

export default function StorePage({ params }: { params: { variant: string; slug: string } }) {
  const { variant, slug } = params;

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"home" | "favorites" | "history" | "member">("home");

  /* cart */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutView, setCheckoutView] = useState(false);

  /* checkout */
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [orderType, setOrderType] = useState("Ambil Sendiri");
  const [pickupTime, setPickupTime] = useState("Segera");
  const [branch, setBranch] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* promo + poin */
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [customer, setCustomer] = useState<OnlineCustomer | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsError, setPointsError] = useState("");

  /* config */
  const [payMethods, setPayMethods] = useState<PaymentMethod[]>([]);
  const [orderTypes, setOrderTypes] = useState<string[]>(["Ambil Sendiri", "Delivery"]);
  const [pickupOptions, setPickupOptions] = useState<string[]>(["Segera"]);
  const [branches, setBranches] = useState<Branch[]>([]);

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

  // Referral: ?ref=<phone> → dipakai sekali untuk order pertama customer baru.
  const refPhone = useRef("");
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      refPhone.current = normalizePhoneTo08(q.get("ref") || "");
    } catch {}
  }, []);

  // Load store + config + auto-fill profil tersimpan.
  useEffect(() => {
    if (!variant || !slug) return;
    getStoreByVariantSlugOrLegacy(variant, slug).then((s) => {
      if (!s) { setLoading(false); return; }
      setStore(s);
      setPayMethods(getPaymentMethods(s));
      setOrderTypes(getOrderTypes(s));
      setPickupOptions(getPickupOptions(s));
      setPayment(getPaymentMethods(s)[0] ?? null);
      setOrderType(getOrderTypes(s)[0] ?? "Ambil Sendiri");
      setPickupTime(getPickupOptions(s)[0] ?? "Segera");
      // Profil tersimpan → isi otomatis
      const prof = loadProfile();
      if (prof.name) setCustName(prof.name);
      if (prof.phone) {
        setCustPhone(prof.phone);
        setHistPhone(prof.phone);
      }
      getProducts(s.store_id).then((p) => {
        setProducts(p ?? []);
        const cats = Array.from(new Set((p ?? []).map((x) => x.category).filter(Boolean))) as string[];
        setCategories(["Semua", ...cats]);
        setLoading(false);
      });
      getBranches(s.store_id).then((b) => {
        setBranches(b ?? []);
        if ((b ?? []).length > 0) setBranch((b ?? [])[0].name);
      });
      getPromos(s.store_id).then((pr) => setPromos(pr ?? []));
      // Load member kalau nomor sudah tersimpan
      if (prof.phone) {
        getCustomer(s.store_id, prof.phone).then((c) => setCustomer(c));
      }
    });
  }, [variant, slug]);

  const theme = getStoreTheme(store);
  const isOpen = store?.is_active ?? false;

  /* ── member settings ── */
  const member = getMemberSettings(store ?? undefined);
  const pointEarnPercent = member.pointEarnPercent ?? 0;
  const pointRate = member.pointExchangeRate ?? 1000; // Rp per poin saat tukar
  const minRedeem = member.minRedeem ?? 500;
  const pointsWorth = Math.floor((customer?.points ?? 0) * (pointRate || 1));

  /* ── progress tier member (Gold/Platinum dari konfigurasi app) ── */
  const goldMin = member.goldMin ?? 1000;
  const platinumMin = member.platinumMin ?? 5000;
  const memberLevelNow = memberLevelOf(customer?.points ?? 0, { goldMin, platinumMin });
  // Progress bar: 0 → goldMin → platinumMin (Silver/Gold), 100% saat Platinum.
  const memberProgressPercent = memberLevelNow === "Platinum"
    ? 100
    : memberLevelNow === "Gold"
      ? Math.min(100, ((customer?.points ?? 0) / platinumMin) * 100)
      : Math.min(100, ((customer?.points ?? 0) / goldMin) * 100);
  const memberProgressLabel = customer
    ? memberLevelNow === "Platinum"
      ? "Level tertinggi — nikmati diskon member"
      : memberLevelNow === "Gold"
        ? `${platinumMin - (customer?.points ?? 0)} poin lagi ke Platinum`
        : `${goldMin - (customer?.points ?? 0)} poin lagi ke Gold`
    : "";

  // Link ajak teman (referral) — ?ref=<no WA customer>.
  const refLink = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(customer?.phone || "")}`
    : "";

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

  const clearCart = () => { setCart([]); setPromo(null); setPromoCode(""); setUsePoints(false); setPointsError(""); };

  const toggleFav = useCallback((pid: number) => {
    setFavIds((prev) => {
      const next = prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid];
      saveFavs(next);
      return next;
    });
  }, []);

  /* ── promo validation (quota, periode, minSpend, limitPerUser) ── */
  const applyPromo = (code: string) => {
    setPromoCode(code);
    setPromoErr("");
    const c = code.trim().toLowerCase();
    if (!c) { setPromo(null); return; }
    const found = promos.find((p) => p.code.toLowerCase() === c);
    if (!found) { setPromo(null); setPromoErr("Kode promo tidak ditemukan"); return; }
    if (found.quota != null && found.quota <= 0) { setPromo(null); setPromoErr("Kuota promo habis"); return; }
    if (found.start_date && new Date(found.start_date) > new Date()) { setPromo(null); setPromoErr("Promo belum mulai"); return; }
    if (found.end_date && new Date(found.end_date) < new Date()) { setPromo(null); setPromoErr("Promo sudah berakhir"); return; }
    if (cartTotal < found.min_spend) { setPromo(null); setPromoErr(`Min. belanja ${formatRupiah(found.min_spend)}`); return; }
    if (customer && found.limit_per_user) {
      const used = (customer.promo_history ?? []).filter((h) => h.promo_id === found.id).length;
      if (used >= found.limit_per_user) { setPromo(null); setPromoErr("Kode sudah dipakai limit Anda"); return; }
    }
    setPromo(found);
  };

  const promoDiscount = promo
    ? promo.type === "persen"
      ? Math.floor(cartTotal * promo.value / 100)
      : Math.min(promo.value, cartTotal)
    : 0;

  /* ── poin ── */
  const redeemable = Math.min(
    Math.floor((customer?.points ?? 0)),
    pointsWorth >= minRedeem ? Math.floor(cartTotal / (pointRate || 1)) : 0
  );
  const usedPointsVal = usePoints ? Math.max(0, redeemable) : 0;
  const pointsDiscount = usedPointsVal * (pointRate || 1);

  /* ── diskon tier member (Gold/Platinum otomatis) ── */
  const memberLevel = memberLevelOf(customer?.points ?? 0, {
    goldMin: member.goldMin,
    platinumMin: member.platinumMin,
  });
  const tierPercent = tierDiscountPercent(memberLevel, {
    goldPercent: member.goldPercent,
    platinumPercent: member.platinumPercent,
  });
  const tierDiscount = customer && tierPercent > 0
    ? Math.floor((cartTotal - promoDiscount - pointsDiscount) * tierPercent / 100)
    : 0;

  /* ── delivery ongkir ── */
  const deliveryFee = orderType === "Delivery" ? (store?.delivery_fee ?? 0) : 0;
  const handlingFee = payment?.handling_fee ?? 0;
  const grandTotal = Math.max(0, cartTotal - promoDiscount - pointsDiscount - tierDiscount + deliveryFee + handlingFee);

  /* ── order ── */
  const handleSubmit = async () => {
    if (!custName.trim()) return alert("Nama wajib diisi");
    const normPhone = normalizePhoneTo08(custPhone);
    if (!normPhone) return alert("Nomor WhatsApp wajib diisi");
    if (cart.length === 0) return alert("Keranjang kosong");
    if (branches.length > 0 && !branch) return alert("Pilih cabang dulu");
    // Simpan profil otomatis
    saveProfile(custName.trim(), normPhone);
    setSubmitting(true);
    try {
      const input: SubmitOrderInput = {
        customerName: custName.trim(),
        customerPhone: normPhone,
        items: cart,
        subtotal: cartTotal,
        discount: 0,
        promoCode: promo?.code ?? "",
        handlingFee: handlingFee,
        total: grandTotal,
        paymentMethod: payment?.name ?? "Tunai",
        pickupTime: orderType === "Delivery" ? (pickupTime === "Segera" ? "Segera (Delivery)" : pickupTime) : pickupTime,
        branch: branches.length > 0 ? branch : "Pusat",
        notes: notes,
        orderType,
        usedPoints: usedPointsVal,
        usedPromoId: promo?.id ?? null,
        promoDiscount,
        referredBy: refPhone.current,
      };
      const res = await submitOrder(store!.store_id, input);
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
    const p = normalizePhoneTo08(histPhone);
    if (!p) return;
    setOrdLoading(true);
    try {
      const data = await getOrders(store!.store_id, p);
      setOrders(data ?? []);
    } catch { alert("Gagal memuat"); }
    setOrdLoading(false);
  };

  const cancelOrd = async (oid: number) => {
    if (!confirm("Yakin batalkan?")) return;
    await cancelOrder(store!.store_id, oid, histPhone);
    searchOrders();
  };

  /* ── filter ── */
  const filtered = products.filter((p) => {
    if (category !== "Semua" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const favProducts = products.filter((p) => favIds.includes(p.product_id));

  const cssVars = {
    "--primary": theme.primary,
    "--primary-dark": theme.dark,
    "--primary-soft": theme.soft,
  } as React.CSSProperties;

  /* ── loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" style={{ borderTopColor: theme.primary }} />
      </div>
    );
  }

  /* ── not found ── */
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
        <div>
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center text-3xl text-white font-extrabold"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}>N</div>
          <h1 className="text-xl font-extrabold text-text-primary">Toko Tidak Ditemukan</h1>
          <p className="text-text-tertiary text-sm mt-2">
            Link <b className="text-text-secondary">{variant}/{slug}</b> tidak aktif atau belum dibuat.
          </p>
          <button
            onClick={() => window.location.href = "/"}
            className="mt-6 px-6 py-3 rounded-[14px] text-white text-sm font-bold active:opacity-90 transition-all"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}
          >Kembali ke NUSA</button>
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
          <p className="text-lg font-extrabold mt-1" style={{ color: theme.primary }}>#{lastInv}</p>
          <p className="text-text-secondary text-sm mt-2">
            {payment?.name && !String(payment?.name).toLowerCase().includes("tunai")
              ? "Pesanan Anda menunggu verifikasi pembayaran. Kirim bukti via WhatsApp ke toko."
              : "Pesanan Anda sedang diproses."}
          </p>
          {lastWa && (
            <a href={lastWa} target="_blank" rel="noreferrer"
              className="block mt-3 text-white rounded-[14px] py-3.5 text-sm font-bold active:opacity-90"
              style={{ background: `linear-gradient(135deg, #10B981, #059669)` }}>
              Kirim Bukti via WhatsApp
            </a>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setSuccess(false); setTab("home"); }} className="flex-1 border-[1.5px] border-divider rounded-[14px] py-3.5 text-sm font-semibold text-text-secondary active:bg-background transition-colors">
              Kembali
            </button>
            <button onClick={() => { setHistPhone(custPhone); setSuccess(false); setTab("history"); }} className="flex-1 text-white rounded-[14px] py-3.5 text-sm font-bold active:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}>
              Lacak Pesanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-24 max-w-[480px] mx-auto" style={cssVars}>
      {/* ═══════ HEADER (match Flutter StorefrontScreen header) ═══════ */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-lg border-b border-divider">
        <div className="flex items-start gap-3 px-3 py-3">
          {/* Logo avatar — gradient N (fallback bila logo_url kosong) */}
          {store.logo_url ? (
            <img src={store.logo_url} alt="logo" className="w-11 h-11 rounded-md object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})`, boxShadow: `0 4px 8px ${theme.primary}40` }}>
              <span className="text-white text-[22px] font-extrabold">N</span>
            </div>
          )}
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
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center px-1"
                style={{ background: theme.primary }}>
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

      {/* ═══════ CATEGORY CHIPS (dinamis dari kategori produk asli) ═══════ */}
      {tab === "home" && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-[18px] py-[9px] rounded-full text-[13px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                category === c
                  ? "text-white"
                  : "bg-surface text-text-secondary border border-divider"
              }`}
              style={category === c ? { background: theme.primary, boxShadow: `0 2px 8px ${theme.primary}40` } : undefined}
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
                  className="flex-1 px-3 h-11 rounded-[10px] border border-divider text-sm text-text-primary outline-none focus:border-[var(--primary)] transition-colors"
                />
                <button onClick={searchOrders} disabled={ordLoading}
                  className="text-white text-sm font-bold px-5 h-11 rounded-[10px] active:opacity-90 disabled:opacity-50 transition-all"
                  style={{ background: theme.primary }}>
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
                          o.status === "Menunggu Verifikasi Pembeli" ? "bg-warning/10 text-warning" :
                          o.status === "Disiapkan" || o.status === "Siap Diambil" ? "bg-warning/10 text-warning" :
                          o.status === "Lunas" ? "bg-success/10 text-success" :
                          "bg-error/10 text-error"
                        }`}>{o.status}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-text-secondary">{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</p>
                          <p className="text-xs text-text-secondary font-medium mt-0.5">{o.payment_method}{o.order_type ? ` · ${o.order_type}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold" style={{ color: theme.primary }}>{formatRupiah(o.total)}</p>
                          {(o.status === "Online Baru" || o.status === "Menunggu Verifikasi Pembeli") && (
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

        {/* MEMBER */}
        {tab === "member" && (
          <>
            {/* Profil member: poin + level + progress tier */}
            {customer ? (
              <div className="space-y-3">
                <div className="rounded-[18px] p-4 text-white relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}>
                  <p className="text-[11px] font-bold text-white/80 tracking-[.5px]">MEMBER NUSA</p>
                  <p className="text-lg font-extrabold mt-1">{customer.name}</p>
                  <p className="text-[11px] text-white/80">{customer.phone}</p>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="text-3xl font-black">{customer.points}</p>
                      <p className="text-[11px] text-white/80">poin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-white/80">LEVEL</p>
                      <p className="text-base font-extrabold">{customer.level}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full rounded-full bg-white" style={{ width: `${memberProgressPercent}%` }} />
                  </div>
                  <p className="text-[11px] text-white/85 mt-1.5">{memberProgressLabel}</p>
                </div>

                {/* Info tier */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { lvl: "Silver", min: 0, pct: 0 },
                    { lvl: "Gold", min: goldMin, pct: member.goldPercent ?? 2 },
                    { lvl: "Platinum", min: platinumMin, pct: member.platinumPercent ?? 5 },
                  ].map((t) => (
                    <div key={t.lvl} className={`rounded-[14px] border p-3 ${customer.level === t.lvl ? "border-[var(--primary)]" : "border-divider"}`}
                      style={customer.level === t.lvl ? { background: theme.soft } : undefined}>
                      <p className={`text-[13px] font-extrabold ${customer.level === t.lvl ? "" : "text-text-secondary"}`}
                        style={customer.level === t.lvl ? { color: theme.dark } : undefined}>{t.lvl}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{t.min === 0 ? "Mulai" : `${t.min.toLocaleString("id-ID")}+ poin`}</p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: theme.primary }}>Diskon {t.pct}%</p>
                    </div>
                  ))}
                </div>

                {/* Kupon saya (dipakai via promo_history) */}
                <p className="text-[11px] font-bold text-text-secondary tracking-[.5px] pt-1">KUPON SAYA</p>
                {promos.length === 0 ? (
                  <div className="text-center py-8 bg-surface rounded-[14px] border border-divider">
                    <p className="text-sm font-semibold text-text-secondary">Belum ada kupon</p>
                    <p className="text-xs text-text-tertiary mt-1">Toko belum menambahkan promo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {promos.map((pr) => {
                      const usedCount = (customer.promo_history ?? []).filter((h: any) => h.promo_id === pr.id).length;
                      const usedUp = pr.limit_per_user ? usedCount >= pr.limit_per_user : false;
                      const expired = pr.end_date && new Date(pr.end_date) < new Date();
                      return (
                        <div key={pr.id} className={`bg-surface p-3.5 rounded-[14px] border ${usedUp || expired ? "border-divider opacity-60" : "border-[var(--primary)]"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-extrabold" style={{ color: usedUp || expired ? undefined : theme.primary }}>{pr.code}</p>
                              <p className="text-[11px] text-text-secondary mt-0.5">{pr.title}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[13px] font-extrabold text-text-primary">{pr.type === "persen" ? `-${pr.value}%` : `-${formatRupiah(pr.value)}`}</p>
                              <p className="text-[10px] text-text-tertiary mt-0.5">
                                {expired ? "Kadaluarsa" : usedUp ? `Sudah dipakai ${usedCount}x` : `Min. ${formatRupiah(pr.min_spend)}`}
                              </p>
                            </div>
                          </div>
                          {!usedUp && !expired && (
                            <button onClick={() => { setPromoCode(pr.code); applyPromo(pr.code); setTab("home"); }}
                              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white active:opacity-90 transition-all"
                              style={{ background: theme.primary }}>
                              Pakai kupon ini
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ajak teman (referral) */}
                <div className="rounded-[14px] border border-divider bg-surface p-3.5">
                  <p className="text-[12px] font-extrabold text-text-primary">Ajak Teman</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">Bagikan link ini — teman dapat diskon/poin referral saat belanja pertama.</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 bg-input-fill border border-divider rounded-[10px] px-3 py-2.5 overflow-hidden">
                      <p className="text-[11px] text-text-tertiary truncate">{refLink}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard?.writeText(refLink); alert("Link referral disalin!"); }}
                      className="text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px] active:opacity-90 transition-all"
                      style={{ background: theme.primary }}>
                      Salin
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1" opacity=".5" className="mx-auto mb-3"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <p className="text-sm font-semibold text-text-secondary">Belum jadi member</p>
                <p className="text-xs text-text-tertiary mt-1">Masukkan nomor WhatsApp di form pemesanan untuk mulai mengumpulkan poin.</p>
                <button onClick={() => { setCheckoutView(true); setCartOpen(true); setTab("home"); }}
                  className="mt-4 text-white text-sm font-bold px-6 py-3 rounded-[14px] active:opacity-90 transition-all"
                  style={{ background: theme.primary }}>
                  Mulai Belanja
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════ CART BAR (match Flutter _buildCartBar) ═══════ */}
      {cartCount > 0 && tab === "home" && !cartOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 z-40 max-w-[480px] mx-auto px-3">
          <button onClick={() => setCartOpen(true)} className="w-full flex items-center px-[18px] py-[14px] rounded-xl shadow-bar active:scale-[0.98] transition-all"
            style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.dark})` }}>
            <div className="flex-1 text-left">
              <p className="text-xs text-white/85">{cartCount} item</p>
              <p className="text-xl font-extrabold text-white tracking-[-0.5px]">{formatRupiah(cartTotal)}</p>
            </div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" className="mr-2"><path d="M6 9l6 6 6-6"/></svg>
            <span className="text-white text-[15px] font-bold px-7 py-[14px] rounded-[14px] active:scale-95 transition-transform"
              style={{ background: "rgba(255,255,255,.18)" }}>Bayar</span>
          </button>
        </div>
      )}

      {/* ═══════ BOTTOM NAV ═══════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-[480px] mx-auto bg-surface/95 backdrop-blur-xl border-t border-divider flex">
        {([
          { id: "home" as const, label: "Beranda", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { id: "favorites" as const, label: "Favorit", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
          { id: "history" as const, label: "Riwayat", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { id: "member" as const, label: "Member", svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ]).map(({ id, label, svg }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setCartOpen(false); }}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${tab === id ? "" : "text-text-tertiary"}`}
            style={tab === id ? { color: theme.primary } : undefined}
          >
            {svg}
            <span className="text-[11px] font-semibold mt-0.5">{label}</span>
            {tab === id && <div className="w-5 h-[3px] rounded-full mt-1" style={{ background: theme.primary }} />}
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
                {cart.length > 0 && <button onClick={clearCart} className="text-[13px] font-semibold" style={{ color: theme.primary }}>Kosongkan</button>}
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
                      <div key={item.product_id} className="flex items-center gap-0 p-3 rounded-[14px] border border-border-subtle bg-surface">
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
                        <span className="text-sm font-semibold ml-2 min-w-[70px] text-right" style={{ color: theme.primary }}>{formatRupiah(item.subtotal)}</span>
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
                        <span className="text-base font-extrabold" style={{ color: theme.primary }}>{formatRupiah(cartTotal)}</span>
                      </div>
                      <button onClick={() => setCheckoutView(true)} className="w-full text-white rounded-[14px] py-3.5 text-[15px] font-bold active:opacity-90 active:scale-[0.98] transition-all"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}>
                        Lanjutkan Pesanan
                      </button>
                    </>
                  ) : (
                    /* Checkout form (match Flutter _showCheckoutSheet) */
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pb-2">
                      <p className="text-lg font-bold text-text-primary">Selesaikan Pembayaran</p>

                      {/* Ringkasan total + member */}
                      <div className="bg-surface rounded-[14px] border border-divider p-3.5">
                        <p className="text-[32px] font-extrabold tracking-[-1px]" style={{ color: theme.primary }}>{formatRupiah(grandTotal)}</p>
                        {(promoDiscount > 0 || pointsDiscount > 0 || tierDiscount > 0 || deliveryFee > 0 || handlingFee > 0) && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-[11px] text-text-tertiary">Subtotal {formatRupiah(cartTotal)}</p>
                            {promoDiscount > 0 && <p className="text-[11px] text-success">Kupon {promo?.code}: -{formatRupiah(promoDiscount)}</p>}
                            {pointsDiscount > 0 && <p className="text-[11px] text-success">Poin: -{formatRupiah(pointsDiscount)}</p>}
                            {tierDiscount > 0 && <p className="text-[11px] text-success">Diskon Member ({memberLevel} -{tierPercent}%): -{formatRupiah(tierDiscount)}</p>}
                            {deliveryFee > 0 && <p className="text-[11px] text-text-tertiary">Ongkir: +{formatRupiah(deliveryFee)}</p>}
                            {handlingFee > 0 && <p className="text-[11px] text-text-tertiary">Biaya {payment?.name}: +{formatRupiah(handlingFee)}</p>}
                          </div>
                        )}
                        {/* Profil member */}
                        {customer && (
                          <div className="mt-2 pt-2 border-t border-divider">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-text-secondary">Member · {customer.level}</p>
                              <p className="text-xs font-bold" style={{ color: theme.primary }}>{customer.points} poin</p>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-divider overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${memberProgressPercent}%`, background: theme.primary }} />
                            </div>
                            {memberProgressLabel && (
                              <p className="text-[11px] text-text-tertiary mt-1.5">{memberProgressLabel}</p>
                            )}
                            {pointEarnPercent > 0 && (
                              <p className="text-[11px] text-text-tertiary mt-1">Dapat {Math.floor(grandTotal * pointEarnPercent / 100)} poin dari pesanan ini</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* DATA PEMESAN + profil tersimpan */}
                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">DATA PEMESAN</p>
                      <div className="flex items-center gap-2 bg-input-fill border border-divider rounded-md px-3 h-[50px]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input value={custName} onChange={(e) => { setCustName(e.target.value); saveProfile(e.target.value, custPhone); }} placeholder="Nama Anda" className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary" />
                      </div>
                      <div className="flex items-center gap-2 bg-input-fill border border-divider rounded-md px-3 h-[50px]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                        <input value={custPhone} onChange={(e) => { const n = normalizePhoneTo08(e.target.value); setCustPhone(n); saveProfile(custName, n); }} placeholder="0812-3456-7890" type="tel" className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-tertiary" />
                      </div>
                      {loadProfile().name && (
                        <p className="text-[10px] text-text-tertiary -mt-1">Profil tersimpan otomatis — edit untuk ganti</p>
                      )}

                      {/* TIPE ORDER: Ambil Sendiri / Delivery */}
                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">TIPE PESANAN</p>
                      <div className="flex gap-2">
                        {orderTypes.map((t) => (
                          <button key={t} onClick={() => setOrderType(t)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] border-2 text-[13px] font-bold transition-all active:scale-95 ${
                              orderType === t ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-divider bg-surface text-text-secondary"
                            }`}
                            style={orderType === t ? { borderColor: theme.primary, background: theme.soft, color: theme.dark } : undefined}>
                            {t === "Ambil Sendiri" ? "🏪" : "🛵"} {t}
                          </button>
                        ))}
                      </div>

                      {/* CABANG (wajib pilih bila toko punya cabang) */}
                      {branches.length > 0 && (
                        <>
                          <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">PILIH CABANG</p>
                          <div className="grid grid-cols-2 gap-2">
                            {branches.map((b) => (
                              <button key={b.id} onClick={() => setBranch(b.name)}
                                className={`flex items-center gap-1.5 px-3 py-3 rounded-[14px] border-2 text-[13px] font-bold transition-all active:scale-95 ${
                                  branch === b.name ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-divider bg-surface text-text-secondary"
                                }`}
                                style={branch === b.name ? { borderColor: theme.primary, background: theme.soft, color: theme.dark } : undefined}>
                                📍 {b.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {/* JAM: pickup options (ambil) / opsional (delivery) */}
                      {orderType !== "Delivery" && (
                        <>
                          <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">JAM DIAMBIL</p>
                          <div className="flex flex-wrap gap-2">
                            {pickupOptions.map((t) => (
                              <button key={t} onClick={() => setPickupTime(t)}
                                className={`px-3.5 py-2 rounded-[10px] border text-[12px] font-bold transition-all ${
                                  pickupTime === t ? "text-white" : "border-divider bg-surface text-text-secondary"
                                }`}
                                style={pickupTime === t ? { background: theme.primary } : undefined}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {/* METODE PEMBAYARAN — dinamis dari payment_methods */}
                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">METODE PEMBAYARAN</p>
                      <div className="flex gap-2">
                        {payMethods.map((m) => (
                          <button key={m.name} onClick={() => setPayment(m)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[14px] border-2 text-[13px] font-bold transition-all active:scale-95 ${
                              payment?.name === m.name ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-divider bg-surface text-text-secondary"
                            }`}
                            style={payment?.name === m.name ? { borderColor: theme.primary, background: theme.soft, color: theme.dark } : undefined}>
                            {m.name}
                          </button>
                        ))}
                      </div>
                      {payment?.details && payment?.name.toLowerCase() !== "tunai" && (
                        <div className="bg-input-fill border border-divider rounded-[10px] px-3 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary mb-1">INSTRUKSI BAYAR — {payment.name.toUpperCase()}</p>
                          <p className="text-[12px] text-text-secondary whitespace-pre-line">{payment.details}</p>
                          {payment.qr && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={payment.qr} alt="QR" className="w-28 h-28 object-contain mt-2 mx-auto" />
                          )}
                          {payment.handling_fee ? <p className="text-[11px] text-text-tertiary mt-1">Biaya admin {formatRupiah(payment.handling_fee)}</p> : null}
                        </div>
                      )}
                      {payment?.name && payment.name.toLowerCase() !== "tunai" && (
                        <p className="text-[11px] text-warning font-semibold">
                          ⚠️ Pesanan menunggu verifikasi pembayaran — kirim bukti via WhatsApp ke toko setelah pesan.
                        </p>
                      )}

                      {/* POIN MEMBER */}
                      {customer && customer.points > 0 && pointsWorth >= minRedeem && cartTotal > 0 && (
                        <div className="bg-input-fill border border-divider rounded-[10px] px-3 py-2.5">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-[12px] font-bold text-text-secondary">Pakai Poin ({redeemable} poin)</p>
                              <p className="text-[11px] text-text-tertiary">Tukar {formatRupiah(pointsDiscount)} dari pesanan ini</p>
                            </div>
                            <input type="checkbox" checked={usePoints} onChange={(e) => {
                              setUsePoints(e.target.checked);
                              if (redeemable <= 0) { setPointsError(`Min. tukar ${minRedeem} poin`); setUsePoints(false); }
                              else setPointsError("");
                            }} className="w-5 h-5 accent-[var(--primary)]" />
                          </label>
                          {pointsError && <p className="text-[11px] text-error mt-1">{pointsError}</p>}
                        </div>
                      )}

                      {/* KUPON ONLINE */}
                      {promos.length > 0 && (
                        <div className="bg-input-fill border border-divider rounded-[10px] px-3 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary mb-1.5">KUPON / PROMO</p>
                          <div className="flex gap-2">
                            <input value={promoCode} onChange={(e) => applyPromo(e.target.value)}
                              placeholder="Masukkan kode promo"
                              className="flex-1 px-3 h-10 rounded-[10px] border border-divider text-sm text-text-primary outline-none bg-surface focus:border-[var(--primary)] transition-colors" />
                          </div>
                          {promo && <p className="text-[11px] text-success font-semibold mt-1.5">✓ {promo.title || promo.code} — hemat {formatRupiah(promoDiscount)}</p>}
                          {promoErr && <p className="text-[11px] text-error mt-1.5">{promoErr}</p>}
                        </div>
                      )}

                      {/* Catatan */}
                      <p className="text-[11px] font-bold text-text-secondary tracking-[.5px]">CATATAN (OPSIONAL)</p>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan untuk toko..."
                        rows={2}
                        className="w-full px-3 py-2.5 rounded-[10px] border border-divider text-sm text-text-primary outline-none bg-input-fill focus:border-[var(--primary)] transition-colors" />

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setCheckoutView(false)} className="flex-1 border-[1.5px] border-divider rounded-[14px] py-3.5 text-[15px] font-semibold text-text-secondary active:bg-background transition-colors">
                          Kembali
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} className="flex-1 text-white rounded-[14px] py-3.5 text-[15px] font-bold active:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                          style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.dark})` }}>
                          {submitting ? "Mengirim..." : `Bayar ${formatRupiah(grandTotal)}`}
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
