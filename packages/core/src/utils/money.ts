import type { Money } from '../models/entities';

/**
 * Money helpers. The API speaks minor units (paisa) + currency, so all
 * arithmetic here stays in integer minor units and only formats at the edge.
 * Shared by web and native so a fare shows identically on both.
 */

export const money = (amount: number, currency = 'BDT'): Money => ({ amount, currency });

export const addMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
};

export const subtractMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
};

/** Multiply by a ratio (e.g. commission %), rounding to nearest minor unit. */
export const scaleMoney = (a: Money, ratio: number): Money => ({
  amount: Math.round(a.amount * ratio),
  currency: a.currency,
});

const CURRENCY_SYMBOL: Record<string, string> = { BDT: '৳', USD: '$' };

/** Format minor units for display, e.g. {amount: 12550, BDT} -> "৳125.50". */
export const formatMoney = (m: Money, fractionDigits = 2): string => {
  const major = m.amount / 100;
  const symbol = CURRENCY_SYMBOL[m.currency] ?? `${m.currency} `;
  return `${symbol}${major.toFixed(fractionDigits)}`;
};

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
