-- Fix profiles_plan_check to include 'onetime' plan.
-- The constraint was missing 'onetime', causing the Lemon Squeezy webhook
-- to silently fail when processing one-time purchases.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'onetime', 'pro', 'agency'));
