/**
 * HelloSite — Checkout Page (/secure/:placeId)
 *
 * Self-serve checkout for warm leads. Supplements Cam's manual close flow.
 *
 * Flow: Demo preview → pick package → Stripe Payment Link (with
 * client_reference_id={placeId}) → Stripe webhook fires HelloSite
 * Fulfillment n8n workflow → branded onboarding email (Tally) → go live.
 *
 * CAM TO FILL IN: STRIPE_STARTER_URL, STRIPE_EXECUTIVE_URL below.
 * These should be live Stripe Payment Link URLs with setup fees baked in.
 */
'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Stripe Embedded Checkout. Publishable key is safe to ship in source;
// it's evaluated server-side at render time, so the Railway env var flows
// through into the generated HTML. Secret key lives in the server endpoint.
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_REPLACE_ME';

// Annual pricing — 20% discount vs monthly (2.4 months free).
// These are display-only values in the UI; the real billing amounts
// come from the Price IDs you set up in Stripe.
const ANNUAL_DISCOUNT_PCT = 20;
const STARTER_MONTHLY_PRICE   = 25;
const STARTER_SETUP_FEE       = 99;
const EXECUTIVE_MONTHLY_PRICE = 75;
const EXECUTIVE_SETUP_FEE     = 249;

// Compute annual prices (12 months × discount)
const STARTER_ANNUAL_PRICE   = Math.round(STARTER_MONTHLY_PRICE   * 12 * (1 - ANNUAL_DISCOUNT_PCT/100));
const EXECUTIVE_ANNUAL_PRICE = Math.round(EXECUTIVE_MONTHLY_PRICE * 12 * (1 - ANNUAL_DISCOUNT_PCT/100));
const STARTER_ANNUAL_SAVINGS   = STARTER_MONTHLY_PRICE   * 12 - STARTER_ANNUAL_PRICE;
const EXECUTIVE_ANNUAL_SAVINGS = EXECUTIVE_MONTHLY_PRICE * 12 - EXECUTIVE_ANNUAL_PRICE;

const SUPPORT_EMAIL = 'cam@gethellosite.com';
const BRAND_NAME    = 'HelloSite';
const ACCENT        = '#17324D';       // HelloSite navy (matches loading page)
const ACCENT_SOFT   = '#2D4F73';
const BRAND_BLUE    = '#3B9AE8';       // "Site" wordmark blue (adjust to exact brand hex if different)
const TEXT          = '#17324D';
const MUTED         = '#7A8899';
const BORDER        = '#E8E4DB';
const BG            = '#FFF7E8';       // HelloSite cream/tan — page background
const CARD          = '#FFFFFF';       // cards + interactive elements stand out on cream

// ─── UTILS ────────────────────────────────────────────────────────────────────
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ─── PAGE RENDERER ────────────────────────────────────────────────────────────
/**
 * renderCheckout(place, options)
 *   place:   Google Places response (uses place.id, place.displayName.text)
 *   options: { demoOrigin?: string, prefillEmail?: string }
 */
function renderCheckout(place, options = {}) {
  const placeId   = place?.id || '';
  const name      = place?.displayName?.text || 'your business';
  const demoOrigin = options.demoOrigin || 'https://demo.gethellosite.com';
  const demoUrl    = `${demoOrigin}/demo?place_id=${encodeURIComponent(placeId)}`;


  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Secure ${esc(name)} — ${BRAND_NAME}</title>
<link rel="icon" type="image/x-icon" href="https://www.gethellosite.com/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,700;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:${BG};color:${TEXT};font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased;}
a{color:inherit;text-decoration:none;}
img{display:block;max-width:100%;}
/* ── Accessibility: keyboard-only focus ─────────────────────────────── */
:focus{outline:none;}
:focus-visible{outline:3px solid ${BRAND_BLUE};outline-offset:3px;border-radius:4px;}
.btn:focus-visible{outline-offset:4px;}
/* ── Accessibility: skip-to-main link ───────────────────────────────── */
.skip-link{position:absolute;left:-9999px;top:0;background:${ACCENT};color:#fff;padding:.75rem 1.25rem;z-index:99999;font-weight:600;text-decoration:none;border-radius:0 0 8px 0;font-size:14px;}
.skip-link:focus{left:0;}
.serif{font-family:'Libre Baskerville',Georgia,serif;}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px;}

/* ── NAV ───────────────────────────────────────────────────────────── */
.nav{position:sticky;top:0;z-index:50;background:${BG};border-bottom:1px solid ${BORDER};}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:16px 28px;max-width:1180px;margin:0 auto;}
.brand{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:22px;font-weight:700;color:${ACCENT};letter-spacing:-.03em;display:inline-block;line-height:1;}
.brand em{font-style:normal;color:${BRAND_BLUE};}
.nav-right{display:flex;align-items:center;gap:22px;}
.nav-right a{font-size:13.5px;color:${MUTED};}
.nav-right a:hover{color:${TEXT};}

/* ── HERO ──────────────────────────────────────────────────────────── */
.hero{padding:56px 0 48px;}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:56px;align-items:center;}
.eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${ACCENT};background:${ACCENT}12;padding:6px 12px;border-radius:999px;margin-bottom:22px;}
.tagline{font-family:'Inter',system-ui,sans-serif;font-size:16px;font-weight:400;color:${MUTED};margin-bottom:18px;letter-spacing:-.005em;display:block;}
.tagline strong{color:${ACCENT};font-weight:700;}
.hero h1{font-family:'Libre Baskerville',serif;font-weight:700;line-height:1.04;letter-spacing:-.02em;margin-bottom:22px;color:${ACCENT};}
.hero h1 .l1{display:block;white-space:nowrap;font-family:'Inter',system-ui,sans-serif;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${MUTED};margin-bottom:16px;}
.hero h1 em{font-style:italic;font-weight:400;color:${BRAND_BLUE};display:block;font-size:clamp(3rem,6.8vw,5.2rem);line-height:1.02;letter-spacing:-.025em;}
.hero h1 .accent{color:${ACCENT};}
.hero-sub{font-size:17px;color:${MUTED};margin-bottom:28px;max-width:520px;}
.hero-cta{display:flex;gap:12px;flex-wrap:wrap;}
.hero-trust{font-size:13px;color:${MUTED};margin-top:22px;letter-spacing:.01em;display:flex;flex-wrap:wrap;align-items:center;gap:10px;}
.hero-trust strong{color:${ACCENT};font-weight:600;}
.hero-trust .dot{opacity:.5;}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:100px;font-size:14px;font-weight:600;transition:transform .15s,box-shadow .2s,background .2s;cursor:pointer;border:none;text-align:center;}
.btn-primary{background:${ACCENT};color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.04),0 8px 24px ${ACCENT}33;}
.btn-primary:hover{transform:translateY(-1px);background:${ACCENT_SOFT};box-shadow:0 2px 0 rgba(0,0,0,.04),0 12px 32px ${ACCENT}44;}
.btn-ghost{background:transparent;color:${TEXT};border:1px solid ${BORDER};}
.btn-ghost:hover{border-color:${ACCENT};color:${ACCENT};}

/* Demo preview frame — styled like a browser window */
.preview{background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:14px;box-shadow:0 20px 60px rgba(23,50,77,.08);}
.preview-bar{display:flex;align-items:center;gap:6px;padding:4px 6px 10px;}
.preview-bar i{width:11px;height:11px;border-radius:50%;background:#E5E7EB;display:inline-block;}
.preview-bar i:nth-child(1){background:#F87171;}
.preview-bar i:nth-child(2){background:#FBBF24;}
.preview-bar i:nth-child(3){background:#34D399;}
.preview-bar .url{flex:1;margin-left:10px;font-size:11px;color:${MUTED};background:#fff;border:1px solid ${BORDER};border-radius:6px;padding:5px 10px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.preview-frame{position:relative;border-radius:10px;overflow:hidden;background:#fff;aspect-ratio:4/3;border:1px solid ${BORDER};}
.preview-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.preview-caption{font-size:12px;color:${MUTED};text-align:center;margin-top:14px;}
.preview-caption a{color:${ACCENT};font-weight:600;}

/* Mobile preview card — shown instead of iframe on small screens */
.preview-mobile{display:none;background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:36px 24px;text-align:center;box-shadow:0 8px 24px rgba(23,50,77,.06);}
.preview-mobile .pm-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${BRAND_BLUE};background:${BRAND_BLUE}18;padding:5px 11px;border-radius:100px;margin-bottom:14px;}
.preview-mobile h3{font-family:'Libre Baskerville',serif;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-.01em;}
.preview-mobile p{font-size:14px;color:${MUTED};margin:0 0 22px;}
.preview-mobile .btn{justify-content:center;}

/* ── PROCESS ───────────────────────────────────────────────────────── */
.section{padding:72px 0;border-top:1px solid ${BORDER};}
.section-head{text-align:center;margin-bottom:48px;}
.section-head .eyebrow{margin-bottom:14px;}
.section-head h2{font-family:'Libre Baskerville',serif;font-size:clamp(1.8rem,3.4vw,2.4rem);font-weight:700;letter-spacing:-.01em;margin-bottom:10px;}
.section-head p{font-size:16px;color:${MUTED};max-width:560px;margin:0 auto;}

.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;position:relative;}
.steps::before{content:'';position:absolute;top:34px;left:12%;right:12%;height:2px;background:linear-gradient(90deg,${ACCENT}33,${ACCENT}33,${ACCENT}11 80%,transparent);z-index:0;}
.step{position:relative;background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:28px 24px;z-index:1;transition:border-color .2s,transform .2s;}
.step:hover{border-color:${ACCENT};transform:translateY(-2px);}
.step-num{width:40px;height:40px;border-radius:50%;background:${ACCENT};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;margin-bottom:18px;font-family:'Libre Baskerville',serif;}
.step h3{font-size:17px;font-weight:700;margin-bottom:8px;letter-spacing:-.005em;}
.step p{font-size:14px;color:${MUTED};line-height:1.65;}
.step-note{display:inline-block;margin-top:12px;font-size:12px;color:${ACCENT};font-weight:600;}

/* ── PRICING ───────────────────────────────────────────────────────── */
.billing-toggle{display:inline-flex;align-items:center;background:${CARD};border:1px solid ${BORDER};border-radius:100px;padding:5px;margin:0 auto 40px;position:relative;box-shadow:0 1px 3px rgba(23,50,77,.04);}
.billing-toggle button{background:transparent;border:none;cursor:pointer;font:inherit;font-size:13.5px;font-weight:600;color:${MUTED};padding:10px 22px;border-radius:100px;transition:color .2s,background .2s;position:relative;z-index:1;}
.billing-toggle button.active{color:#fff;background:${ACCENT};}
.billing-toggle button:not(.active):hover{color:${TEXT};}
.billing-toggle .save-chip{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:#fff;color:${ACCENT};padding:2px 7px;border-radius:100px;margin-left:6px;vertical-align:1px;}
.billing-toggle button.active .save-chip{background:#fff;color:${ACCENT};}
.toggle-wrap{text-align:center;}

.plans{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;max-width:860px;margin:0 auto;}
.plan{background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:34px 30px;position:relative;display:flex;flex-direction:column;transition:border-color .2s,box-shadow .2s,transform .2s;}
.plan:hover{border-color:${ACCENT};box-shadow:0 16px 40px rgba(23,50,77,.08);transform:translateY(-2px);}
.plan.featured{border-color:${ACCENT};box-shadow:0 16px 44px rgba(23,50,77,.12);}
.plan-tag{position:absolute;top:-11px;right:24px;background:${ACCENT};color:#fff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:999px;}
.plan-name{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;margin-bottom:4px;}
.plan-tagline{font-size:13.5px;color:${MUTED};margin-bottom:22px;}
.plan-price{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;}
.plan-price .num{font-family:'Libre Baskerville',serif;font-size:44px;font-weight:700;letter-spacing:-.02em;}
.plan-price .per{font-size:14px;color:${MUTED};}
.plan-save{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:${BG};color:${ACCENT};padding:4px 10px;border-radius:100px;margin-bottom:8px;}
.plan-setup{font-size:13px;color:${MUTED};margin-bottom:26px;padding-bottom:22px;border-bottom:1px dashed ${BORDER};}
.plan-setup strong{color:${TEXT};font-weight:600;}
.plan ul{list-style:none;padding:0;margin:0 0 28px;flex:1;}
.plan li{font-size:14px;color:${TEXT};padding:9px 0 9px 28px;position:relative;line-height:1.5;}
.plan li::before{content:'';position:absolute;left:0;top:13px;width:14px;height:8px;border-left:2px solid ${ACCENT};border-bottom:2px solid ${ACCENT};transform:rotate(-45deg);}
.plan .btn{width:100%;justify-content:center;}
.plan-fine{font-size:11.5px;color:${MUTED};text-align:center;margin-top:14px;}

/* Toggle states — show/hide monthly vs annual pricing */
.plans[data-billing="monthly"] .annual-only{display:none;}
.plans[data-billing="annual"] .monthly-only{display:none;}

/* Mobile pricing carousel dots (hidden on desktop) */
.plans-dots{display:none;}

/* ── TRUST / FAQ ───────────────────────────────────────────────────── */
.trust-row{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:900px;margin:0 auto;}
.trust{text-align:center;padding:22px 14px;}
.trust-icon{font-size:22px;margin-bottom:10px;color:${ACCENT};}
.trust h4{font-size:14px;font-weight:700;margin-bottom:4px;}
.trust p{font-size:12.5px;color:${MUTED};line-height:1.55;}

.faq{max-width:720px;margin:0 auto;}
.faq-item{border-top:1px solid ${BORDER};padding:22px 0;}
.faq-item:last-child{border-bottom:1px solid ${BORDER};}
.faq-item h4{font-size:16px;font-weight:600;margin-bottom:8px;letter-spacing:-.005em;}
.faq-item p{font-size:14.5px;color:${MUTED};line-height:1.7;}

/* ── FOOTER ────────────────────────────────────────────────────────── */
.footer{padding:40px 0 60px;border-top:1px solid ${BORDER};text-align:center;}
.footer p{font-size:13px;color:${MUTED};margin-bottom:6px;}
.footer a{color:${ACCENT};font-weight:500;}

/* ── MOBILE ────────────────────────────────────────────────────────── */
@media (max-width: 900px){
  .hero{padding:32px 0 24px;}
  .hero-grid{grid-template-columns:1fr;gap:32px;}
  .section{padding:48px 0;}
  .steps{grid-template-columns:1fr;gap:14px;}
  .steps::before{display:none;}
  .plans{display:flex!important;grid-template-columns:none!important;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:4px 16px 8px;gap:14px;max-width:100%;}
  .plans::-webkit-scrollbar{display:none;}
  .plans > .plan{flex:0 0 88%;scroll-snap-align:center;}
  .plans-dots{display:flex;justify-content:center;gap:8px;padding:18px 0 4px;}
  .plans-dots span{width:8px;height:8px;border-radius:50%;background:#cbd5e1;transition:background .25s,transform .25s;}
  .plans-dots span.active{background:${ACCENT};transform:scale(1.3);}
  .trust-row{grid-template-columns:repeat(2,1fr);}
  .preview{display:none;}
  .preview-mobile{display:block;}
}
@media (max-width: 560px){
  .wrap{padding:0 20px;}
  .nav-inner{padding:14px 20px;}
  .hero h1{font-size:2rem;}
  .preview-bar .url{font-size:10px;}
  .plan{padding:28px 22px;}
  .plan-price .num{font-size:38px;}
}

/* ── FADE-IN ON SCROLL ─────────────────────────────────────────────── */
.reveal{opacity:0;transform:translateY(12px);transition:opacity .6s ease,transform .6s ease;}
.reveal.in{opacity:1;transform:translateY(0);}

/* ── CHECKOUT MODAL ────────────────────────────────────────────────── */
.co-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;}
.co-modal.open{display:flex;}
.co-backdrop{position:absolute;inset:0;background:rgba(23,50,77,.55);backdrop-filter:blur(6px);animation:coFade .25s ease;}
.co-dialog{position:relative;background:${CARD};width:100%;max-width:520px;max-height:92vh;border-radius:18px 18px 0 0;box-shadow:0 -20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;animation:coSlide .3s cubic-bezier(.2,.8,.2,1);overflow:hidden;}
@media (min-width: 640px){
  .co-modal{align-items:center;padding:24px;}
  .co-dialog{border-radius:18px;max-height:92vh;}
}
.co-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:${BG};color:${ACCENT};font-size:22px;font-weight:500;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;z-index:2;}
.co-close:hover{background:${BORDER};}
.co-summary{padding:26px 30px 20px;border-bottom:1px solid ${BORDER};}
.co-summary-label{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${BRAND_BLUE};margin-bottom:6px;}
.co-summary-plan{font-family:'Libre Baskerville',serif;font-size:19px;font-weight:700;margin-bottom:4px;letter-spacing:-.005em;}
.co-summary-total{font-size:13px;color:${MUTED};}
.co-summary-total strong{color:${TEXT};font-weight:600;}
.co-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.co-mount{min-height:420px;}
.co-state{padding:44px 30px;text-align:center;}
.co-state h3{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;margin-bottom:8px;}
.co-state p{font-size:14px;color:${MUTED};line-height:1.7;max-width:360px;margin:0 auto 18px;}
.co-spinner{display:inline-block;width:28px;height:28px;border:3px solid ${BORDER};border-top-color:${ACCENT};border-radius:50%;animation:coSpin .8s linear infinite;margin-bottom:18px;}
.co-success-icon{width:48px;height:48px;border-radius:50%;background:${BRAND_BLUE};color:#fff;font-size:24px;line-height:48px;margin:0 auto 18px;font-family:system-ui;}
.co-state .btn{margin-top:4px;}
body.co-open{overflow:hidden;}

@keyframes coFade{from{opacity:0}to{opacity:1}}
@keyframes coSlide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes coSpin{to{transform:rotate(360deg)}}
</style>
</head>
<body>

<a href="#main" class="skip-link">Skip to main content</a>

<!-- ─── NAV ─────────────────────────────────────────────────────────────── -->
<nav class="nav" aria-label="Primary">
  <div class="nav-inner">
    <a href="https://www.gethellosite.com" class="brand" aria-label="HelloSite home">Hello<em>Site</em></a>
    <div class="nav-right">
      <a href="#packages">Packages</a>
      <a href="mailto:${SUPPORT_EMAIL}" aria-label="Contact support by email">Questions?</a>
    </div>
  </div>
</nav>

<main id="main">

<!-- ─── HERO ────────────────────────────────────────────────────────────── -->
<section class="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div class="reveal">
        <span class="tagline"><strong>More locals.</strong> More walk-ins. More business.</span>
        <h1><span class="l1">Launch your site</span><em>${esc(name)}</em></h1>
        <p class="hero-sub">We built this from your reviews, photos, and business details. Pick a package below — we'll handle the domain, hosting, and ongoing care.</p>
        <div class="hero-cta">
          <a href="#packages" class="btn btn-primary">Choose a package →</a>
          <a href="${esc(demoUrl)}" target="_blank" rel="noopener" class="btn btn-ghost">View full demo</a>
        </div>
        <p class="hero-trust">
          <span>From <strong>$${STARTER_MONTHLY_PRICE}/mo + $${STARTER_SETUP_FEE} setup</strong></span>
          <span class="dot">·</span>
          <span>No contract</span>
          <span class="dot">·</span>
          <span>Live in 24 hours</span>
        </p>
      </div>
      <div class="preview reveal">
        <div class="preview-bar" aria-hidden="true">
          <i></i><i></i><i></i>
          <div class="url">${esc(name.toLowerCase().replace(/[^a-z0-9]+/g,''))}.com</div>
        </div>
        <div class="preview-frame">
          <iframe src="${esc(demoUrl)}" title="Live demo of ${esc(name)}" loading="lazy"></iframe>
        </div>
        <p class="preview-caption">Live preview · <a href="${esc(demoUrl)}" target="_blank" rel="noopener">Open full size ↗</a></p>
      </div>
      <div class="preview-mobile reveal">
        <span class="pm-badge">Your Site</span>
        <h3>${esc(name)}</h3>
        <p>Fully built and ready to launch.</p>
        <a href="${esc(demoUrl)}" target="_blank" rel="noopener" class="btn btn-ghost">Preview your site →</a>
      </div>
    </div>
  </div>
</section>

<!-- ─── PROCESS ─────────────────────────────────────────────────────────── -->
<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">What happens next</span>
      <h2>Three steps. Then you're live.</h2>
      <p>Most sites go live within 24 hours of your onboarding form submission.</p>
    </div>
    <div class="steps">
      <div class="step reveal">
        <div class="step-num">1</div>
        <h3>Check out securely</h3>
        <p>Pick Starter or Executive and pay via Stripe. Setup fee + your first month are collected together, so you're covered from day one.</p>
        <span class="step-note">~2 minutes</span>
      </div>
      <div class="step reveal">
        <div class="step-num">2</div>
        <h3>Onboarding email</h3>
        <p>We email you domain name options (3–5 ideas) and a short intake form to confirm the domain, add any custom details, and upload photos if you have them.</p>
        <span class="step-note">You, whenever it's convenient</span>
      </div>
      <div class="step reveal">
        <div class="step-num">3</div>
        <h3>We launch your site</h3>
        <p>We finalize the build, register the domain, and flip it live. You'll get an email with your new URL and everything you need to share it.</p>
        <span class="step-note">Live within 24 hours</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── PRICING ─────────────────────────────────────────────────────────── -->
<section class="section" id="packages">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Packages</span>
      <h2>Simple pricing. No surprises.</h2>
      <p>Both packages include domain registration, hosting, SSL, and ongoing maintenance. Upgrade, downgrade, or cancel anytime.</p>
    </div>

    <div class="toggle-wrap reveal">
      <div class="billing-toggle" role="tablist" aria-label="Billing frequency">
        <button class="active" data-billing="monthly" role="tab" aria-selected="true">Monthly</button>
        <button data-billing="annual" role="tab" aria-selected="false">Annual<span class="save-chip">Save ${ANNUAL_DISCOUNT_PCT}%</span></button>
      </div>
    </div>

    <div class="plans" data-billing="monthly">
      <!-- ── STARTER ────────────────────────────────────────────────────── -->
      <div class="plan reveal">
        <div class="plan-name">Starter</div>
        <div class="plan-tagline">Everything small businesses need to look legit online.</div>

        <div class="monthly-only">
          <div class="plan-price"><span class="num">$${STARTER_MONTHLY_PRICE}</span><span class="per">/month</span></div>
          <div class="plan-setup"><strong>$${STARTER_SETUP_FEE}</strong> one-time setup</div>
        </div>
        <div class="annual-only">
          <span class="plan-save">Save $${STARTER_ANNUAL_SAVINGS}/yr</span>
          <div class="plan-price"><span class="num">$${STARTER_ANNUAL_PRICE}</span><span class="per">/year</span></div>
          <div class="plan-setup"><strong>$${STARTER_SETUP_FEE}</strong> one-time setup · $${(STARTER_ANNUAL_PRICE/12).toFixed(2)}/mo effective</div>
        </div>

        <ul>
          <li>1-page website, polished and mobile-ready</li>
          <li>Custom domain (yourbusiness.com)</li>
          <li>Reviews and business details automatically pulled</li>
          <li>Hosting, SSL, and maintenance included</li>
          <li>Email support</li>
        </ul>

        <button type="button" class="btn btn-primary monthly-only" data-plan="starter" data-cadence="monthly">Secure Starter — $${STARTER_SETUP_FEE + STARTER_MONTHLY_PRICE} today</button>
        <button type="button" class="btn btn-primary annual-only"  data-plan="starter" data-cadence="annual">Secure Starter — $${STARTER_SETUP_FEE + STARTER_ANNUAL_PRICE} today</button>
        <p class="plan-fine monthly-only">$${STARTER_SETUP_FEE} setup + $${STARTER_MONTHLY_PRICE} first month billed together · then $${STARTER_MONTHLY_PRICE}/mo</p>
        <p class="plan-fine annual-only">$${STARTER_SETUP_FEE} setup + $${STARTER_ANNUAL_PRICE} year one billed together · then $${STARTER_ANNUAL_PRICE}/yr</p>
      </div>

      <!-- ── EXECUTIVE ──────────────────────────────────────────────────── -->
      <div class="plan featured reveal">
        <div class="plan-tag">Recommended</div>
        <div class="plan-name">Executive</div>
        <div class="plan-tagline">For service businesses that need bookings, forms, and more room to grow.</div>

        <div class="monthly-only">
          <div class="plan-price"><span class="num">$${EXECUTIVE_MONTHLY_PRICE}</span><span class="per">/month</span></div>
          <div class="plan-setup"><strong>$${EXECUTIVE_SETUP_FEE}</strong> one-time setup</div>
        </div>
        <div class="annual-only">
          <span class="plan-save">Save $${EXECUTIVE_ANNUAL_SAVINGS}/yr</span>
          <div class="plan-price"><span class="num">$${EXECUTIVE_ANNUAL_PRICE}</span><span class="per">/year</span></div>
          <div class="plan-setup"><strong>$${EXECUTIVE_SETUP_FEE}</strong> one-time setup · $${(EXECUTIVE_ANNUAL_PRICE/12).toFixed(2)}/mo effective</div>
        </div>

        <ul>
          <li>3–5 page site with full navigation</li>
          <li>Online booking or lead capture form</li>
          <li>Photo gallery and testimonials section</li>
          <li>Custom domain, hosting, SSL, maintenance</li>
          <li>One content update per month included</li>
          <li>Priority email support</li>
        </ul>

        <button type="button" class="btn btn-primary monthly-only" data-plan="executive" data-cadence="monthly">Secure Executive — $${EXECUTIVE_SETUP_FEE + EXECUTIVE_MONTHLY_PRICE} today</button>
        <button type="button" class="btn btn-primary annual-only"  data-plan="executive" data-cadence="annual">Secure Executive — $${EXECUTIVE_SETUP_FEE + EXECUTIVE_ANNUAL_PRICE} today</button>
        <p class="plan-fine monthly-only">$${EXECUTIVE_SETUP_FEE} setup + $${EXECUTIVE_MONTHLY_PRICE} first month billed together · then $${EXECUTIVE_MONTHLY_PRICE}/mo</p>
        <p class="plan-fine annual-only">$${EXECUTIVE_SETUP_FEE} setup + $${EXECUTIVE_ANNUAL_PRICE} year one billed together · then $${EXECUTIVE_ANNUAL_PRICE}/yr</p>
      </div>
    </div>

    <div class="plans-dots">
      <span class="active"></span>
      <span></span>
    </div>
  </div>
</section>

<!-- ─── TRUST ───────────────────────────────────────────────────────────── -->
<section class="section" style="padding:56px 0;">
  <div class="wrap">
    <div class="trust-row">
      <div class="trust reveal"><div class="trust-icon" aria-hidden="true">◈</div><h4>No contract</h4><p>Month to month. Cancel anytime, no lock-ins.</p></div>
      <div class="trust reveal"><div class="trust-icon" aria-hidden="true">◎</div><h4>Live in 24 hours</h4><p>Most sites go live within a day of onboarding.</p></div>
      <div class="trust reveal"><div class="trust-icon" aria-hidden="true">◇</div><h4>Built by humans</h4><p>A real person reviews every site before launch.</p></div>
      <div class="trust reveal"><div class="trust-icon" aria-hidden="true">◉</div><h4>Secure checkout</h4><p>Payments handled by Stripe. Your card stays safe.</p></div>
    </div>
  </div>
</section>

<!-- ─── FAQ ─────────────────────────────────────────────────────────────── -->
<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Good questions</span>
      <h2>Quick answers.</h2>
    </div>
    <div class="faq">
      <div class="faq-item reveal">
        <h4>Who owns the domain?</h4>
        <p>${BRAND_NAME} registers and manages the domain on your behalf as part of the service. While you're an active customer, the domain is fully yours to use — we just handle the renewals and technical bits so you don't have to.</p>
      </div>
      <div class="faq-item reveal">
        <h4>Can I change the content after launch?</h4>
        <p>Absolutely. Email any updates to <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT};">${SUPPORT_EMAIL}</a> — Starter plans get one small tweak per quarter, Executive includes one update per month, and larger edits are always quoted up front.</p>
      </div>
      <div class="faq-item reveal">
        <h4>What if I already own a domain?</h4>
        <p>Mention it in the onboarding form. We'll either transfer it in (most common) or point it to your new site — whichever works better for your situation.</p>
      </div>
      <div class="faq-item reveal">
        <h4>How do I cancel?</h4>
        <p>Email <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT};">${SUPPORT_EMAIL}</a>. No phone tree, no retention gauntlet. We'll stop billing at the end of the current cycle.</p>
      </div>
    </div>
  </div>
</section>

</main>

<!-- ─── CHECKOUT MODAL ──────────────────────────────────────────────────── -->
<div class="co-modal" id="coModal" aria-hidden="true">
  <div class="co-backdrop" data-co-close></div>
  <div class="co-dialog" role="dialog" aria-modal="true" aria-labelledby="coSummaryPlan">
    <button type="button" class="co-close" data-co-close aria-label="Close checkout">×</button>
    <div class="co-summary">
      <div class="co-summary-label">Secure checkout</div>
      <div class="co-summary-plan" id="coSummaryPlan">—</div>
      <div class="co-summary-total" id="coSummaryTotal">—</div>
    </div>
    <div class="co-body">
      <div class="co-state" id="coLoading">
        <div class="co-spinner"></div>
        <h3>Loading secure checkout…</h3>
        <p>Connecting to Stripe. This usually takes a second.</p>
      </div>
      <div class="co-state" id="coError" style="display:none;">
        <h3>We couldn't load checkout</h3>
        <p id="coErrorMsg">Please try again in a moment, or email <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT};font-weight:600;">${SUPPORT_EMAIL}</a>.</p>
        <button type="button" class="btn btn-ghost" data-co-close>Close</button>
      </div>
      <div class="co-state" id="coSuccess" style="display:none;">
        <div class="co-success-icon">✓</div>
        <h3>Payment received — welcome aboard!</h3>
        <p>Check your inbox in the next few minutes. We'll email your domain options and a short onboarding form. Your site will be live within 24 hours of finishing that.</p>
        <button type="button" class="btn btn-primary" data-co-close>Close</button>
      </div>
      <div class="co-mount" id="coMount" style="display:none;"></div>
    </div>
  </div>
</div>

<!-- ─── FOOTER ──────────────────────────────────────────────────────────── -->
<footer class="footer">
  <div class="wrap">
    <p>Questions? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p style="font-size:12px;margin-top:12px;">© ${new Date().getFullYear()} ${BRAND_NAME} · <a href="https://www.gethellosite.com">gethellosite.com</a></p>
  </div>
</footer>

<script src="https://js.stripe.com/v3/"></script>
<script>
// Reveal on scroll
(function(){
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(function(e){e.classList.add('in');}); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(function(e){ io.observe(e); });
})();

// Billing toggle — swap Monthly / Annual pricing and CTAs
(function(){
  var toggle = document.querySelector('.billing-toggle');
  var plans  = document.querySelector('.plans');
  if (!toggle || !plans) return;
  toggle.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-billing]');
    if (!btn) return;
    var mode = btn.getAttribute('data-billing');
    toggle.querySelectorAll('button').forEach(function(b){
      var on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    plans.setAttribute('data-billing', mode);
  });
})();

// Mobile pricing carousel — sync active dot to scroll position
(function(){
  var plans = document.querySelector('.plans');
  var dots  = document.querySelectorAll('.plans-dots span');
  if (!plans || !dots.length) return;
  var cards = plans.querySelectorAll('.plan');
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(es){
    var best = null, br = 0;
    es.forEach(function(e){
      if (e.intersectionRatio > br) { br = e.intersectionRatio; best = e.target; }
    });
    if (best) {
      var i = Array.prototype.indexOf.call(cards, best);
      if (i >= 0) dots.forEach(function(d, j){ d.classList.toggle('active', j === i); });
    }
  }, { root: plans, threshold: [0.25, 0.5, 0.75] });
  cards.forEach(function(c){ io.observe(c); });
})();

// Embedded Stripe Checkout
(function(){
  var STRIPE_PK = ${JSON.stringify(STRIPE_PUBLISHABLE_KEY)};
  var PLACE_ID  = ${JSON.stringify(placeId)};

  var PLAN_LABELS = {
    starter:   { name: 'Starter',   monthlyTotal: ${STARTER_SETUP_FEE + STARTER_MONTHLY_PRICE},   monthlyThen: '${STARTER_MONTHLY_PRICE}/mo',   annualTotal: ${STARTER_SETUP_FEE + STARTER_ANNUAL_PRICE},   annualThen: '${STARTER_ANNUAL_PRICE}/yr' },
    executive: { name: 'Executive', monthlyTotal: ${EXECUTIVE_SETUP_FEE + EXECUTIVE_MONTHLY_PRICE}, monthlyThen: '${EXECUTIVE_MONTHLY_PRICE}/mo', annualTotal: ${EXECUTIVE_SETUP_FEE + EXECUTIVE_ANNUAL_PRICE}, annualThen: '${EXECUTIVE_ANNUAL_PRICE}/yr' }
  };

  var modal   = document.getElementById('coModal');
  var mount   = document.getElementById('coMount');
  var loading = document.getElementById('coLoading');
  var errBox  = document.getElementById('coError');
  var errMsg  = document.getElementById('coErrorMsg');
  var success = document.getElementById('coSuccess');
  var sumPlan = document.getElementById('coSummaryPlan');
  var sumTotal= document.getElementById('coSummaryTotal');

  var stripe = null;
  var embedded = null;

  function showState(which){
    loading.style.display = which === 'loading' ? '' : 'none';
    errBox.style.display  = which === 'error'   ? '' : 'none';
    success.style.display = which === 'success' ? '' : 'none';
    mount.style.display   = which === 'form'    ? '' : 'none';
  }

  function openModal(plan, cadence){
    if (!window.Stripe) { alert('Checkout failed to load. Please refresh and try again.'); return; }
    if (!stripe) stripe = Stripe(STRIPE_PK);

    var label = PLAN_LABELS[plan];
    sumPlan.textContent  = label.name + ' — ' + (cadence === 'annual' ? 'Annual' : 'Monthly');
    sumTotal.innerHTML   = '<strong>$' + (cadence === 'annual' ? label.annualTotal : label.monthlyTotal) + ' today</strong> · then $' + (cadence === 'annual' ? label.annualThen : label.monthlyThen);

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('co-open');
    showState('loading');

    fetch('/api/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: PLACE_ID, plan: plan, cadence: cadence })
    })
    .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
    .then(function(res){
      if (!res.ok || !res.body.clientSecret) {
        throw new Error(res.body.error || 'Unable to start checkout.');
      }
      showState('form');
      return stripe.initEmbeddedCheckout({
        clientSecret: res.body.clientSecret,
        onComplete: function(){ showState('success'); }
      });
    })
    .then(function(instance){
      embedded = instance;
      embedded.mount('#coMount');
    })
    .catch(function(err){
      errMsg.textContent = err.message || 'Please try again in a moment.';
      showState('error');
    });
  }

  function closeModal(){
    if (embedded) { try { embedded.destroy(); } catch(_){} embedded = null; }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('co-open');
    showState('loading');
  }

  document.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-plan][data-cadence]');
    if (btn) { e.preventDefault(); openModal(btn.dataset.plan, btn.dataset.cadence); return; }
    if (e.target.closest('[data-co-close]')) { closeModal(); }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();
</script>
</body>
</html>`;
}

module.exports = { renderCheckout };
