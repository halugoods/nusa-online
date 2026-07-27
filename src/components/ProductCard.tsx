"use client";

import { OnlineProduct, formatRupiah } from "@/lib/supabase";

interface ProductCardProps {
  product: OnlineProduct;
  onAddToCart: (product: OnlineProduct) => void;
  isFav?: boolean;
  onToggleFav?: (productId: number) => void;
}

const categoryGradients: Record<string, { bg: string; icon: string }> = {
  Makanan: { bg: "from-amber-100 via-orange-50 to-yellow-50", icon: "🍜" },
  Minuman: { bg: "from-blue-100 via-sky-50 to-cyan-50", icon: "🥤" },
  Sembako: { bg: "from-red-100 via-rose-50 to-pink-50", icon: "🧂" },
  Lainnya: { bg: "from-purple-100 via-violet-50 to-fuchsia-50", icon: "📦" },
};

export default function ProductCard({ product, onAddToCart, isFav = false, onToggleFav }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const cat = categoryGradients[product.category] ?? categoryGradients.Lainnya;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 group active:scale-[0.98]">
      {/* ── Image Area ── */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cat.bg} flex items-center justify-center`}>
            <span className="text-5xl opacity-50">{cat.icon}</span>
          </div>
        )}

        {/* Overlay for out-of-stock */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              Habis
            </span>
          </div>
        )}

        {/* Stock badge – top left */}
        {!outOfStock && (
          <div className="absolute top-2 left-2">
            {lowStock ? (
              <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full shadow-sm backdrop-blur-sm">
                Sisa {product.stock}
              </span>
            ) : (
              <span className="inline-block px-2.5 py-1 bg-white/90 text-primary text-[11px] font-bold rounded-full shadow-sm backdrop-blur-sm">
                Ada {product.stock}
              </span>
            )}
          </div>
        )}

        {/* Favorite button – top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav?.(product.product_id);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border-0 shadow-sm hover:bg-white transition-all active:scale-90"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 transition-all duration-200 ${
              isFav ? "fill-primary scale-110" : "fill-gray-300 hover:fill-gray-400"
            }`}
          >
            <path d="M12 20a1 1 0 0 1-.437-.1C11.214 19.73 3 15.671 3 9a5 5 0 0 1 8.535-3.536l.465.465.465-.465A5 5 0 0 1 21 9c0 6.646-8.212 10.728-8.562 10.9A1 1 0 0 1 12 20z" />
          </svg>
        </button>

        {/* Price badge – bottom */}
        <div className="absolute bottom-2 left-2 right-2">
          <span className="inline-block bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-primary font-bold text-xs shadow-md">
            {formatRupiah(product.price)}
          </span>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="p-3">
        {/* Category label */}
        <span className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">
          {product.category}
        </span>

        {/* Product name */}
        <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 mt-1 mb-3">
          {product.name}
        </h3>

        {/* ── Action Button ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (outOfStock) return;
            onAddToCart(product);
          }}
          disabled={outOfStock}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
            outOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/20"
          }`}
        >
          {outOfStock ? "Stok Habis" : "+ Keranjang"}
        </button>
      </div>
    </div>
  );
}
