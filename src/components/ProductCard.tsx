"use client";

import { OnlineProduct, formatRupiah } from "@/lib/supabase";

interface ProductCardProps {
  product: OnlineProduct;
  onAddToCart: (product: OnlineProduct) => void;
  cartQty?: number;
  onDecrement?: (productId: number) => void;
  onIncrement?: (productId: number) => void;
  isFav?: boolean;
  onToggleFav?: (productId: number) => void;
}

const CAT_GRAD: Record<string, [string, string]> = {
  Makanan: ["#FEF3C7", "#FDE68A"],
  Minuman: ["#DBEAFE", "#BFDBFE"],
  Sembako: ["#FEE2E2", "#FECACA"],
  Lainnya: ["#F3E8FF", "#E9D5FF"],
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.length >= 2 ? name.substring(0, 2).toUpperCase() : "??";
}

export default function ProductCard({
  product, onAddToCart, cartQty = 0,
  onDecrement, onIncrement,
  isFav = false, onToggleFav,
}: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const grad = CAT_GRAD[product.category] ?? CAT_GRAD.Lainnya;
  const hasQty = cartQty > 0;

  return (
    <div
      onClick={() => { if (!outOfStock && cartQty === 0) onAddToCart(product); }}
      className="group bg-surface rounded-lg border border-divider p-[10px] flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
      style={{ boxShadow: "0 3px 10px rgba(0,0,0,.08)" }}
    >
      {/* ── Image area ── */}
      <div className="relative aspect-square rounded-sm overflow-hidden">
        {/* Real product image, fallback to gradient placeholder */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Hide broken image, show gradient fallback
              (e.target as HTMLImageElement).style.display = "none";
              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="w-full h-full items-center justify-center"
          style={{ display: product.image_url ? "none" : "flex", background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
        >
          <span className="text-[28px] font-extrabold text-white tracking-wider select-none">
            {initials(product.name)}
          </span>
        </div>

        {/* Stock badge — top left (exact Flutter style) */}
        <span
          className="absolute top-[6px] left-[6px] px-[7px] py-[3px] rounded-full text-[10px] font-bold z-[2]"
          style={{
            background: outOfStock ? "#FEE2E2" : lowStock ? "#FEF3C7" : "rgba(255,255,255,.92)",
            color: outOfStock ? "#DC2626" : lowStock ? "#D97706" : "var(--primary)",
          }}
        >
          {outOfStock ? "Habis" : `${product.stock}x`}
        </span>

        {/* Out of stock overlay */}
        {outOfStock && <div className="absolute inset-0 bg-white/40" />}

        {/* Wishlist button — top right */}
        {onToggleFav && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(product.product_id); }}
            className="absolute top-[6px] right-[6px] w-[30px] h-[30px] rounded-full flex items-center justify-center cursor-pointer z-[2]"
            style={{ background: isFav ? "var(--primary)" : "rgba(0,0,0,.25)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#fff" : "none"} stroke="#fff" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Name ── */}
      <p
        className={`mt-2 text-[13px] font-bold leading-[1.25] line-clamp-2 ${outOfStock ? "text-text-tertiary" : "text-text-primary"}`}
      >
        {product.name}
      </p>

      {/* ── Category ── */}
      <p className="text-[11px] text-text-tertiary mt-0.5">{product.category}</p>

      {/* ── Price — harga coret jika ada diskon ── */}
      <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-[14px] font-extrabold" style={{ color: "var(--primary)" }}>
          {formatRupiah(product.price)}
        </span>
        {product.original_price != null && product.original_price > product.price && (
          <span className="text-[11px] font-semibold line-through text-text-tertiary">
            {formatRupiah(product.original_price)}
          </span>
        )}
      </div>

      {/* ── Action ── */}
      <div className="mt-2">
        {outOfStock ? (
          <div className="w-full h-9 rounded-[10px] bg-input-fill flex items-center justify-center text-xs font-bold text-text-tertiary">
            Stok Habis
          </div>
        ) : hasQty && onDecrement && onIncrement ? (
          /* NusaQtyStepper */
          <div
            className="flex items-center w-full h-9 rounded-[10px] overflow-hidden"
            style={{ background: "var(--primary-soft)", border: "1.2px solid color-mix(in srgb, var(--primary) 50%, transparent)" }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onDecrement(product.product_id); }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors hover:bg-primary/10"
              style={{ color: "var(--primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
            </button>
            <span className="flex-1 text-center text-[14px] font-extrabold" style={{ color: "var(--primary)" }}>{cartQty}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onIncrement(product.product_id); }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors hover:bg-primary/10"
              style={{ color: "var(--primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        ) : (
          /* NusaAddButton */
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full h-9 rounded-[10px] text-white flex items-center justify-center gap-1 text-[13.5px] font-bold active:opacity-85 active:scale-[0.97] transition-all"
            style={{ background: "var(--primary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Tambah
          </button>
        )}
      </div>
    </div>
  );
}
