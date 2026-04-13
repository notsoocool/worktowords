/** Shared sizing for pricing plan cards: aligned footers, equal button dimensions */
export const PRICING_CARD_BUTTON_CLASS =
  "h-10 min-h-10 w-full justify-center rounded-xl px-4";

/** Same as sizing class; interactive buttons inherit pointer styling from `Button` */
export const PRICING_CARD_BUTTON_INTERACTIVE_CLASS = PRICING_CARD_BUTTON_CLASS;

/**
 * Disabled “Current plan” — default arrow; re-enable hit-testing so the default
 * arrow shows (base `Button` uses disabled:pointer-events-none).
 */
export const PRICING_CARD_BUTTON_CURRENT_CLASS = `${PRICING_CARD_BUTTON_CLASS} cursor-default disabled:pointer-events-auto disabled:cursor-default`;
