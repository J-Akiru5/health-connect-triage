-- Teleconsultation removal script for Supabase/Postgres
-- Requested scope:
-- 1) Drop teleconsultation-related tables
-- 2) Remove referrals.teleconsultation_id linkage
-- 3) Hard-delete model (no archive)

begin;

-- Remove dependent relationship from referrals first (if present)
alter table if exists public.referrals
  drop constraint if exists referrals_teleconsultation_id_fkey;

alter table if exists public.referrals
  drop column if exists teleconsultation_id;

-- Drop child tables before parent table
-- CASCADE ensures leftover FKs, policies, triggers, and indexes are removed safely.
drop table if exists public.consultation_messages cascade;
drop table if exists public.consultation_notes cascade;
drop table if exists public.teleconsultations cascade;

commit;
