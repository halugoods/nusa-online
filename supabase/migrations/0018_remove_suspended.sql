-- ============================================================================
-- NUSA KASIR — Remove 'Suspended' status + fix can_activate owner-first
-- ============================================================================
-- 'Suspended' was a dead status: no code path ever SET it (only block-lists
-- and stats referenced it). Removing it simplifies the status model to:
--   Generated / Trial / Active / Expired / Cancelled
--
-- Also fixes can_activate() ordering bug: the expired check ran BEFORE the
-- same-owner check, so an expired key blocked the SAME account from
-- renewing/upgrading (perpanjang) even though it is the legitimate owner.
-- Owner check now comes first: same owner may always re-activate.
-- ============================================================================

-- 1. Drop old check constraint, re-add without 'Suspended'
alter table licenses drop constraint if exists licenses_status_check;
alter table licenses add constraint licenses_status_check
  check (status in ('Generated', 'Trial', 'Active', 'Cancelled', 'Expired'));

-- 2. Migrate any (unlikely) Suspended rows to Cancelled so nothing is orphaned
update licenses set status = 'Cancelled' where status = 'Suspended';

-- 3. Rewrite can_activate() — owner-first, no Suspended
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

  -- Same Google account → allow (renew / upgrade / multi-device) even if
  -- the previous key is expired. This is the fix: expired must NOT block
  -- the legitimate owner from reactivating the same key after payment.
  if lic_owner is not null and lic_owner = gid then
    return true;
  end if;

  -- Block Cancelled (permanently revoked)
  if lic_status = 'Cancelled' then
    return false;
  end if;

  -- Block Expired (expires_at set and passed)
  if lic_expires is not null and lic_expires < now() then
    return false;
  end if;

  -- Different Google account already owns this license → deny
  if lic_owner is not null and lic_owner != gid then
    return false;
  end if;

  -- Check if this Google account already has a different active license
  select count(*) into existing_count
  from licenses
  where google_user_id = gid
    and id != lid
    and (expires_at is null or expires_at >= now())
    and status not in ('Cancelled', 'Expired');

  if existing_count > 0 then
    return false;
  end if;

  return true;
end;
$$;
