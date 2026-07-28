-- ============================================================================
-- NUSA KASIR — Status Rename Migration (align with GAS SaaS standard)
-- ============================================================================
-- Mapping:
--   issued        → Generated
--   trial         → Trial        (no change, keep distinction)
--   activated     → Active
--   revoked       → Cancelled
--   trial_expired → Expired
--   NEW           → Suspended
-- ============================================================================

-- 1. Rename existing statuses in the licenses table
update licenses set status = 'Generated' where status = 'issued';
update licenses set status = 'Active'    where status = 'activated';
update licenses set status = 'Cancelled' where status = 'revoked';
update licenses set status = 'Expired'   where status = 'trial_expired';

-- 2. Drop old check constraint and add new one
alter table licenses drop constraint if exists licenses_status_check;
alter table licenses add constraint licenses_status_check
  check (status in ('Generated', 'Trial', 'Active', 'Cancelled', 'Expired', 'Suspended'));

-- 3. Update can_activate() to use new status strings
create or replace function can_activate(lid uuid, gid text)
returns boolean language plpgsql as $$
declare
  lic_status text;
  lic_expires timestamptz;
  lic_owner text;
  existing_count integer;
begin
  select status, expires_at, google_user_id
  into lic_status, lic_expires, lic_owner
  from licenses where id = lid;

  if not found then
    return false;
  end if;

  -- Block Cancelled (was revoked)
  if lic_status = 'Cancelled' then
    return false;
  end if;

  -- Block Suspended (new — temporarily inactive)
  if lic_status = 'Suspended' then
    return false;
  end if;

  -- Block Expired (was trial_expired — if expires_at is set and passed)
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
    and (expires_at is null or expires_at >= now())
    and status not in ('Cancelled', 'Suspended', 'Expired');

  if existing_count > 0 then
    return false;
  end if;

  return true;
end;
$$;
