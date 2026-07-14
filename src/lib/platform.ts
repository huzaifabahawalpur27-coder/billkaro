/**
 * The single switch for SaaS platform features. Offline / self-hosted
 * installs leave PLATFORM_MODE unset (standalone): no subscription logic
 * runs on any code path and /admin routes 404.
 */
export function isSaasMode(): boolean {
  return process.env.PLATFORM_MODE === "saas";
}

export function trialDays(): number {
  const n = Number(process.env.PLATFORM_TRIAL_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 14;
}
