# HelloSite Demo Engine — Project Memory

Railway Express app that generates live demo websites for local businesses from Google Places data, plus a self-serve checkout page (`/secure/:placeId`) with embedded Stripe that supplements Cam's manual close flow for warm leads.

---

## Architecture

**Stack:** Node/Express on Railway · Google Places API v1 · Anthropic API (Claude) for copy · Stripe Embedded Checkout · n8n Cloud for fulfillment · Airtable as state machine · Namecheap for domains.

**Key files:**

- `server.js` — Express app. Routes, place fetching, template dispatch, Stripe endpoint, domain endpoints. Entry point.
- `templates.js` — Demo template functions (`templateTrades`, `templateWellness`, `templateRealEstate`, plus dead `templatePet/Retail/Grooming` that aren't dispatched). Shared helpers: `galleryStrip`, `claimCTA` (floating CTA), `secureSiteUrl` (links to checkout), `wrapHTML`, `extractPlaceData`, `esc`, `headline`, etc.
- `checkout.js` — Exports `renderCheckout(place, options)` which returns the full HTML for `/secure/:placeId`. Includes embedded Stripe Checkout modal (bottom sheet on mobile, centered dialog on desktop).
- `CHECKOUT_PLAN.md` — Detailed spec for the checkout page (the full plan, price IDs, branding, deploy path).
- `HelloSite_Full_Journey_Brief.docx` (in uploads) — Complete customer journey + pipeline overview.

**Routes in `server.js`:**

- `GET /demo?place_id=X` — renders a demo (auto-builds if not cached)
- `GET /demo?place_id=X&refresh=true` — force rebuild, busts cache
- `GET /secure/:placeId` — self-serve checkout page
- `POST /api/checkout-session` — creates Stripe Checkout Session (`ui_mode: 'embedded'`)
- `GET /checkout-complete` — 3DS fallback landing page
- `POST /api/domain-check`, `/api/domain-register`, `/api/domain-dns` — Namecheap integration
- `GET /` — internal dashboard listing demos

**Template dispatch** (in `renderDemo()`):
- `trades` → `templateTrades` (in templates.js)
- `grooming`, `pet`, `retail` → `layoutSplit` (in server.js)
- `wellness` → `templateWellness` (in templates.js)
- `realestate` → `templateRealEstate` (in templates.js)
- `bold`, `fullbleed`, default → `layoutFullBleed` (in server.js)
- `legacy_wellness`, `editorial` → `layoutWellness` (in server.js)

---

## Branding

Pulled from the loading page and error pages in `server.js`:

- Navy `#17324D` (primary)
- Bright blue `#3B9AE8` (the "Site" wordmark accent, savings chips)
- Cream/tan `#FFF7E8` (page background on checkout + marketing)
- White `#FFFFFF` (cards, interactive elements)
- Pill buttons (100px radius)
- Wordmark: `Hello<em>Site</em>` — Inter sans-serif, weight 700, letter-spacing -0.03em; "Site" at 55% opacity or rendered in `#3B9AE8`
- Tagline: "More locals. More walk-ins. More business."
- Headline pattern: Libre Baskerville serif, with italic blue treatment for emphasis words

---

## Stripe

**Env vars in Railway** (both required):
- `STRIPE_PUBLISHABLE_KEY` — `pk_live_...` for the frontend
- `STRIPE_SECRET_KEY` — `sk_live_...` or `rk_live_...` (restricted key works with Checkout Sessions: Write, Prices: Read, Products: Read)

**6 Price IDs hardcoded in `server.js` `CHECKOUT_PRICE_MAP`:**
- Starter setup (`price_1TIFgRJZ1Zjs5qlK6h4ch4cE`, $99 one-time)
- Starter monthly (`price_1TIDiIJZ1Zjs5qlKVU9jTcGR`, $25/mo)
- Starter annual (`price_1TIDk3JZ1Zjs5qlKGEB5Xf0i`, $240/yr)
- Executive setup (`price_1TIFgoJZ1Zjs5qlK4YI7Wheq`, $249 one-time)
- Executive monthly (`price_1TIDicJZ1Zjs5qlKhAAulL1O`, $75/mo)
- Executive annual (`price_1TIDjNJZ1Zjs5qlKvZrTYVM0`, $720/yr)

**Session config pattern:**
- `ui_mode: 'embedded'` + `redirect_on_completion: 'if_required'` — buyer stays on page
- `mode: 'subscription'`
- `line_items` is an array of TWO: setup + recurring (mixed one-time + recurring works in subscription mode)
- `client_reference_id: placeId` and `metadata.place_id: placeId` — both set for webhook matching

---

## n8n fulfillment

Webhook endpoint (production): `https://kidskamp.app.n8n.cloud/webhook/stripe-payment`

Listens for `checkout.session.completed`. Reads `client_reference_id` → looks up Airtable record by place_id → flips Status from "Interested" to "Converted" → triggers domain options email + Tally intake form (`https://tally.so/r/D4Dr0q`) → downstream demo rebuild + go-live flow.

The self-serve checkout fires the exact same webhook event as Cam's manually-sent Payment Links, so no new n8n work was needed once the endpoint was configured.

---

## Gotchas learned the hard way

1. **`navHTML()` needs `place` passed explicitly.** It lives in server.js and takes `(shortName, copy, theme, links, place)`. Any CTA inside navHTML that references `place` must have it in scope — don't assume. Hit a ReferenceError in production because I forgot this.

2. **Stripe `add_invoice_items` is NOT on Checkout Sessions.** It's on the Subscription API. On Checkout Sessions with `mode: 'subscription'`, you mix one-time and recurring Prices in `line_items` instead. Stripe will put the one-time item on the first invoice automatically.

3. **Sandbox can't write to `.git/`.** Any git operations (commit, push, removing `index.lock`) must be run by the user in Terminal. Same sandbox also can't delete files inside `.git/`.

4. **Railway env var changes don't always trigger auto-redeploy.** If the service looks stale after adding a var, manually redeploy from Deployments tab → ⋯ → Redeploy.

5. **ReferenceError from scope bugs only fire at runtime.** `node --check` won't catch `place is not defined` if `place` isn't referenced until a function executes. Test routes that actually render.

6. **`demoCache` is in-memory on Railway.** After a deploy, cache is empty. During development use `&refresh=true` to bypass it.

7. **`checkout-preview.html` is a local render artifact.** Committed by accident — should probably be in `.gitignore`.

---

## Deploy flow

1. Edit code in `~/Documents/GitHub/hellosite-demo-engine` (via Cowork or directly)
2. From Terminal:
   ```
   cd ~/Documents/GitHub/hellosite-demo-engine
   rm -f .git/index.lock   # if needed
   git add -A
   git commit -m "..."
   git push
   ```
3. Railway auto-redeploys in ~30 seconds
4. Test on `demo.gethellosite.com`

---

## Testing place_ids

- `ChIJj-aliA_PwoARI36KBu4KTcQ` — TNT Auto Repair (trades)
- `ChIJz6ca4qC5woARRewY64ReE94` — Bushwick Barbershop (grooming)
- `ChIJuZ--3qnHwoARRyWOYPuvQVk` — Làmay Nail Spa (wellness)
- `ChIJF6NXG_jHwoARVsJdvFTe1tA` — 21Pooch (pet)
- `ChIJ9cAF4wyTwoAR_Jdg-iCVg-A` — Adobe Design (retail)
- `ChIJPcp7akqj6IgREF5cfZ95yIc` — Elite Auto Detailing (used for checkout page previews)

Stripe test mode: card `4242 4242 4242 4242` + any future expiry + any CVC.

---

## Accessibility (WCAG 2.1 AA)

The platform has been audited and updated for AA compliance. Shared patterns applied everywhere:

- **Skip-to-main link** injected as the first focusable element on every page, pointing at `#main`. CSS keeps it off-screen until focused. Defined in `templates.js` `wrapHTML()` for demo templates, inline in `checkout.js`, and globally in `hellosite-marketing/styles/globals.css` for the marketing site.
- **`:focus-visible` ring** — 3px brand-colored outline with 3px offset. Users get a visible focus only for keyboard interaction (mouse clicks don't trigger it). Same three locations as above.
- **`<main id="main">` landmark** wraps the primary content on every page, with `<nav>` and `<footer>` as siblings (not children).
- **`<nav aria-label="...">`** — "Primary" on the top nav, "Footer" on the legal nav, "Mobile" where applicable.
- **`aria-label` on phone/email links** — screen readers say "Call 310-555-1234" instead of reading the digits one at a time.
- **Star ratings** get `role="img" aria-label="{rating} out of 5 stars, {count} reviews"` so screen readers announce the meaning, not the unicode stars.
- **`alt` text on `<img>`** — gallery photos get "{business name} — photo {i} of {total}", hero images get "{business name} — hero image". Decorative elements (icon glyphs, fake browser-dot clusters, overlay gradients) get `aria-hidden="true"`.
- **Mobile nav toggles** have `aria-label` ("Open menu" / "Close menu"), `aria-expanded={isOpen}`, and `aria-controls` pointing at the dropdown's `id`.
- **Form inputs** on the marketing site have `<label htmlFor="id">` paired with `id="id"` on the input. Placeholders are decorative only.
- **FAQ accordions** use `aria-expanded`, `aria-controls`, and `aria-labelledby` to pair questions with their answer regions.
- **`prefers-reduced-motion`** respected in `globals.css` — collapses animation durations for users who've set that system preference.

## Privacy Policy

Dual-hosted:
- **Canonical**: `gethellosite.com/privacy-policy` (Next.js file at `hellosite-marketing/pages/privacy-policy.js`)
- **Stopgap**: `demo.gethellosite.com/privacy-policy` (route in `server.js` on Railway)

Copy is CCPA-compliant, effective April 17, 2026. Contact: `privacy@gethellosite.com`. Footer links added across all 5 main-site pages (`index.js`, `faq.js`, `how-it-works.js`, `pricing.js`, `terms.js`).

## Session log — April 2026

**Delivered this session:**

1. **Mobile gallery carousel** on all demo templates — `galleryStrip()` in templates.js now renders a scroll-snap horizontal carousel (88% width images, 4:3 aspect, IntersectionObserver-driven dot indicator) on screens <768px. Desktop kept as 3-column grid.

2. **`/secure/:placeId` checkout page** — new `checkout.js` module exporting `renderCheckout(place, options)`. Full page: nav, hero with tagline + italic business-name treatment, demo iframe preview (desktop) / tap-to-preview card (mobile), 3-step process timeline, package cards with Monthly/Annual toggle and 20% annual discount, trust row, FAQ, footer, and embedded Stripe Checkout modal. Mobile-optimized: bottom-sheet modal, swipeable pricing cards with dot indicator (same pattern as gallery).

3. **Demo CTAs wired to checkout** — both the nav "SECURE MY SITE" button and the floating "Launch your site · Live in 24 hours" pill (formerly "Reply to the email") now link to `/secure/:placeId`. Previously they opened a mailto. `secureSiteMailto()` renamed to `secureSiteUrl()`.

4. **Embedded Stripe Checkout wired** — server endpoint `/api/checkout-session` creates sessions, frontend mounts via Stripe.js. All 6 Price IDs, Railway env vars, and n8n webhook configured.

**Regressions we hit and fixed:**
- `navHTML` calling `secureSiteMailto(place...)` without `place` in scope → threaded `place` through as 5th param.
- `subscription_data.add_invoice_items` rejected by Stripe → moved setup fee to a second `line_item`.

**Also delivered:**
5. **Privacy Policy page** on both codebases — canonical Next.js page at `hellosite-marketing/pages/privacy-policy.js`, stopgap Railway route at `demo.gethellosite.com/privacy-policy`. Footer Privacy links added across all 5 main-site pages.
6. **WCAG 2.1 AA accessibility sweep** across both codebases: skip-to-main links, `<main>` landmarks, visible keyboard focus rings, `aria-label` on nav/phone/email/stars/icon-only buttons, descriptive alt text on every `<img>`, mobile nav toggles with `aria-expanded`/`aria-controls`, form inputs paired with labels via `htmlFor`/`id`, FAQ accordions with proper aria-expanded/controls/labelledby, `prefers-reduced-motion` respected. Loading page and error fallback pages also fixed. Main-site global defaults live in `styles/globals.css`; demo engine defaults live in `templates.js` `wrapHTML()` and `checkout.js`.
7. **Unified navigation across marketing site** — every page now has the same primary nav (Why, How it works, Pricing, See my site) in the header with the current page highlighted via `aria-current="page"`. Secondary links (Contact, FAQ, Terms, Privacy) moved exclusively to the footer. Shared nav + mobile-menu CSS consolidated in `styles/globals.css` so per-page `<style>` blocks don't need to redefine them. Mobile hamburger + dropdown works on every page (pricing, faq, terms, privacy-policy gained `mobileMenuOpen` state + matching hamburger markup).
