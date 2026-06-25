// 🔒 LOCKED — public entry point for the ads system.
// Pages import the ad component from here: `import { Ads } from '@/lib/ads'`.
// All logic (fetch, decide, rotation, frame, shape contract) lives in this locked
// folder. The only customizable surface is src/editable/ads/ads-theme.ts.

export { default as Ads, type AdsProps } from './ads'
export { AD_SLOTS, getAdSlot, getSlotSizes, type AdSlotSpec } from './ad-slots'
export { type AdSkin } from './ad-frame'
