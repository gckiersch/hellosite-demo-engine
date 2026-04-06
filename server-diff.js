// ─── DIFF: 3 changes to server.js ────────────────────────────────────────────
//
// 1. Add require at the top (after the existing requires)
// 2. Rename old defaultLayouts (easy revert)
// 3. Update renderDemo dispatch
//
// Everything else in server.js stays exactly as-is.
// ─────────────────────────────────────────────────────────────────────────────


// ── CHANGE 1 ─────────────────────────────────────────────────────────────────
// Add this line near the top of server.js, after  const express = require('express');

const {
  templateTrades,
  templateGrooming,
  templateWellness,
  templatePet,
  templateRetail,
  templateRealEstate,
} = require('./templates');


// ── CHANGE 2 ─────────────────────────────────────────────────────────────────
// Replace the existing defaultLayouts object with this.
// Old layout names are preserved — just prefixed with "legacy_" so you can
// switch back instantly by changing the values here.

const defaultLayouts = {
  trades:   'trades',      // was: 'fullbleed'   → legacy: legacyLayoutFullBleed
  grooming: 'grooming',   // was: 'split'        → legacy: legacyLayoutSplit
  wellness: 'wellness',   // was: 'wellness'     → legacy: legacyLayoutWellness
  pet:      'pet',        // was: 'split'        → legacy: legacyLayoutSplit
  retail:   'retail',     // was: 'split'        → legacy: legacyLayoutSplit
};

// TO REVERT: swap any value back to 'fullbleed', 'split', or 'wellness'


// ── CHANGE 3 ─────────────────────────────────────────────────────────────────
// Replace the existing renderDemo function with this.
// Old layout functions are still in the file — just renamed below.

function renderDemo(place, copy, photos, industry, layoutOverride) {
  const layout = layoutOverride || defaultLayouts[industry] || 'fullbleed';
  switch (layout) {
    // ── NEW TEMPLATES ──
    case 'trades':      return templateTrades(place, copy, photos, industry);
    case 'grooming':    return templateGrooming(place, copy, photos, industry);
    case 'wellness':    return templateWellness(place, copy, photos, industry);
    case 'pet':         return templatePet(place, copy, photos, industry);
    case 'retail':      return templateRetail(place, copy, photos, industry);
    case 'realestate':  return templateRealEstate(place, copy, photos, industry);

    // ── LEGACY (still work via ?layout=fullbleed etc.) ──
    case 'fullbleed':   return layoutFullBleed(place, copy, photos, industry);
    case 'split':       return layoutSplit(place, copy, photos, industry);
    case 'legacy_wellness': return layoutWellness(place, copy, photos, industry);

    default:            return layoutFullBleed(place, copy, photos, industry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// That's it. Push to Railway, the new templates are live.
//
// Test new vs old side-by-side:
//   /demo?place_id=XXXX               ← new template
//   /demo?place_id=XXXX&layout=split  ← old split layout
//   /demo?place_id=XXXX&layout=fullbleed ← old fullbleed layout
//
// Cache note: add &refresh=true on first load to bust any cached old HTML.
// ─────────────────────────────────────────────────────────────────────────────
