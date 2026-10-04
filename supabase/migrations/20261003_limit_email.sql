-- Month (YYYY-MM) in which the "scan limit reached" email was last sent, so it goes out at
-- most once per month. The app sends nothing until this column exists.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS limit_email_month TEXT;
