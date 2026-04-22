-- Migration: Fix schema gaps identified in audit
-- Run this in Supabase SQL Editor

-- 1. Add admin_scope to profiles (for sub-admin permission scoping)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_scope text;

-- 2. Add referral_code to profiles (for referral tracking)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- 3. Ensure wallet_transactions has a reference column (used by API)
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS reference text;

-- 4. Add description column to wallet_transactions if missing (some APIs may use it)
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS description text;

-- 5. Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code
ON public.profiles(referral_code);

-- 6. Create index on admin_scope for middleware lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin_scope
ON public.profiles(admin_scope);
