-- Add onetime plan URL locking columns to profiles.
-- onetime_url: the URL the user's full report is locked to (set on first scan)
-- onetime_scan_count: total scans run on that URL (1 = initial, 2-4 = retests)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onetime_url TEXT,
  ADD COLUMN IF NOT EXISTS onetime_scan_count INTEGER NOT NULL DEFAULT 0;
