-- ============================================================================
-- NUSA KASIR — AI Assistant: ai_settings + ai_chat_history (Area H)
-- ============================================================================
-- Area H: pindah AI Chat penuh ke cloud Supabase (drop server lokal Nusa CS):
--   * ai_settings    — konfigurasi provider AI per pengguna (base_url /
--                      api_key / model), default ke key OpenRouter bawaan.
--   * ai_chat_history — riwayat chat per pengguna di cloud (sinkron lintas
--                      perangkat), disimpan sebagai JSON per pesan.
--
-- Identitas: canonical UID app = nusa_account_uid (UUID) ATAU
-- nusa_google_user_id (21-digit Google) — dikirim di body request, jadi
-- owner dipilih berdasarkan kolom `owner` (text) yang diisi edge function
-- dari body (bukan JWT). RLS dibuka karena edge function memakai
-- service_role.
-- ============================================================================

-- ── 1. ai_settings: provider AI configurable ──
create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  base_url text not null default 'https://openrouter.ai/api/v1',
  api_key text not null default '',
  model text not null default 'google/gemini-2.0-flash-lite-001',
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner)
);

-- ── 2. ai_chat_history: riwayat chat cloud (per pesan, JSON) ──
create table if not exists ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  session_id text not null,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null default '',
  tool_name text,
  tool_args text,
  created_at timestamptz not null default now()
);
create index if not exists ai_chat_history_owner_session_idx
  on ai_chat_history (owner, session_id, created_at);

-- ── 3. RLS: buka (edge function memakai service_role; owner dipilih di
--         edge function dari body request, bukan dari JWT Supabase) ──
alter table ai_settings enable row level security;
alter table ai_chat_history enable row level security;

drop policy if exists "ai_settings_all" on ai_settings;
create policy "ai_settings_all" on ai_settings for all using (true) with check (true);

drop policy if exists "ai_chat_history_all" on ai_chat_history;
create policy "ai_chat_history_all" on ai_chat_history for all using (true) with check (true);
