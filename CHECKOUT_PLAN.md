# Checkout page — current state

## What's built and live in the code

**`/secure/:placeId`** on Railway — self-serve checkout with Stripe **Embedded Checkout** (`ui_mode: 'embedded'`). Buyers never leave your page; the Stripe form mounts in a modal, they pay inline, and on success the modal swaps to a "welcome aboard" state.

### Page sections
1. Nav with `Hello<em>Site</em>` wordmark (navy + bright blue, tan background)
2. Hero — eyebrow *"More locals. More walk-ins. More business."*, small "LAUNCH YOUR SITE" label, business name in large italic blue serif (the hero), subcopy, CTAs, trust line *"From $25/mo + $99 setup · No contract · Live in 24 hours"*
3. Live demo preview (iframe in browser frame on desktop; tap-to-preview card on mobile)
4. Process — Check out → Onboarding email → We launch your site (all within 24 hours)
5. Packages — Monthly/Annual toggle (20% off annual), two cards, Executive marked Recommended, plan CTAs trigger embedded checkout modal
6. Trust row (No contract · Live in 24 hours · Built by humans · Secure checkout)
7. FAQ + Footer
8. Checkout modal — bottom sheet on mobile, centered dialog on desktop

### Branding
- Background: `#FFF7E8` (tan) with white cards
- Primary: `#17324D` navy
- Accent: `#3B9AE8` bright blue (the "Site" wordmark)
- Pill buttons (100px radius)
- Fonts: Libre Baskerville serif (italic business name), Inter sans-serif (body + wordmark)

### Payment flow — Stripe Embedded

1. Buyer clicks a plan button (e.g. "Secure Starter — $124 today")
2. Modal opens, shows loading state
3. Browser POSTs to `/api/checkout-session` on Railway with `{ placeId, plan, cadence }`
4. Server uses your Stripe Secret Key + the 6 hardcoded Price IDs to create a Checkout Session with `ui_mode: 'embedded'`, `client_reference_id: placeId`, subscription + setup fee via `add_invoice_items`
5. Server returns `{ clientSecret }`
6. Browser mounts Stripe's embedded form with that client_secret
7. Buyer pays inline, Stripe fires `checkout.session.completed` webhook → your n8n Fulfillment workflow picks it up → matches by `client_reference_id` → flips Airtable Status to "Converted" → sends onboarding email with Tally link
8. `onComplete` handler in the page swaps the modal to a success state

### Price IDs (hardcoded in `server.js`)

```js
CHECKOUT_PRICE_MAP = {
  starter: {
    setup:   'price_1TIFgRJZ1Zjs5qlK6h4ch4cE',   // $99 one-time
    monthly: 'price_1TIDiIJZ1Zjs5qlKVU9jTcGR',   // $25/mo
    annual:  'price_1TIDk3JZ1Zjs5qlKGEB5Xf0i',   // $240/yr
  },
  executive: {
    setup:   'price_1TIFgoJZ1Zjs5qlK4YI7Wheq',   // $249 one-time
    monthly: 'price_1TIDicJZ1Zjs5qlKhAAulL1O',   // $75/mo
    annual:  'price_1TIDjNJZ1Zjs5qlKvZrTYVM0',   // $720/yr
  }
}
```

To change pricing: edit Prices in the Stripe dashboard and swap the IDs in `server.js`.

### Pricing (display-only math)

| Plan | Monthly | Annual (20% off) | Save/yr |
|------|---------|------------------|---------|
| Starter   | $25/mo · $99 setup | $240/yr · $99 setup | $60 |
| Executive | $75/mo · $249 setup | $720/yr · $249 setup | $180 |

## What you need set (one-time config)

### Railway env vars (already set per your screenshot)
```
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=rk_live_...  or sk_live_...
```

No other env vars needed — the Price IDs are in `server.js`.

### Stripe webhook → n8n (verify this is live)

Stripe dashboard → Developers → Webhooks. Confirm you have an endpoint pointing at your n8n Fulfillment workflow URL, listening for at least `checkout.session.completed`. If it's already there from your manual-Payment-Links era, nothing to change; the new self-serve checkout fires the same event.

## What's left to ship

1. **Push the code.** Sandbox can't write to `.git/`, so run from Terminal:
   ```
   cd ~/Documents/GitHub/hellosite-demo-engine
   rm -f .git/index.lock
   npm install
   git add -A
   git commit -m "Embedded Stripe checkout at /secure/:placeId + mobile gallery carousel"
   git push
   ```
2. Railway auto-redeploys in ~30s.
3. Test: visit `demo.gethellosite.com/secure/ChIJPcp7akqj6IgREF5cfZ95yIc`. Click a plan button. Modal opens, Stripe form mounts. Use test card `4242 4242 4242 4242` with any future expiry + any CVC if you want to dry-run with test keys first.
4. Wire the demo CTAs: update `secureSiteMailto()` in `templates.js` to return `https://demo.gethellosite.com/secure/${encodeURIComponent(businessId)}` and the `SECURE MY SITE` buttons will send warm leads to this page instead of a mailto.

## Deploy path

On Railway at `demo.gethellosite.com/secure/{place_id}` today. Migrating to `gethellosite.com/secure/{place_id}` on Vercel is a future step once conversion is proven.
