-- ============================================================================
-- NUSA KASIR — Toko Online: unique (store_id, product_id) di online_products
-- Batch #10 (v2.2.16): perbaikan "sinkron produk 0" — edge sync_products
-- memakai upsert(onConflict: "store_id, product_id") TAPI tidak ada unique
-- constraint → upsert gagal 500 setelah delete lama. Index ini yang ditunggu.
-- Idempotent — aman dijalankan ulang.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_op_store_product
  ON public.online_products(store_id, product_id);
