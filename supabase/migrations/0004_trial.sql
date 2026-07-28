-- ============================================================================
-- NUSA KASIR — Trial Support Migration
-- ============================================================================
-- Adds:
--   1. expires_at column to licenses table
--   2. Google auth columns (google_user_id) if not already present
--   3. Updated can_activate() with expiry check and google auth logic
-- ============================================================================

-- Add expires_at column (for trial expiry)
alter table licenses add column if not exists expires_at timestamptz;

-- Add google_user_id column (for Google auth linking)
alter table licenses add column if not exists google_user_id text;
alter table activations add column if not exists google_user_id text;

create index if not exists idx_licenses_google_user_id on licenses(google_user_id);

-- Drop old can_activate (from migration 0003, only checked device count)
drop function if exists can_activate(uuid);

-- New can_activate with full logic:
--   1. Block if license is expired
--   2. Block if license is revoked
--   3. Allow if same Google account already owns this license (multi-device)
--   4. Block if license has a different Google account
--   5. Block if this Google account already has a different license
--   6. Otherwise allow
create or replace function can_activate(lid uuid, gid text)
returns boolean language plpgsql as $$
declare
  lic_status text;
  lic_expires timestamptz;
  lic_owner text;
  existing_count integer;
begin
  -- Fetch license state
  select status, expires_at, google_user_id
  into lic_status, lic_expires, lic_owner
  from licenses where id = lid;

  if not found then
    return false;
  end if;

  -- Block revoked
  if lic_status = 'revoked' then
    return false;
  end if;

  -- Block expired (trial or full — if expires_at is set and passed)
  if lic_expires is not null and lic_expires < now() then
    return false;
  end if;

  -- Same Google account → allow (multi-device)
  if lic_owner is not null and lic_owner = gid then
    return true;
  end if;

  -- Different Google account already owns this license → deny
  if lic_owner is not null and lic_owner != gid then
    return false;
  end if;

  -- Check if this Google account already has a different license
  select count(*) into existing_count
  from licenses
  where google_user_id = gid
    and id != lid
    and (expires_at is null or expires_at >= now());

  if existing_count > 0 then
    return false;
  end if;

  return true;
end;
$$;
