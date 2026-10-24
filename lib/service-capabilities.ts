/** Configuration readiness only; this does not probe provider health or database schema. */
export function getServiceCapabilities(env: Record<string, string | undefined> = process.env) {
  const has = (name: string) => Boolean(env[name]?.trim());
  const database = (has("SUPABASE_URL") || has("NEXT_PUBLIC_SUPABASE_URL")) && has("SUPABASE_SERVICE_ROLE_KEY");
  const auth = has("NEXT_PUBLIC_SUPABASE_URL") && has("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const aiProviders = ["DEEPSEEK_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"].filter(has);
  const capabilities = {
    database,
    auth,
    scanner: database,
    aiRecommendations: aiProviders.length > 0,
    pageSpeed: has("GOOGLE_PAGESPEED_API_KEY") || has("PAGESPEED_API_KEY"),
    readerAuthenticated: has("JINA_API_KEY"),
    email: has("RESEND_API_KEY"),
    scheduledJobs: has("CRON_SECRET"),
    checkout: has("LEMONSQUEEZY_API_KEY") && has("LEMONSQUEEZY_STORE_ID") && ["LEMONSQUEEZY_VARIANT_ONETIME", "LEMONSQUEEZY_VARIANT_PRO", "LEMONSQUEEZY_VARIANT_AGENCY"].every(has),
    billingWebhook: has("LEMONSQUEEZY_WEBHOOK_SECRET"),
    visibility: env.AI_VISIBILITY_ENABLED === "true" && (has("PERPLEXITY_API_KEY") || has("GEMINI_API_KEY")),
  };
  return { ok: database && auth, capabilities, aiProviders };
}
