/**
 * Subscription status is derived from two timestamps at read time — there is
 * no status column and no background job to flip one. Pure and unit-testable.
 */

export type SubscriptionStatus = "NONE" | "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED";

export interface SubscriptionDates {
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  graceDays: number;
  cancelledAt: Date | null;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  /** Last day the tenant is fully paid/trialed for (null for NONE). */
  effectiveUntil: Date | null;
  /** End of the grace window (null for NONE / LIFETIME-like nulls). */
  graceEndsAt: Date | null;
  /** Days until the NEXT boundary: end of paid period (ACTIVE/TRIAL) or end of grace (GRACE). */
  daysLeft: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeSubscriptionState(
  sub: SubscriptionDates | null,
  now: Date = new Date()
): SubscriptionState {
  // No subscription row = unrestricted. Existing tenants are never locked
  // out by deploying the platform migration.
  if (!sub) return { status: "NONE", effectiveUntil: null, graceEndsAt: null, daysLeft: null };

  if (sub.cancelledAt && sub.cancelledAt <= now) {
    return { status: "EXPIRED", effectiveUntil: sub.cancelledAt, graceEndsAt: sub.cancelledAt, daysLeft: 0 };
  }

  const candidates = [sub.paidUntil, sub.trialEndsAt].filter((d): d is Date => d != null);
  if (candidates.length === 0) {
    // Assigned a plan but never given a trial or payment — treat as expired
    // immediately (the portal always sets one of the two).
    return { status: "EXPIRED", effectiveUntil: null, graceEndsAt: null, daysLeft: 0 };
  }

  const effectiveUntil = new Date(Math.max(...candidates.map((d) => d.getTime())));
  const graceEndsAt = new Date(effectiveUntil.getTime() + sub.graceDays * DAY_MS);

  if (now <= effectiveUntil) {
    const paidCovers = sub.paidUntil != null && now <= sub.paidUntil;
    return {
      status: paidCovers ? "ACTIVE" : "TRIAL",
      effectiveUntil,
      graceEndsAt,
      daysLeft: Math.ceil((effectiveUntil.getTime() - now.getTime()) / DAY_MS),
    };
  }
  if (now <= graceEndsAt) {
    return {
      status: "GRACE",
      effectiveUntil,
      graceEndsAt,
      daysLeft: Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY_MS),
    };
  }
  return { status: "EXPIRED", effectiveUntil, graceEndsAt, daysLeft: 0 };
}
