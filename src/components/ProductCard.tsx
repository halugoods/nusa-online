"use client";

import { OnlineProduct, formatRupiah } from "@/lib/supabase";

interface ProductCardProps {
  product: OnlineProduct;
  onAddToCart: (product: OnlineProduct) => void;
  isFav?: boolean;
  onToggleFav?: (productId: number) => void;
}

export default function ProductCard({ product, onAddToCart, isFav = false, onToggleFav }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = () => {
    if (outOfStock) return;
    onAddToCart(product);
  };

  const categoryColors: Record<string, string> = {
    Makanan: "from-amber-100 via-amber-50 to-yellow-50",
    Minuman: "from-blue-100 via-blue-50 to-sky-50",
    Sembako: "from-red-100 via-red-50 to-rose-50",
    Lainnya: "from-purple-100 via-purple-50 to-fuchsia-50",
  };

  const gradient = categoryColors[product.category] ?? categoryColors.Lainnya;

  return (
    <div
      className={`bg-white rounded-[20px] p-3 transition-all duration-300 cursor-pointer select-none
        active:scale-[0.97] hover:-translate-y-1 hover:scale-[1.01]
        shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06)]
        hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06),0_28px_48px_rgba(0,0,0,0.04)]
      `}
    >
      {/* ── Image Area ── */}
      <div className="relative w-full aspect-square rounded-[14px] rounded-br-[40px] mb-5 overflow-visible">
        <div
          className={`w-full h-full rounded-[14px] rounded-br-[40px] bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl opacity-40">📦</span>
          )}
        </div>

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/50 rounded-[14px] rounded-br-[40px]" />
        )}

        {/* Stock badge – top left */}
        <div className="absolute top-2 left-2 z-10">
          {outOfStock ? (
            <span className="inline-block px-2 py-0.5 bg-red-50 text-primary text-[10px] font-bold rounded-full shadow-sm">
              Habis
            </span>
          ) : lowStock ? (
            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full shadow-sm">
              Sisa {product.stock}
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 bg-white/90 text-primary text-[10px] font-bold rounded-full shadow-sm">
              {product.stock}x
            </span>
          )}
        </div>

        {/* Heart/favorite – top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav?.(product.product_id);
          }}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border-0 cursor-pointer transition-all duration-200 hover:bg-white"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 transition-all duration-300 ${isFav ? "fill-primary scale-115" : "fill-gray-300"}`}
          >
            <path d="M12 20a1 1 0 0 1-.437-.1C11.214 19.73 3 15.671 3 9a5 5 0 0 1 8.535-3.536l.465.465.465-.465A5 5 0 0 1 21 9c0 6.646-8.212 10.728-8.562 10.9A1 1 0 0 1 12 20z" />
          </svg>
        </button>

        {/* Price pill – bottom right (floats outside) */}
        <div className="absolute -bottom-3 right-3 bg-white px-4 py-1.5 rounded-full text-primary font-bold text-sm tracking-tight shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-10 whitespace-nowrap">
          {formatRupiah(product.price)}
        </div>
      </div>

      {/* ── Info ── */}
      <h3 className="text-[15px] font-semibold text-gray-900 leading-tight tracking-tight line-clamp-2 mb-1">
        {product.name}
      </h3>
      <p className="text-xs text-gray-500 mb-2.5">{product.category}</p>

      {/* ── Star rating (decorative) ── */}
      <div className="flex items-center gap-1.5 mb-3.5">
        <svg viewBox="0 0 99.5 16.3" className="h-3">
          {[0, 20.6, 41.2, 61.8].map((x, i) => (
            <path key={i} fill="#F59E0B" transform={`translate(${x})`} d="M9.36 1.56l1.92 3.89a.92.92 0 0 0 .69.5l4.3.63a.92.92 0 0 1 .51 1.56l-3.12 3.03a.92.92 0 0 0-.26.81l.74 4.28a.92.92 0 0 1-1.34.97l-3.85-2.02a.92.92 0 0 0-.85 0l-3.85 2.02a.92.92 0 0 1-1.33-.97l.73-4.28a.92.92 0 0 0-.26-.81L.79 8.14A.92.92 0 0 1 .79 6.58l4.3-.63a.92.92 0 0 0 .69-.5L7.71 1.56a.92.92 0 0 1 1.65 0z" />
          ))}
          <path fill="#E5E7EB" transform="translate(82.4)" d="M9.36 1.56l1.92 3.89a.92.92 0 0 0 .69.5l4.3.63a.92.92 0 0 1 .51 1.56l-3.12 3.03a.92.92 0 0 0-.26.81l.74 4.28a.92.92 0 0 1-1.34.97l-3.85-2.02a.92.92 0 0 0-.85 0l-3.85 2.02a.92.92 0 0 1-1.33-.97l.73-4.28a.92.92 0 0 0-.26-.81L.79 8.14A.92.92 0 0 1 .79 6.58l4.3-.63a.92.92 0 0 0 .69-.5L7.71 1.56a.92.92 0 0 1 1.65 0z" />
        </svg>
        <span className="text-[11px] text-gray-400 font-medium">4.8</span>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          disabled={outOfStock}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.97]
            ${outOfStock
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-dark cursor-pointer"
            }`}
        >
          {outOfStock ? "Habis" : "+ Keranjang"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          disabled={outOfStock}
          className={`w-[46px] h-[46px] rounded-full border border-gray-200 bg-white flex items-center justify-center transition-all duration-200 flex-shrink-0
            ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 hover:border-gray-300 cursor-pointer active:scale-[0.97]"}`}
        >
          <svg viewBox="0 0 28 25" className="w-[18px] h-[18px] fill-gray-700">
            <path d="M0 1.17A1.17 1.17 0 0 1 1.17 0H3.4a2.74 2.74 0 0 1 2.48 1.57H26a1.96 1.96 0 0 1 1.9 2.47l-2 7.46a3.53 3.53 0 0 1-3.4 2.61H8.36l.26 1.4a1.18 1.18 0 0 0 1.16.95h14.12a1.18 1.18 0 0 1 0 2.35H9.78a3.52 3.52 0 0 1-3.46-2.86L3.79 2.67A.39.39 0 0 0 3.4 2.35H1.17A1.17 1.17 0 0 1 0 1.17zM6.27 22.72a2.35 2.35 0 1 1 2.35 2.35 2.35 2.35 0 0 1-2.35-2.35zm16.45-2.35a2.35 2.35 0 1 1-2.35 2.35 2.35 2.35 0 0 1 2.35-2.35z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
