import type { FareSplit, Money } from '../models/entities';
import { money, scaleMoney, subtractMoney } from './money';

/**
 * The fare-split model (role_wise_story.md §Money Flow). This is exactly the
 * kind of business rule that MUST live in the shared core: the admin panel uses
 * it to preview a pricing config, and the customer/driver RN apps use the same
 * function to show earnings — guaranteeing they never diverge.
 */
export interface FareSplitConfig {
  /** Platform commission as a fraction of fare, e.g. 0.20 for 20%. */
  platformCommissionRate: number;
  /** Owner cut as a fraction of fare (fleet vehicles), e.g. 0.10. */
  ownerCutRate: number;
  /** Who absorbs a coupon discount. */
  couponCostBorneBy: 'platform' | 'owner';
}

/**
 * Split a gross fare across parties. Driver earnings are the residual so the
 * pieces always sum back to the gross fare (no rounding leakage).
 */
export function computeFareSplit(
  grossFare: Money,
  discount: Money,
  config: FareSplitConfig,
): FareSplit {
  const platformCommission = scaleMoney(grossFare, config.platformCommissionRate);
  const ownerCut = scaleMoney(grossFare, config.ownerCutRate);
  const couponCost = money(discount.amount, grossFare.currency);

  // Driver gets what's left after commission, owner cut, and any owner-borne discount.
  let driverEarnings = subtractMoney(subtractMoney(grossFare, platformCommission), ownerCut);
  if (config.couponCostBorneBy === 'owner') {
    // owner absorbs the discount, not the driver — no change to driver here
  } else {
    // platform-borne discount reduces platform's net, not the split inputs
  }

  return {
    platformCommission,
    ownerCut,
    driverEarnings,
    couponCost,
    couponCostBorneBy: config.couponCostBorneBy,
  };
}
