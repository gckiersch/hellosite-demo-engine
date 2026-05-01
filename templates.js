/**
 * HelloSite — Demo Templates (Refactor 2026-04)
 *
 * 4 personality templates, selected by Google Place types:
 *   Transactional · Accent #E8440A · Barbers, salons, nail/lash, pet groomers
 *   Bold          · Accent #17324D · Plumbers, electricians, contractors, auto
 *   Minimalist    · Accent #6B7C5A · Spas, massage, wellness
 *   Informative   · Accent #1D4ED8 · Accountants, lawyers, insurance, real estate
 *
 * All templates: Plus Jakarta Sans, mobile-first 390px, IntersectionObserver only.
 * Data is strictly from Google Places + Claude-generated copy. Never prices, slots,
 * staff names, or founded year.
 */
'use strict';

// ─── SHARED UTILS ─────────────────────────────────────────────────────────────

function extractPlaceData(place) {
  return {
    name:        place.displayName?.text || 'Local Business',
    shortName:   (place.displayName?.text || 'Business').split(' ').slice(0,3).join(' '),
    phone:       place.nationalPhoneNumber || '',
    address:     place.formattedAddress || '',
    rating:      place.rating || 5.0,
    reviewCount: place.userRatingCount || 0,
    reviews:     (place.reviews || []).slice(0,3),
    hours:       (place.regularOpeningHours?.weekdayDescriptions || []).slice(0,3),
  };
}
function cleanPhone(p){return(p||'').replace(/\D/g,'');}
function stars(n){return'★'.repeat(Math.round(n||5));}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function headline(h,color){
  return(h||'').split(/\\n|\n/).map((l,i)=>i===1?`<span style="color:${color};">${esc(l)}</span>`:esc(l)).join('<br>');
}
function bestReview(reviews){
  const pool=(reviews||[]).filter(r=>(r.rating||0)>=4);
  const sorted=pool.sort((a,b)=>(b.text?.text||'').length-(a.text?.text||'').length);
  const pick=sorted[0]||(reviews||[])[0]||{};
  return{text:(pick.text?.text||'').slice(0,240),author:pick.authorAttribution?.displayName||'Local Customer',rating:pick.rating||5};
}
function galleryStrip(gallery,border,businessName){
  if(!gallery?.length)return'';
  const cols=Math.min(gallery.length,3);
  const altBase=businessName?esc(businessName):'Business';
  return`
<style>
.hs-gstrip-wrap{width:100%;max-width:100%;}
.hs-gstrip{display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;width:100%;max-width:100%;}
.hs-gstrip .hs-gsitem{height:220px;overflow:hidden;position:relative;}
.hs-gstrip .hs-gsitem img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;}
.hs-gstrip-dots{display:none;}
@media(max-width:768px){
  .hs-gstrip{display:flex;grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 16px;gap:10px;}
  .hs-gstrip::-webkit-scrollbar{display:none;}
  .hs-gstrip .hs-gsitem{flex:0 0 86%;height:auto;aspect-ratio:4/3;scroll-snap-align:center;border-radius:6px;}
  .hs-gstrip-dots{display:flex;justify-content:center;gap:8px;padding:14px 0 4px;}
  .hs-gstrip-dots span{width:7px;height:7px;border-radius:50%;background:#cbd5e1;transition:background .25s,transform .25s;}
  .hs-gstrip-dots span.active{background:#334155;transform:scale(1.35);}
}
</style>
<div class="hs-gstrip-wrap">
<div class="hs-gstrip" role="region" aria-label="${altBase} photo gallery">${gallery.slice(0,3).map((url,i)=>`<div class="hs-gsitem"><img src="${url}" loading="lazy" alt="${altBase} photo ${i+1} of ${Math.min(gallery.length,3)}" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}</div>
<div class="hs-gstrip-dots">${gallery.slice(0,3).map((_,i)=>`<span class="${i===0?'active':''}"></span>`).join('')}</div>
</div>
<script>(function(){var wraps=document.querySelectorAll('.hs-gstrip-wrap');wraps.forEach(function(w){var scroller=w.querySelector('.hs-gstrip');var items=w.querySelectorAll('.hs-gsitem');var dots=w.querySelectorAll('.hs-gstrip-dots span');if(!scroller||!items.length||!dots.length)return;if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){var best=null,br=0;es.forEach(function(e){if(e.intersectionRatio>br){br=e.intersectionRatio;best=e.target;}});if(best){var i=Array.prototype.indexOf.call(items,best);if(i>=0)dots.forEach(function(d,j){d.classList.toggle('active',j===i);});}},{root:scroller,threshold:[0.25,0.5,0.75]});items.forEach(function(it){io.observe(it);});}});})();</script>`;
}
function secureSiteUrl(businessId){
  return `https://demo.gethellosite.com/secure/${encodeURIComponent(businessId || '')}`;
}
function claimCTA(accent, businessId){
  return`<a href="${secureSiteUrl(businessId)}" aria-label="Launch your site — go to secure checkout" style="position:fixed;bottom:20px;right:20px;z-index:9999;background:${accent};color:#fff;padding:13px 22px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:.03em;box-shadow:0 8px 28px ${accent}44;font-family:system-ui,sans-serif;line-height:1.4;text-align:center;max-width:220px;text-decoration:none;"><span aria-hidden="true">✦ </span>Launch your site<br><span style="font-size:11px;opacity:.85;font-weight:400;">Live in 24 hours</span></a>`;
}

const FAVICON = `<link rel="icon" type="image/x-icon" href="https://www.gethellosite.com/favicon.ico">`;

function wrapHTML(name,fonts,extraCSS,body){
  return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(name)}</title>
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;overflow-x:hidden;}
body{overflow-x:hidden;-webkit-font-smoothing:antialiased;}
a{text-decoration:none;color:inherit;}
img{display:block;}
/* ── Accessibility: visible keyboard focus ─────────────────────────── */
:focus{outline:none;}
:focus-visible{outline:3px solid currentColor;outline-offset:3px;border-radius:3px;}
/* ── Accessibility: skip-to-main link, visible on focus ────────────── */
.skip-link{position:absolute;left:-9999px;top:0;background:#111;color:#fff;padding:.75rem 1.25rem;z-index:9999;font-weight:600;text-decoration:none;border-radius:0 0 8px 0;font-family:system-ui,sans-serif;font-size:14px;}
.skip-link:focus{left:0;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fu{opacity:0;animation:fadeUp .6s ease forwards;}
.d1{animation-delay:.1s}.d2{animation-delay:.22s}.d3{animation-delay:.34s}
@media(max-width:768px){
  .mob-hide{display:none!important;}
  .g3{grid-template-columns:1fr 1fr!important;}
  .gfooter{grid-template-columns:1fr!important;}
  .mob-pad{padding:36px 20px!important;}
  .hero-pad{padding-top:48px!important;}
}
@media(max-width:480px){h1{font-size:2.4rem!important;}}
${extraCSS||''}
</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to main content</a>
${body}
</body>
</html>`;
}


// ─── PRIVATE HELPERS (template-internal) ──────────────────────────────────────

// Accept legacy copy shape (services:[str], service_descs:[str]) AND
// new shape (services:[{name, desc}]). Returns [{name, desc}, ...] capped at 6.
function _normalizeServices(copy) {
  if (!copy || !Array.isArray(copy.services)) return [];
  const descs = Array.isArray(copy.service_descs) ? copy.service_descs : [];
  return copy.services.slice(0, 6).map((s, i) => {
    if (typeof s === 'string') return { name: s, desc: descs[i] || '' };
    return { name: s?.name || '', desc: s?.desc || '' };
  }).filter(s => s.name);
}

// Build hours rows. Google's weekdayDescriptions is Mon-first.
// JS Date.getDay(): 0=Sun..6=Sat → today index = (d===0?6:d-1).
function _formatHoursRows(weekdayDescriptions) {
  const d = new Date().getDay();
  const todayIdx = d === 0 ? 6 : d - 1;
  return (weekdayDescriptions || []).map((line, i) => {
    const c = line.indexOf(':');
    const day = c > -1 ? line.slice(0, c) : line;
    const time = c > -1 ? line.slice(c + 1).trim() : '';
    const isClosed = /closed/i.test(time);
    return { day, time, isClosed, isToday: i === todayIdx };
  });
}

// Pull a likely "city" from the formatted address. Falls back to address.
function _city(address) {
  if (!address) return '';
  // "892 S Main St, Akron, OH 44311, USA" → "Akron, OH"
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const state = (parts[parts.length - 2] || '').split(' ')[0];
    return state ? `${city}, ${state}` : city;
  }
  return parts[0] || address;
}

// Pad gallery to N slots, reusing earlier photos rather than empty blocks.
function _padPhotos(gallery, n) {
  const arr = Array.isArray(gallery) ? gallery.filter(Boolean) : [];
  if (!arr.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[i] || arr[i % arr.length]);
  return out;
}

// Fonts URL shared across the 4 templates (Plus Jakarta Sans).
const _FONTS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap';


// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRANSACTIONAL  ·  Accent #E8440A
//    Barbers, hair/nail/lash, pet groomers — appointment-driven service businesses.
//    Source: template_transactional_v2.html
// ═══════════════════════════════════════════════════════════════════════════════

function templateTransactional(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const allHours = place.regularOpeningHours?.weekdayDescriptions || [];
  const review   = bestReview(reviews);
  const services = _normalizeServices(copy);
  const tagline  = (copy && copy.tagline) || `${_city(address) || 'Local'} neighborhood service`;
  const cp       = cleanPhone(phone);
  const cityStr  = _city(address);
  const heroAlt  = `${esc(name)} interior`;
  const mapsUrl  = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const hoursRows = _formatHoursRows(allHours);
  const heroImg  = photos?.hero || (photos?.gallery && photos.gallery[0]) || '';
  const gallery  = _padPhotos((photos && photos.gallery) || [], 4);
  const ratingTxt = rating.toFixed(1);

  const servicesHTML = services.length ? `
<section class="services" aria-labelledby="services-title">
  <div class="container">
    <p class="section-eyebrow">The menu</p>
    <h2 class="section-title" id="services-title">What we do.</h2>
    <ul class="service-list" role="list">
      ${services.map((s, i) => `
      <li class="service-item">
        <span class="service-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <div class="service-name">${esc(s.name)}</div>
          ${s.desc ? `<div class="service-desc">${esc(s.desc)}</div>` : ''}
        </div>
      </li>`).join('')}
    </ul>
  </div>
</section>` : '';

  const galleryHTML = gallery.length ? `
<section class="gallery" aria-labelledby="gallery-title">
  <div class="container" style="margin-bottom:20px;">
    <p class="section-eyebrow">The work</p>
    <h2 class="section-title" id="gallery-title">See it for yourself.</h2>
  </div>
  <div class="gallery-scroll" role="region" aria-label="${esc(name)} photo gallery">
    ${gallery.map((u, i) => `<div class="gallery-item"><img src="${u}" alt="${esc(name)} photo ${i + 1}" loading="lazy" decoding="async"></div>`).join('')}
  </div>
  <div class="gallery-dots" aria-hidden="true">
    ${gallery.map((_, i) => `<div class="gallery-dot${i === 0 ? ' active' : ''}"></div>`).join('')}
  </div>
</section>` : '';

  const reviewHTML = review.text ? `
<section class="review" aria-labelledby="review-title">
  <div class="container">
    <div class="review-divider" aria-hidden="true"></div>
    <div class="review-stars" aria-label="${review.rating} stars">${stars(review.rating)}</div>
    <blockquote>
      <p class="review-quote" id="review-title">"${esc(review.text)}"</p>
      <footer class="review-author"><cite>— ${esc(review.author)}</cite></footer>
    </blockquote>
  </div>
</section>` : '';

  const hoursHTML = hoursRows.length ? `
<div>
  <h3 class="hours-title">Hours</h3>
  <ul class="hours-list" aria-label="Business hours">
    ${hoursRows.map(r => `
    <li class="hours-row${r.isToday ? ' today' : ''}">
      <span class="hours-day">${esc(r.day)}</span>
      <span class="hours-time${r.isClosed ? ' closed' : ''}${r.isToday ? ' today' : ''}">${esc(r.time) || 'Closed'}</span>
    </li>`).join('')}
  </ul>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(name)} — ${esc(tagline)}">
<title>${esc(name)}</title>
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${_FONTS}" rel="stylesheet">
<style>
:root{
  --accent:#B91C1C;--black:#0D0D0D;--off-black:#1A1A1A;--white:#FFFFFF;
  --grey-1:#F7F6F4;--grey-2:#E8E6E2;--grey-3:#9E9B96;--text:#1A1A1A;
  --font:'Plus Jakarta Sans',sans-serif;
  --r-sm:8px;--r-md:14px;--r-lg:20px;--r-full:999px;
  --max-w:1100px;--pad:20px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);background:var(--white);color:var(--text);overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
a{text-decoration:none;color:inherit;}
img{display:block;max-width:100%;}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.container{width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--pad);}
:focus{outline:none;}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px;}

/* TOPBAR */
.topbar{position:fixed;top:0;left:0;right:0;z-index:200;background:var(--black);padding:11px var(--pad);display:flex;align-items:center;justify-content:space-between;gap:12px;}
.topbar-status{display:flex;align-items:center;gap:8px;}
.status-dot{width:7px;height:7px;background:#4ADE80;border-radius:50%;animation:pulse-dot 2.5s ease-in-out infinite;flex-shrink:0;}
@keyframes pulse-dot{0%,100%{opacity:1;}50%{opacity:.35;}}
.status-text{font-size:12px;font-weight:500;color:rgba(255,255,255,.55);letter-spacing:.02em;}
.topbar-phone{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--white);letter-spacing:.01em;padding:5px 12px;border-radius:var(--r-full);border:1px solid rgba(255,255,255,.15);transition:background .15s,border-color .15s;}
.topbar-phone:hover,.topbar-phone:focus-visible{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.3);}
.topbar-phone svg{width:12px;height:12px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}

/* HERO */
.hero{position:relative;height:100svh;min-height:560px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;padding-top:44px;}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 20%;}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.6) 30%,rgba(0,0,0,.2) 60%,transparent 100%);}
.hero-content{position:relative;z-index:2;padding:0 var(--pad) 32px;}
.hero-rating{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);border-radius:var(--r-full);padding:5px 12px;margin-bottom:14px;}
.hero-stars{color:#FFC940;font-size:12px;letter-spacing:1px;}
.hero-rating-score{font-size:12px;font-weight:600;color:var(--white);letter-spacing:.02em;}
.hero-rating-count{font-size:11px;color:rgba(255,255,255,.45);}
.hero-name{font-size:clamp(38px,10vw,56px);font-weight:800;color:var(--white);line-height:.97;letter-spacing:-.04em;margin-bottom:6px;}
.hero-tagline{font-size:14px;color:rgba(255,255,255,.45);font-weight:400;letter-spacing:.02em;margin-bottom:24px;}
.hero-ctas{display:flex;flex-direction:column;gap:10px;}
.btn-book{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:var(--white);font-size:15px;font-weight:600;letter-spacing:.01em;padding:15px 20px;border-radius:var(--r-md);transition:opacity .15s,transform .1s;-webkit-tap-highlight-color:transparent;}
.btn-book:active{opacity:.85;transform:scale(.99);}
.btn-book svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;}
.btn-call{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.1);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);color:var(--white);font-size:14px;font-weight:500;padding:13px 20px;border-radius:var(--r-md);transition:background .15s;-webkit-tap-highlight-color:transparent;}
.btn-call svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;flex-shrink:0;}
.btn-call:active{background:rgba(255,255,255,.18);}

/* TRUST BAR */
.trust{background:var(--off-black);padding:20px var(--pad);display:flex;align-items:center;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.trust::-webkit-scrollbar{display:none;}
.trust-item{display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-width:72px;}
.trust-item+.trust-item{border-left:1px solid rgba(255,255,255,.08);padding-left:8px;}
.trust-n{font-size:21px;font-weight:800;color:var(--white);line-height:1;letter-spacing:-.02em;}
.trust-l{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;}

/* SERVICES */
.services{padding:56px 0;}
.section-eyebrow{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--grey-3);margin-bottom:10px;}
.section-title{font-size:clamp(28px,6vw,40px);font-weight:800;line-height:1.05;letter-spacing:-.04em;color:var(--text);margin-bottom:32px;}
.service-list{list-style:none;border-top:1px solid var(--grey-2);}
.service-item{display:flex;align-items:flex-start;gap:16px;padding:16px 0;border-bottom:1px solid var(--grey-2);}
.service-num{font-size:13px;font-weight:700;color:var(--accent);letter-spacing:.04em;flex-shrink:0;width:28px;padding-top:2px;}
.service-name{font-size:15px;font-weight:600;color:var(--text);}
.service-desc{font-size:12px;color:var(--grey-3);margin-top:2px;font-weight:400;line-height:1.55;}

/* GALLERY */
.gallery{padding-bottom:56px;}
.gallery-scroll{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;scrollbar-width:none;padding:0 var(--pad);margin:0 calc(var(--pad) * -1);}
.gallery-scroll::-webkit-scrollbar{display:none;}
.gallery-item{flex:0 0 72vw;max-width:280px;aspect-ratio:4/5;overflow:hidden;border-radius:var(--r-md);scroll-snap-align:start;background:var(--grey-2);}
.gallery-item:first-child{margin-left:var(--pad);}
.gallery-item:last-child{margin-right:var(--pad);}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease;}
.gallery-item:hover img{transform:scale(1.03);}
.gallery-dots{display:flex;justify-content:center;gap:6px;margin-top:14px;}
.gallery-dot{width:6px;height:6px;border-radius:50%;background:var(--grey-2);transition:background .2s,width .2s;}
.gallery-dot.active{background:var(--accent);width:18px;border-radius:3px;}

/* REVIEW */
.review{background:var(--black);padding:56px var(--pad);}
.review-stars{color:#FFC940;font-size:16px;letter-spacing:2px;margin-bottom:20px;}
.review-quote{font-size:clamp(20px,5vw,28px);font-weight:700;line-height:1.35;letter-spacing:-.02em;color:var(--white);margin-bottom:20px;}
.review-author{font-size:13px;color:rgba(255,255,255,.35);font-weight:400;}
.review-divider{width:32px;height:2px;background:var(--accent);margin-bottom:24px;border-radius:2px;}

/* CONTACT */
.contact{padding:56px 0;}
.contact-cta{display:flex;align-items:center;gap:14px;background:var(--grey-1);border-radius:var(--r-lg);padding:20px;margin-bottom:32px;text-decoration:none;transition:background .15s;}
.contact-cta:hover{background:var(--grey-2);}
.contact-cta-icon{width:44px;height:44px;background:var(--accent);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.contact-cta-icon svg{width:20px;height:20px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}
.contact-cta-label{font-size:11px;font-weight:600;color:var(--grey-3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px;}
.contact-cta-value{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.02em;}
.contact-addr{display:flex;align-items:flex-start;gap:14px;background:var(--grey-1);border-radius:var(--r-lg);padding:20px;margin-bottom:32px;}
.contact-addr-icon{width:44px;height:44px;background:var(--grey-2);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.contact-addr-icon svg{width:20px;height:20px;stroke:var(--grey-3);fill:none;stroke-width:2;stroke-linecap:round;}
.contact-addr-text{font-size:14px;color:var(--text);line-height:1.55;}
.contact-addr-map{display:inline-block;font-size:12px;font-weight:600;color:var(--accent);margin-top:5px;}
.hours-title{font-size:18px;font-weight:800;letter-spacing:-.02em;color:var(--text);margin-bottom:16px;}
.hours-list{list-style:none;}
.hours-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--grey-2);font-size:13px;}
.hours-row:last-child{border-bottom:none;}
.hours-day{color:var(--grey-3);font-weight:400;}
.hours-row.today .hours-day{color:var(--text);font-weight:600;}
.hours-time{font-weight:600;color:var(--text);}
.hours-time.today{color:var(--accent);}
.hours-time.closed{color:var(--grey-3);font-weight:400;}

/* FOOTER */
footer{background:var(--black);padding:24px var(--pad);display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.foot-name{font-size:15px;font-weight:800;color:rgba(255,255,255,.3);letter-spacing:-.02em;}
.foot-credit{font-size:11px;color:rgba(255,255,255,.12);}

/* STICKY BOTTOM CTA (mobile only) */
.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:150;background:var(--white);border-top:1px solid var(--grey-2);padding:12px var(--pad) max(12px,env(safe-area-inset-bottom));}
.sticky-cta.visible{display:flex;}
.sticky-cta-inner{display:flex;gap:10px;width:100%;max-width:var(--max-w);margin:0 auto;}
.sticky-cta .btn-book{flex:2;}
.sticky-cta .btn-call-sm{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--grey-1);color:var(--text);border-radius:var(--r-md);font-size:14px;font-weight:600;padding:15px 12px;border:1px solid var(--grey-2);}

/* ANIMATIONS */
@keyframes fade-up{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.fade-up{opacity:0;animation:fade-up .5s ease forwards;}
.delay-1{animation-delay:.1s;}.delay-2{animation-delay:.2s;}.delay-3{animation-delay:.3s;}.delay-4{animation-delay:.4s;}

/* DESKTOP */
@media(min-width:768px){
  :root{--pad:40px;}
  .sticky-cta{display:none!important;}
  .hero{height:100svh;min-height:640px;flex-direction:row;align-items:stretch;justify-content:stretch;}
  .hero-overlay{background:linear-gradient(to right,rgba(0,0,0,.88) 0%,rgba(0,0,0,.6) 45%,rgba(0,0,0,.15) 70%,transparent 100%);}
  .hero-img{object-position:center center;}
  .hero-content{display:flex;flex-direction:column;justify-content:center;padding:0 48px;max-width:560px;}
  .hero-ctas{flex-direction:row;}
  .btn-book{flex:1;} .btn-call{flex:1;}
  .trust{justify-content:center;gap:0;}
  .trust-item{min-width:160px;padding:0 40px;}
  .trust-n{font-size:28px;}
  .service-list{display:grid;grid-template-columns:1fr 1fr;gap:0 48px;}
  .gallery-scroll{overflow:visible;flex-wrap:wrap;margin:0;padding:0 var(--pad);}
  .gallery-item{flex:0 0 calc(25% - 6px);max-width:none;}
  .gallery-item:first-child{margin-left:0;} .gallery-item:last-child{margin-right:0;}
  .gallery-dots{display:none;}
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;}
  .topbar{padding:12px var(--pad);}
  .status-text{font-size:13px;}
  .topbar-phone{font-size:14px;padding:6px 16px;}
}
@media(min-width:1024px){
  .hero-content{max-width:620px;padding:0 64px;}
  .hero-name{font-size:68px;}
}
</style>
</head>
<body>
<a class="visually-hidden" href="#main">Skip to main content</a>

<div class="topbar" role="banner" aria-label="Business status and contact">
  <div class="topbar-status">
    <span class="status-dot" aria-hidden="true"></span>
    <span class="status-text">Open now${cityStr ? ` · ${esc(cityStr)}` : ''}</span>
  </div>
  ${phone ? `<a href="tel:${cp}" class="topbar-phone" aria-label="Call ${esc(name)} at ${esc(phone)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
    ${esc(phone)}
  </a>` : ''}
</div>

<main id="main">
<header class="hero" role="banner">
  ${heroImg ? `<img class="hero-img" src="${heroImg}" alt="${heroAlt}" fetchpriority="high" decoding="async">` : ''}
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="hero-content">
    <div class="hero-rating fade-up" role="img" aria-label="${ratingTxt} stars, ${reviewCount} Google reviews">
      <span class="hero-stars" aria-hidden="true">${stars(rating)}</span>
      <span class="hero-rating-score">${ratingTxt}</span>
      <span class="hero-rating-count">· ${reviewCount} reviews</span>
    </div>
    <h1 class="hero-name fade-up delay-1">${esc(name)}</h1>
    <p class="hero-tagline fade-up delay-2">${esc(tagline)}</p>
    <div class="hero-ctas fade-up delay-3" role="group" aria-label="Booking options">
      ${phone ? `<a href="tel:${cp}" class="btn-book" aria-label="Book now — call ${esc(phone)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        Book now
      </a>
      <a href="tel:${cp}" class="btn-call" aria-label="Call us at ${esc(phone)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
        ${esc(phone)}
      </a>` : ''}
    </div>
  </div>
</header>

<section class="trust" aria-label="Business highlights">
  <div class="trust-item"><span class="trust-n">${ratingTxt}★</span><span class="trust-l">Rating</span></div>
  <div class="trust-item"><span class="trust-n">${reviewCount}</span><span class="trust-l">Reviews</span></div>
  <div class="trust-item"><span class="trust-n">Walk-in</span><span class="trust-l">Welcome</span></div>
  ${cityStr ? `<div class="trust-item"><span class="trust-n">Local</span><span class="trust-l">${esc(cityStr.split(',')[0])}</span></div>` : ''}
</section>

${servicesHTML}
${galleryHTML}
${reviewHTML}

<section class="contact" aria-labelledby="contact-title" id="contact">
  <div class="container">
    <p class="section-eyebrow">Find us</p>
    <h2 class="section-title" id="contact-title">Come in anytime.</h2>
    <div class="contact-grid">
      <div>
        ${phone ? `<a href="tel:${cp}" class="contact-cta" aria-label="Call ${esc(name)}">
          <div class="contact-cta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          </div>
          <div>
            <div class="contact-cta-label">Call or text</div>
            <div class="contact-cta-value">${esc(phone)}</div>
          </div>
        </a>` : ''}
        ${address ? `<address style="font-style:normal;">
          <div class="contact-addr">
            <div class="contact-addr-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div class="contact-addr-text">${esc(address)}</div>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="contact-addr-map">Get directions →</a>
            </div>
          </div>
        </address>` : ''}
      </div>
      ${hoursHTML}
    </div>
  </div>
</section>
</main>

<footer>
  <span class="foot-name">${esc(name)}</span>
  <span class="foot-credit">A HelloSite · gethellosite.com</span>
</footer>

${phone ? `<div class="sticky-cta" role="complementary" aria-label="Quick booking">
  <div class="sticky-cta-inner">
    <a href="tel:${cp}" class="btn-book">Book now</a>
    <a href="tel:${cp}" class="btn-call-sm" aria-label="Call us">
      <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
      Call
    </a>
  </div>
</div>` : ''}

${claimCTA('var(--accent)', place.id)}

<script>
(function(){'use strict';
var scroll=document.querySelector('.gallery-scroll');
var dots=document.querySelectorAll('.gallery-dot');
var items=document.querySelectorAll('.gallery-item');
if(scroll&&dots.length&&'IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){var best=null,r=0;es.forEach(function(e){if(e.intersectionRatio>r){r=e.intersectionRatio;best=e.target;}});if(best){var i=Array.prototype.indexOf.call(items,best);dots.forEach(function(d,j){d.classList.toggle('active',j===i);});}},{root:scroll,threshold:[0.4,0.6]});
  items.forEach(function(it){io.observe(it);});
}
var sticky=document.querySelector('.sticky-cta'),hero=document.querySelector('.hero');
if(sticky&&hero&&window.matchMedia('(max-width:767px)').matches){
  new IntersectionObserver(function(e){sticky.classList.toggle('visible',!e[0].isIntersecting);},{threshold:0}).observe(hero);
}
if('IntersectionObserver' in window){
  var t=document.querySelectorAll('.service-item, .gallery-item, .contact-cta, .contact-addr');
  var fio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.animation='fade-up .45s ease forwards';fio.unobserve(e.target);}});},{threshold:0.1});
  t.forEach(function(el){el.style.opacity='0';fio.observe(el);});
}
})();
</script>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. BOLD  ·  Accent #17324D (sky #4EA7FF)
//    Plumbers, electricians, contractors, auto, pest, locksmiths, landscapers.
//    Source: template_bold_v1.html
// ═══════════════════════════════════════════════════════════════════════════════

function templateBold(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const allHours = place.regularOpeningHours?.weekdayDescriptions || [];
  const review   = bestReview(reviews);
  const services = _normalizeServices(copy);
  const tagline  = (copy && copy.tagline) || `${_city(address) || 'Greater area'}'s trusted local pros.`;
  const cp       = cleanPhone(phone);
  const cityStr  = _city(address);
  const heroAlt  = `${esc(name)} at work`;
  const mapsUrl  = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const hoursRows = _formatHoursRows(allHours);
  const heroImg  = photos?.hero || (photos?.gallery && photos.gallery[0]) || '';
  const gallery  = _padPhotos((photos && photos.gallery) || [], 3);
  const ratingTxt = rating.toFixed(1);

  const servicesHTML = services.length ? `
<section class="services" aria-labelledby="services-heading">
  <div class="container">
    <p class="section-label">What we do</p>
    <h2 class="section-title" id="services-heading">Every job,<br>done right.</h2>
    <ul class="service-list" role="list">
      ${services.map(s => `
      <li class="service-item">
        <div class="service-bullet" aria-hidden="true"></div>
        <div>
          <div class="service-name">${esc(s.name)}</div>
          ${s.desc ? `<div class="service-desc">${esc(s.desc)}</div>` : ''}
        </div>
      </li>`).join('')}
    </ul>
  </div>
</section>` : '';

  const photosHTML = gallery.length ? `
<section class="photos" aria-labelledby="photos-heading">
  <div class="container">
    <p class="section-label photos-label" id="photos-heading">The work</p>
    <div class="photos-grid" role="region" aria-label="${esc(name)} photo gallery">
      ${gallery.slice(0, 3).map((u, i) => `<div class="photo"><img src="${u}" alt="${esc(name)} photo ${i + 1}" loading="lazy" decoding="async"></div>`).join('')}
    </div>
  </div>
</section>` : '';

  const reviewHTML = review.text ? `
<section class="review" aria-labelledby="review-heading">
  <div class="container">
    <div class="review-inner">
      <div class="review-accent" aria-hidden="true"></div>
      <div class="review-stars" aria-label="${review.rating} stars">${stars(review.rating)}</div>
      <blockquote>
        <p class="review-text" id="review-heading">"${esc(review.text)}"</p>
        <footer class="review-author"><cite>— ${esc(review.author)}</cite></footer>
      </blockquote>
    </div>
  </div>
</section>` : '';

  const hoursHTML = hoursRows.length ? `
<div>
  <h3 class="hours-title">Hours</h3>
  <ul class="hours-list" aria-label="Business hours">
    ${hoursRows.map(r => `
    <li class="hours-row${r.isToday ? ' today' : ''}">
      <span class="hours-day">${esc(r.day)}</span>
      <span class="hours-time${r.isClosed ? ' closed' : ''}">${esc(r.time) || 'Closed'}</span>
    </li>`).join('')}
  </ul>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(name)} — ${esc(tagline)}">
<title>${esc(name)}</title>
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${_FONTS}" rel="stylesheet">
<style>
:root{
  --accent:#17324D;--sky:#4EA7FF;--black:#0A0A0A;--ink:#111111;--white:#FFFFFF;
  --cream:#F5F3EF;--grey-1:#F0EEE9;--grey-2:#E0DDD7;--grey-3:#9E9B96;
  --font:'Plus Jakarta Sans',sans-serif;--pad:20px;--max-w:1100px;
  --r:10px;--r-lg:18px;--r-full:999px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);background:var(--cream);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased;}
a{text-decoration:none;color:inherit;}
img{display:block;max-width:100%;}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.container{width:100%;max-width:var(--max-w);margin:0 auto;padding:0 var(--pad);}
:focus{outline:none;}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px;}

/* TOPBAR */
.topbar{position:fixed;top:0;left:0;right:0;z-index:200;background:var(--accent);padding:10px var(--pad);display:flex;align-items:center;justify-content:space-between;}
.topbar-trust{display:flex;align-items:center;gap:16px;overflow:hidden;}
.topbar-badge{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:rgba(255,255,255,.8);letter-spacing:.02em;white-space:nowrap;}
.topbar-badge svg{width:12px;height:12px;stroke:rgba(255,255,255,.7);fill:none;stroke-width:2.2;stroke-linecap:round;flex-shrink:0;}
.topbar-sep{width:1px;height:12px;background:rgba(255,255,255,.25);flex-shrink:0;}
.topbar-phone{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;color:var(--white);letter-spacing:-.01em;white-space:nowrap;padding:6px 14px;background:rgba(0,0,0,.2);border-radius:var(--r-full);transition:background .15s;flex-shrink:0;}
.topbar-phone:hover{background:rgba(0,0,0,.3);}
.topbar-phone svg{width:13px;height:13px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}

/* HERO */
.hero{position:relative;height:100svh;min-height:580px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;padding-top:42px;}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.97) 0%,rgba(0,0,0,.80) 28%,rgba(0,0,0,.45) 55%,rgba(0,0,0,.15) 75%,transparent 100%);}
.hero-slash{position:absolute;bottom:0;left:0;width:5px;height:100%;background:var(--accent);z-index:3;}
.hero-content{position:relative;z-index:4;padding:0 calc(var(--pad) + 12px) 36px calc(var(--pad) + 8px);}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;margin-bottom:14px;}
.hero-eyebrow-dot{width:8px;height:8px;background:var(--sky);border-radius:50%;flex-shrink:0;}
.hero-eyebrow-text{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;}
.hero-name{font-size:clamp(40px,10vw,60px);font-weight:800;color:var(--white);line-height:.95;letter-spacing:-.04em;margin-bottom:10px;}
.hero-tagline{font-size:15px;font-weight:400;color:rgba(255,255,255,.45);line-height:1.55;margin-bottom:28px;max-width:300px;}
.hero-phone-cta{display:flex;align-items:center;gap:14px;background:var(--accent);border-radius:var(--r);padding:16px 20px;margin-bottom:12px;transition:opacity .15s;-webkit-tap-highlight-color:transparent;}
.hero-phone-cta:active{opacity:.88;}
.hero-phone-icon{width:40px;height:40px;background:rgba(0,0,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.hero-phone-icon svg{width:18px;height:18px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}
.hero-phone-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;margin-bottom:2px;}
.hero-phone-number{font-size:22px;font-weight:800;color:var(--white);letter-spacing:-.02em;}
.hero-rating{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:var(--r-full);padding:7px 14px;}
.hero-stars{color:#FFC940;font-size:12px;letter-spacing:1px;}
.hero-rating-text{font-size:12px;font-weight:600;color:rgba(255,255,255,.6);}

/* CREDENTIALS BAR — mobile-first */
/* Mobile (≤767px): each item keeps natural width, row scrolls horizontally. */
.creds{background:var(--ink);padding:0 var(--pad);display:flex;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.creds::-webkit-scrollbar{display:none;}
.cred{display:flex;align-items:center;gap:10px;padding:18px 18px 18px 0;flex:0 0 auto;}
.cred+.cred{padding-left:18px;border-left:1px solid rgba(255,255,255,.07);}
.cred-icon{width:32px;height:32px;background:rgba(255,255,255,.06);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cred-icon svg{width:16px;height:16px;stroke:var(--sky);fill:none;stroke-width:2.2;stroke-linecap:round;}
.cred-text{font-size:13px;font-weight:700;color:rgba(255,255,255,.55);white-space:nowrap;}
.cred-text b{color:var(--white);font-weight:700;}

/* SERVICES */
.services{padding:56px 0;}
.section-label{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--grey-3);margin-bottom:10px;}
.section-title{font-size:clamp(28px,6vw,40px);font-weight:800;letter-spacing:-.04em;line-height:1.05;color:var(--ink);margin-bottom:32px;}
.service-list{list-style:none;}
.service-item{display:flex;align-items:flex-start;gap:14px;padding:16px 0;border-bottom:1px solid var(--grey-2);}
.service-item:first-child{border-top:1px solid var(--grey-2);}
.service-bullet{width:6px;height:6px;background:var(--sky);border-radius:50%;flex-shrink:0;margin-top:7px;}
.service-name{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:2px;}
.service-desc{font-size:13px;color:var(--grey-3);line-height:1.55;}

/* PHOTOS */
.photos{padding-bottom:56px;}
.photos-label{margin-bottom:16px;}
.photos-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;gap:6px;}
.photo{overflow:hidden;border-radius:var(--r);background:var(--grey-2);}
.photo:first-child{grid-column:1 / 3;aspect-ratio:16/9;}
.photo:not(:first-child){aspect-ratio:1;}
.photo img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease;}
.photo:hover img{transform:scale(1.03);}

/* REVIEW */
.review{background:var(--ink);padding:56px var(--pad);}
.review-inner{max-width:640px;}
.review-accent{width:40px;height:3px;background:var(--sky);border-radius:2px;margin-bottom:24px;}
.review-stars{color:#FFC940;font-size:14px;letter-spacing:2px;margin-bottom:16px;}
.review-text{font-size:clamp(18px,4vw,24px);font-weight:700;line-height:1.4;letter-spacing:-.02em;color:var(--white);margin-bottom:16px;}
.review-author{font-size:13px;font-weight:400;color:rgba(255,255,255,.3);}

/* CONTACT */
.contact{padding:56px 0;}
.contact-phone-block{background:var(--ink);border-radius:var(--r-lg);padding:24px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.cpb-label{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:4px;}
.cpb-number{font-size:clamp(24px,6vw,32px);font-weight:800;letter-spacing:-.03em;color:var(--white);}
.cpb-cta{background:var(--sky);color:var(--white);font-size:13px;font-weight:700;padding:11px 20px;border-radius:var(--r);white-space:nowrap;flex-shrink:0;transition:opacity .15s;-webkit-tap-highlight-color:transparent;}
.cpb-cta:active{opacity:.85;}
.contact-addr{background:var(--grey-1);border:1px solid var(--grey-2);border-radius:var(--r-lg);padding:20px;display:flex;align-items:flex-start;gap:14px;margin-bottom:32px;}
.contact-addr-icon{width:38px;height:38px;background:var(--grey-2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.contact-addr-icon svg{width:18px;height:18px;stroke:var(--grey-3);fill:none;stroke-width:2;stroke-linecap:round;}
.contact-addr-text{font-size:14px;color:var(--ink);line-height:1.6;}
.contact-addr-map{display:inline-block;font-size:12px;font-weight:700;color:var(--accent);margin-top:5px;}
.hours-title{font-size:17px;font-weight:800;letter-spacing:-.025em;color:var(--ink);margin-bottom:14px;}
.hours-list{list-style:none;}
.hours-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--grey-2);font-size:13px;}
.hours-row:last-child{border-bottom:none;}
.hours-day{color:var(--grey-3);}
.hours-row.today .hours-day{color:var(--ink);font-weight:700;}
.hours-time{font-weight:600;color:var(--ink);}
.hours-time.accent{color:var(--sky);}
.hours-time.closed{color:var(--grey-3);font-weight:400;}

/* FOOTER */
footer{background:var(--black);padding:20px var(--pad);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.foot-name{font-size:14px;font-weight:800;letter-spacing:-.02em;color:rgba(255,255,255,.25);}
.foot-credit{font-size:11px;color:rgba(255,255,255,.1);}

/* STICKY BOTTOM (mobile) */
.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:150;background:var(--white);border-top:1px solid var(--grey-2);padding:12px var(--pad) max(12px,env(safe-area-inset-bottom));}
.sticky-cta.visible{display:block;}
.sticky-cta-inner{display:flex;gap:10px;}
.sticky-book{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--accent);color:var(--white);font-size:14px;font-weight:700;padding:14px;border-radius:var(--r);-webkit-tap-highlight-color:transparent;}
.sticky-call{width:52px;display:flex;align-items:center;justify-content:center;background:var(--grey-1);border:1px solid var(--grey-2);border-radius:var(--r);flex-shrink:0;-webkit-tap-highlight-color:transparent;}
.sticky-call svg{width:18px;height:18px;stroke:var(--ink);fill:none;stroke-width:2;stroke-linecap:round;}

@keyframes fade-up{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
.fu{opacity:0;animation:fade-up .5s ease forwards;}
.d1{animation-delay:.1s;}.d2{animation-delay:.22s;}.d3{animation-delay:.34s;}.d4{animation-delay:.46s;}

@media(min-width:768px){
  :root{--pad:40px;}
  .sticky-cta{display:none!important;}
  .topbar-badge:not(:first-child){display:flex;}
  .hero-overlay{background:linear-gradient(to right,rgba(0,0,0,.97) 0%,rgba(0,0,0,.82) 35%,rgba(0,0,0,.45) 58%,rgba(0,0,0,.1) 80%,transparent 100%);}
  .hero{justify-content:center;}
  .hero-content{max-width:560px;padding:0 0 0 calc(var(--pad) + 12px);margin-top:42px;}
  .hero-tagline{max-width:400px;}
  /* Desktop: items distribute evenly across full row, no scroll */
  .creds{justify-content:center;overflow-x:visible;}
  .cred{flex:1;justify-content:center;padding:22px 16px;min-width:0;}
  .cred-icon{width:36px;height:36px;}
  .cred-icon svg{width:18px;height:18px;}
  .cred-text{font-size:14px;}
  .cred+.cred{padding-left:16px;}
  .service-list{display:grid;grid-template-columns:1fr 1fr;gap:0 48px;}
  .service-item:nth-child(1),.service-item:nth-child(2){border-top:1px solid var(--grey-2);}
  .photos-grid{grid-template-columns:3fr 2fr;grid-template-rows:1fr 1fr;height:420px;}
  .photo:first-child{grid-column:1;grid-row:1 / 3;aspect-ratio:unset;border-radius:var(--r) 0 0 var(--r);}
  .photo:not(:first-child){aspect-ratio:unset;border-radius:0;}
  .photo:nth-child(2){border-radius:0 var(--r) 0 0;}
  .photo:nth-child(3){border-radius:0 0 var(--r) 0;}
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;}
}
@media(min-width:1024px){
  .hero-content{padding-left:64px;max-width:620px;}
  .hero-name{font-size:68px;}
}
</style>
</head>
<body>
<a class="visually-hidden" href="#main">Skip to main content</a>

<div class="topbar" role="banner">
  <div class="topbar-trust">
    <div class="topbar-badge">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
      Licensed &amp; Insured
    </div>
    <div class="topbar-sep" aria-hidden="true"></div>
    <div class="topbar-badge">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Same-Day Service
    </div>
    <div class="topbar-sep" aria-hidden="true"></div>
    <div class="topbar-badge">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Free Estimates
    </div>
  </div>
  ${phone ? `<a href="tel:${cp}" class="topbar-phone" aria-label="Call ${esc(name)} at ${esc(phone)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
    ${esc(phone)}
  </a>` : ''}
</div>

<main id="main">
<header class="hero">
  ${heroImg ? `<img class="hero-img" src="${heroImg}" alt="${heroAlt}" fetchpriority="high" decoding="async">` : ''}
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="hero-slash" aria-hidden="true"></div>
  <div class="hero-content">
    <div class="hero-eyebrow fu">
      <div class="hero-eyebrow-dot" aria-hidden="true"></div>
      <span class="hero-eyebrow-text">${esc(cityStr || 'Local pros')}</span>
    </div>
    <h1 class="hero-name fu d1">${esc(name)}</h1>
    <p class="hero-tagline fu d2">${esc(tagline)}</p>
    ${phone ? `<a href="tel:${cp}" class="hero-phone-cta fu d3" aria-label="Call ${esc(name)} at ${esc(phone)}">
      <div class="hero-phone-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
      </div>
      <div>
        <div class="hero-phone-label">Call or text anytime</div>
        <div class="hero-phone-number">${esc(phone)}</div>
      </div>
    </a>` : ''}
    <div class="hero-rating fu d4" role="img" aria-label="${ratingTxt} stars, ${reviewCount} Google reviews">
      <span class="hero-stars" aria-hidden="true">${stars(rating)}</span>
      <span class="hero-rating-text">${ratingTxt} · ${reviewCount} Google reviews</span>
    </div>
  </div>
</header>

<section class="creds" aria-label="Business credentials">
  <div class="cred">
    <div class="cred-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <span class="cred-text"><b>Licensed</b> &amp; Insured</span>
  </div>
  <div class="cred">
    <div class="cred-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
    <span class="cred-text"><b>Same-Day</b> Service</span>
  </div>
  <div class="cred">
    <div class="cred-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    <span class="cred-text"><b>${ratingTxt}★</b> · ${reviewCount} Reviews</span>
  </div>
  ${cityStr ? `<div class="cred">
    <div class="cred-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
    <span class="cred-text"><b>Serving</b> ${esc(cityStr)}</span>
  </div>` : ''}
  <div class="cred">
    <div class="cred-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
    <span class="cred-text"><b>Free</b> Estimates</span>
  </div>
</section>

${servicesHTML}
${photosHTML}
${reviewHTML}

<section class="contact" aria-labelledby="contact-heading" id="contact">
  <div class="container">
    <p class="section-label">Get in touch</p>
    <h2 class="section-title" id="contact-heading">Call us anytime.</h2>
    <div class="contact-grid">
      <div>
        ${phone ? `<div class="contact-phone-block">
          <div>
            <div class="cpb-label">Call or text</div>
            <div class="cpb-number">${esc(phone)}</div>
          </div>
          <a href="tel:${cp}" class="cpb-cta" aria-label="Call ${esc(name)} now">Call now →</a>
        </div>` : ''}
        ${address ? `<address style="font-style:normal;">
          <div class="contact-addr">
            <div class="contact-addr-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div class="contact-addr-text">${esc(address)}</div>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="contact-addr-map">Get directions →</a>
            </div>
          </div>
        </address>` : ''}
      </div>
      ${hoursHTML}
    </div>
  </div>
</section>
</main>

<footer>
  <span class="foot-name">${esc(name)}</span>
  <span class="foot-credit">A HelloSite · gethellosite.com</span>
</footer>

${phone ? `<div class="sticky-cta" role="complementary" aria-label="Quick contact">
  <div class="sticky-cta-inner">
    <a href="tel:${cp}" class="sticky-book" aria-label="Call ${esc(name)} now">
      <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
      Call now — ${esc(phone)}
    </a>
    <a href="#contact" class="sticky-call" aria-label="See hours and address">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </a>
  </div>
</div>` : ''}

${claimCTA('var(--accent)', place.id)}

<script>
(function(){'use strict';
var hero=document.querySelector('.hero'),sticky=document.querySelector('.sticky-cta');
if(hero&&sticky&&window.matchMedia('(max-width:767px)').matches){
  new IntersectionObserver(function(e){sticky.classList.toggle('visible',!e[0].isIntersecting);},{threshold:0}).observe(hero);
}
if('IntersectionObserver' in window){
  var t=document.querySelectorAll('.service-item, .photo, .contact-phone-block, .contact-addr');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.animation='fade-up .45s ease forwards';io.unobserve(e.target);}});},{threshold:0.08});
  t.forEach(function(el){el.style.opacity='0';io.observe(el);});
}
})();
</script>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. MINIMALIST  ·  Accent #6B7C5A (sage)
//    Spas, massage, wellness — calm, restorative experience.
//    Source: template_minimalist_v2.html
//    NOTE: hero overflow is visible so the floating card can bleed below.
// ═══════════════════════════════════════════════════════════════════════════════

function templateMinimalist(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const allHours = place.regularOpeningHours?.weekdayDescriptions || [];
  const review   = bestReview(reviews);
  const services = _normalizeServices(copy);
  const tagline  = (copy && copy.tagline) || 'Calm, restorative care in a private setting.';
  const cp       = cleanPhone(phone);
  const cityStr  = _city(address);
  const heroAlt  = `${esc(name)} interior`;
  const mapsUrl  = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const hoursRows = _formatHoursRows(allHours);
  const heroImg  = photos?.hero || (photos?.gallery && photos.gallery[0]) || '';
  // photo grid uses gallery[0..2] (large + 2 small) — pad gracefully
  const photoGrid = _padPhotos((photos && photos.gallery) || [], 3);
  const ratingTxt = rating.toFixed(1);

  const servicesHTML = services.length ? `
<section class="sec" aria-labelledby="services-title">
  <p class="sec-eyebrow">Treatments</p>
  <h2 class="sec-title" id="services-title">What we offer.</h2>
  <ul class="service-list" role="list">
    ${services.map((s, i) => `
    <li class="service-item">
      <span class="service-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="service-name">${esc(s.name)}</div>
      ${s.desc ? `<div class="service-desc">${esc(s.desc)}</div>` : ''}
    </li>`).join('')}
  </ul>
</section>` : '';

  const photosHTML = photoGrid.length ? `
<section class="photos" aria-label="Our space">
  <div class="photo-grid" role="region" aria-label="${esc(name)} photo gallery">
    <div class="pg-main"><img src="${photoGrid[0]}" alt="${esc(name)} space" loading="lazy" decoding="async"></div>
    ${photoGrid[1] ? `<div class="pg-sm"><img src="${photoGrid[1]}" alt="${esc(name)} detail 1" loading="lazy" decoding="async"></div>` : ''}
    ${photoGrid[2] ? `<div class="pg-sm"><img src="${photoGrid[2]}" alt="${esc(name)} detail 2" loading="lazy" decoding="async"></div>` : ''}
  </div>
</section>` : '';

  const quoteHTML = review.text ? `
<section class="quote" aria-labelledby="quote-title">
  <div class="quote-line" aria-hidden="true"></div>
  <div class="quote-stars" aria-label="${review.rating} stars">${stars(review.rating)}</div>
  <blockquote>
    <p class="quote-text" id="quote-title">"${esc(review.text)}"</p>
    <footer><cite class="quote-author">— ${esc(review.author)}</cite></footer>
  </blockquote>
</section>` : '';

  const hoursHTML = hoursRows.length ? `
<div>
  <h3 class="hours-title">Hours</h3>
  <ul class="hours-list" aria-label="Business hours">
    ${hoursRows.map(r => `
    <li class="hours-row${r.isToday ? ' today' : ''}">
      <span class="hours-day">${esc(r.day)}</span>
      <span class="hours-time${r.isClosed ? ' closed' : ''}">${esc(r.time) || 'Closed'}</span>
    </li>`).join('')}
  </ul>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(name)} — ${esc(tagline)}">
<title>${esc(name)}</title>
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${_FONTS}" rel="stylesheet">
<style>
:root{
  --accent:#6B7C5A;--ink:#1A1916;--white:#FFFFFF;--warm:#F8F5F0;
  --stone:#E8E3DB;--muted:#8C8880;
  --font:'Plus Jakarta Sans',sans-serif;--pad:22px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);background:var(--warm);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased;}
a{text-decoration:none;color:inherit;}
img{display:block;max-width:100%;}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
:focus{outline:none;}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px;}

/* NAV — always solid, light theme (no full-bleed photo behind it now) */
nav{position:sticky;top:0;z-index:200;padding:14px var(--pad);display:flex;align-items:center;justify-content:space-between;background:rgba(248,245,240,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--stone);}
.nav-logo{font-size:15px;font-weight:800;font-style:italic;letter-spacing:-.03em;color:var(--ink);}
.nav-book{font-size:12px;font-weight:600;color:var(--ink);padding:8px 16px;border:1px solid var(--stone);border-radius:999px;transition:all .2s;}
.nav-book:hover{background:var(--ink);color:var(--white);border-color:var(--ink);}

/* HERO — split layout. Mobile: stacked text + photo strip. Desktop: 50/50 grid */
.hero{background:var(--warm);}
.hero-grid{padding:32px var(--pad) 40px;display:flex;flex-direction:column;gap:28px;max-width:1080px;margin:0 auto;}
.hero-text{display:flex;flex-direction:column;gap:14px;}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);}
.hero-name{font-size:clamp(40px,10vw,68px);font-weight:800;font-style:italic;letter-spacing:-.04em;line-height:.95;color:var(--ink);}
.hero-sub{font-size:15px;font-weight:400;color:var(--muted);line-height:1.65;max-width:380px;}
.hero-rating{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;}
.hero-rating-stars{color:#B8A06A;font-size:13px;letter-spacing:1.5px;}
.hero-rating-score{font-size:13px;font-weight:700;color:var(--ink);}
.hero-rating-meta{font-size:12px;color:var(--muted);}
.hero-cta{align-self:flex-start;margin-top:8px;background:var(--accent);color:var(--white);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:999px;transition:opacity .15s;-webkit-tap-highlight-color:transparent;}
.hero-cta:active{opacity:.85;}
.hero-photo{margin:0 calc(var(--pad) * -1);overflow:hidden;aspect-ratio:3/2;background:var(--stone);}
.hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center 25%;}

/* SHARED */
/* Treatments/services section — white block to break up the warm tone */
.sec{background:var(--white);padding:56px var(--pad);}
.sec>*{max-width:860px;margin-left:auto;margin-right:auto;}
.sec-eyebrow{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.sec-title{font-size:clamp(26px,6vw,36px);font-weight:800;font-style:italic;letter-spacing:-.04em;line-height:1.05;color:var(--ink);margin-bottom:28px;}

/* SERVICES */
.service-list{list-style:none;border-top:1px solid var(--stone);}
.service-item{padding:16px 0;border-bottom:1px solid var(--stone);}
.service-num{font-size:10px;font-weight:700;color:var(--accent);letter-spacing:.1em;display:block;margin-bottom:3px;}
.service-name{font-size:15px;font-weight:700;letter-spacing:-.025em;color:var(--ink);margin-bottom:3px;}
.service-desc{font-size:13px;color:var(--muted);line-height:1.6;}

/* PHOTOS */
.photos{padding:0;margin-bottom:56px;}
.photo-grid{display:grid;grid-template-columns:3fr 2fr;grid-template-rows:1fr 1fr;gap:4px;height:320px;}
.pg-main{grid-row:1 / 3;overflow:hidden;background:var(--stone);}
.pg-sm{overflow:hidden;background:var(--stone);}
.pg-main img,.pg-sm img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease;}
.pg-main:hover img,.pg-sm:hover img{transform:scale(1.04);}

/* QUOTE */
.quote{background:var(--ink);padding:56px var(--pad);margin-bottom:0;}
.quote-line{width:28px;height:2px;background:var(--accent);border-radius:2px;margin-bottom:20px;}
.quote-text{font-size:clamp(18px,4.5vw,24px);font-weight:700;font-style:italic;letter-spacing:-.03em;line-height:1.4;color:var(--white);margin-bottom:14px;}
.quote-author{font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;}
.quote-stars{color:#B8A06A;font-size:11px;letter-spacing:2px;margin-top:10px;margin-bottom:10px;}

/* CONTACT */
.contact{padding:56px var(--pad);}
.contact-title{font-size:clamp(26px,6vw,36px);font-weight:800;font-style:italic;letter-spacing:-.04em;line-height:1.05;color:var(--ink);margin-bottom:20px;}
.contact-phone{display:flex;align-items:center;gap:14px;background:var(--white);border:1px solid var(--stone);border-radius:14px;padding:18px;margin-bottom:10px;transition:border-color .2s;}
.contact-phone:hover{border-color:var(--accent);}
.phone-icon{width:40px;height:40px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.phone-icon svg{width:17px;height:17px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}
.phone-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:2px;}
.phone-num{font-size:19px;font-weight:800;letter-spacing:-.03em;color:var(--ink);}
.contact-addr{display:flex;align-items:flex-start;gap:14px;background:var(--white);border:1px solid var(--stone);border-radius:14px;padding:18px;margin-bottom:32px;}
.addr-icon{width:40px;height:40px;background:var(--stone);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.addr-icon svg{width:17px;height:17px;stroke:var(--muted);fill:none;stroke-width:2;stroke-linecap:round;}
.addr-text{font-size:14px;color:var(--ink);line-height:1.6;}
.addr-dir{display:inline-block;margin-top:5px;font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;}
.hours-title{font-size:16px;font-weight:800;letter-spacing:-.025em;margin-bottom:12px;}
.hours-list{list-style:none;border-top:1px solid var(--stone);}
.hours-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--stone);font-size:13px;}
.hours-row:last-child{border:none;}
.hours-day{color:var(--muted);}
.hours-time{font-weight:600;color:var(--ink);}
.hours-time.closed{color:var(--muted);font-weight:400;}
.hours-row.today .hours-day{color:var(--ink);font-weight:700;}

footer{background:var(--ink);padding:18px var(--pad);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.foot-name{font-size:14px;font-weight:800;font-style:italic;letter-spacing:-.03em;color:rgba(255,255,255,.2);}
.foot-credit{font-size:11px;color:rgba(255,255,255,.1);}

.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:150;background:var(--warm);border-top:1px solid var(--stone);padding:12px var(--pad) max(12px,env(safe-area-inset-bottom));}
.sticky-cta.visible{display:flex;gap:10px;}
.sticky-reserve{flex:1;display:flex;align-items:center;justify-content:center;background:var(--accent);color:var(--white);font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:14px;border-radius:999px;}
.sticky-phone{display:flex;align-items:center;justify-content:center;padding:14px 16px;background:var(--white);border:1px solid var(--stone);border-radius:999px;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;}

@keyframes fade-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
.fu{opacity:0;animation:fade-up .55s ease forwards;}
.d1{animation-delay:.12s;}.d2{animation-delay:.24s;}.d3{animation-delay:.36s;}

@media(min-width:768px){
  :root{--pad:48px;}
  .sticky-cta{display:none!important;}
  /* Hero: text left (right-aligned in column), photo fills the right half edge-to-edge */
  .hero-grid{max-width:none;padding:0;display:grid;grid-template-columns:1fr 1fr;align-items:stretch;gap:0;min-height:580px;}
  .hero-text{padding:64px var(--pad);max-width:580px;justify-self:end;width:100%;display:flex;flex-direction:column;justify-content:center;gap:14px;}
  .hero-sub{max-width:420px;}
  .hero-photo{margin:0;aspect-ratio:auto;border-radius:0;}
  .hero-photo img{height:100%;}
  .sec{padding:72px var(--pad);}
  .service-list{display:grid;grid-template-columns:1fr 1fr;gap:0 56px;}
  .service-item:nth-child(1),.service-item:nth-child(2){border-top:1px solid var(--stone);}
  .photo-grid{height:440px;}
  .contact{max-width:860px;margin:0 auto;}
  .contact-layout{display:grid;grid-template-columns:1fr 1fr;gap:40px;}
  .contact-title{grid-column:1 / 3;}
}
@media(min-width:1024px){
  .hero-grid{min-height:640px;}
  .hero-text{padding:80px var(--pad);}
  .hero-name{font-size:72px;}
}
</style>
</head>
<body>
<a class="visually-hidden" href="#main">Skip to main content</a>

<nav id="nav" role="banner">
  <span class="nav-logo">${esc(name)}</span>
  ${phone ? `<a href="tel:${cp}" class="nav-book">Contact</a>` : ''}
</nav>

<main id="main">
<header class="hero">
  <div class="hero-grid">
    <div class="hero-text">
      <p class="hero-eyebrow fu">${esc(cityStr || 'Local')}</p>
      <h1 class="hero-name fu d1">${esc(name)}</h1>
      <p class="hero-sub fu d2">${esc(tagline)}</p>
      <div class="hero-rating fu d3" role="img" aria-label="${ratingTxt} stars, ${reviewCount} reviews">
        <span class="hero-rating-stars" aria-hidden="true">${stars(rating)}</span>
        <span class="hero-rating-score">${ratingTxt}</span>
        <span class="hero-rating-meta">· ${reviewCount} reviews${cityStr ? ` · ${esc(cityStr)}` : ''}</span>
      </div>
      ${phone ? `<a href="tel:${cp}" class="hero-cta fu d3" aria-label="Contact — call ${esc(phone)}">Contact →</a>` : ''}
    </div>
    ${heroImg ? `<div class="hero-photo">
      <img src="${heroImg}" alt="${heroAlt}" fetchpriority="high" decoding="async">
    </div>` : ''}
  </div>
</header>

${servicesHTML}
${photosHTML}
${quoteHTML}

<section class="contact" id="contact" aria-labelledby="contact-title">
  <h2 class="contact-title" id="contact-title">Come in.</h2>
  <div class="contact-layout">
    <div>
      ${phone ? `<a href="tel:${cp}" class="contact-phone" aria-label="Call ${esc(name)}">
        <div class="phone-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg></div>
        <div>
          <div class="phone-label">Call or text</div>
          <div class="phone-num">${esc(phone)}</div>
        </div>
      </a>` : ''}
      ${address ? `<address style="font-style:normal;">
        <div class="contact-addr">
          <div class="addr-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <div>
            <div class="addr-text">${esc(address)}</div>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="addr-dir">Get directions →</a>
          </div>
        </div>
      </address>` : ''}
    </div>
    ${hoursHTML}
  </div>
</section>
</main>

<footer>
  <span class="foot-name">${esc(name)}</span>
  <span class="foot-credit">A HelloSite · gethellosite.com</span>
</footer>

${phone ? `<div class="sticky-cta" role="complementary" aria-label="Quick contact">
  <a href="tel:${cp}" class="sticky-reserve">Contact</a>
  <a href="tel:${cp}" class="sticky-phone">${esc(phone)}</a>
</div>` : ''}

${claimCTA('var(--accent)', place.id)}

<script>
(function(){'use strict';
var nav=document.getElementById('nav');
window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>40);},{passive:true});
var hero=document.querySelector('.hero'),sticky=document.querySelector('.sticky-cta');
if(hero&&sticky&&window.matchMedia('(max-width:767px)').matches){
  new IntersectionObserver(function(e){sticky.classList.toggle('visible',!e[0].isIntersecting);},{threshold:0}).observe(hero);
}
if('IntersectionObserver' in window){
  var t=document.querySelectorAll('.service-item, .pg-main, .pg-sm, .contact-phone, .contact-addr');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.animation='fade-up .5s ease forwards';io.unobserve(e.target);}});},{threshold:0.06});
  t.forEach(function(el){el.style.opacity='0';io.observe(el);});
}
})();
</script>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. INFORMATIVE  ·  Accent #1D4ED8 (blue)
//    Accountants, lawyers, insurance, real estate, tailors, retail.
//    Source: template_informative_v1.html
// ═══════════════════════════════════════════════════════════════════════════════

function templateInformative(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const allHours = place.regularOpeningHours?.weekdayDescriptions || [];
  const review   = bestReview(reviews);
  const services = _normalizeServices(copy);
  const tagline  = (copy && copy.tagline) || `Trusted local service in ${_city(address) || 'your area'}.`;
  const cp       = cleanPhone(phone);
  const cityStr  = _city(address);
  const heroAlt  = `${esc(name)} office`;
  const mapsUrl  = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  const hoursRows = _formatHoursRows(allHours);
  const heroImg  = photos?.hero || (photos?.gallery && photos.gallery[0]) || '';
  const featurePhoto = (photos?.gallery && photos.gallery[1]) || (photos?.gallery && photos.gallery[0]) || photos?.hero || '';
  const ratingTxt = rating.toFixed(1);
  // Decorative emojis cycle through a fixed set — purely visual, not data.
  const ICONS = ['🧾','📊','💼','📋','🏛️','📞'];

  const servicesHTML = services.length ? `
<section class="services" id="services" aria-labelledby="services-title">
  <div class="services-inner">
    <p class="sec-label">What we do</p>
    <h2 class="sec-title" id="services-title">Everything your business needs.</h2>
    <div class="service-grid">
      ${services.map((s, i) => `
      <div class="service-card">
        <div class="service-icon" aria-hidden="true">${ICONS[i % ICONS.length]}</div>
        <div class="service-name">${esc(s.name)}</div>
        ${s.desc ? `<div class="service-desc">${esc(s.desc)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>` : '';

  const featureHTML = (featurePhoto || review.text) ? `
<section class="feature" aria-label="Client review">
  <div class="feature-inner">
    ${featurePhoto ? `<div class="feature-photo"><img src="${featurePhoto}" alt="${esc(name)} workspace" loading="lazy" decoding="async"></div>` : ''}
    ${review.text ? `<div class="review-card">
      <div class="review-stars" aria-label="${review.rating} stars">${stars(review.rating)}</div>
      <blockquote>
        <p class="review-text">"${esc(review.text)}"</p>
        <footer><cite class="review-author">— ${esc(review.author)}</cite></footer>
      </blockquote>
    </div>` : ''}
  </div>
</section>` : '';

  const hoursHTML = hoursRows.length ? `
<div>
  <h3 class="hours-title">Office hours</h3>
  <ul class="hours-list" aria-label="Business hours">
    ${hoursRows.map(r => `
    <li class="hours-row${r.isToday ? ' today' : ''}">
      <span class="hours-day">${esc(r.day)}</span>
      <span class="hours-time${r.isClosed ? ' closed' : ''}">${esc(r.time) || 'Closed'}</span>
    </li>`).join('')}
  </ul>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${esc(name)} — ${esc(tagline)}">
<title>${esc(name)}</title>
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${_FONTS}" rel="stylesheet">
<style>
:root{
  --accent:#1D4ED8;--ink:#0F172A;--white:#FFFFFF;--off:#F8FAFC;
  --border:#E2E8F0;--muted:#64748B;--light:#EFF6FF;
  --font:'Plus Jakarta Sans',sans-serif;
  --pad:20px;--r:10px;--r-lg:16px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);background:var(--off);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased;}
a{text-decoration:none;color:inherit;}
img{display:block;max-width:100%;}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
:focus{outline:none;}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px;}

/* NAV */
nav{position:sticky;top:0;z-index:200;background:var(--white);border-bottom:1px solid var(--border);padding:0 var(--pad);height:56px;display:flex;align-items:center;justify-content:space-between;}
.nav-logo{font-size:16px;font-weight:800;letter-spacing:-.03em;color:var(--ink);}
.nav-links{display:none;}
.nav-cta{font-size:13px;font-weight:700;color:var(--white);background:var(--accent);padding:8px 16px;border-radius:var(--r);transition:opacity .15s;}
.nav-cta:hover{opacity:.88;}

/* HERO */
.hero{background:var(--white);overflow:hidden;}
.hero-inner{max-width:1080px;margin:0 auto;padding:36px var(--pad) 0;}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;background:var(--light);border:1px solid #BFDBFE;border-radius:999px;padding:5px 12px;margin-bottom:20px;}
.hero-eyebrow-dot{width:6px;height:6px;background:var(--accent);border-radius:50%;flex-shrink:0;}
.hero-eyebrow-text{font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.06em;white-space:nowrap;}
h1{font-size:clamp(30px,7vw,48px);font-weight:800;letter-spacing:-.04em;line-height:1.05;color:var(--ink);margin-bottom:16px;}
.hero-sub{font-size:15px;color:var(--muted);line-height:1.7;max-width:480px;margin-bottom:28px;}
.hero-ctas{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:0;}
.btn-primary{display:inline-flex;align-items:center;gap:7px;background:var(--accent);color:var(--white);font-size:14px;font-weight:700;padding:13px 22px;border-radius:var(--r);transition:opacity .15s;-webkit-tap-highlight-color:transparent;}
.btn-primary:active{opacity:.85;}
.btn-primary svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;}
.btn-secondary{display:inline-flex;align-items:center;gap:7px;background:var(--off);color:var(--ink);font-size:14px;font-weight:600;padding:13px 20px;border-radius:var(--r);border:1px solid var(--border);}
.hero-trust{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;}
.trust-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--muted);}
.trust-badge svg{width:14px;height:14px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;flex-shrink:0;}
.hero-photo{margin:16px calc(var(--pad) * -1) 0;overflow:hidden;aspect-ratio:3/2;}
.hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center 25%;}

/* RATING BAR */
.rating-bar{background:var(--ink);padding:14px var(--pad);display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
.rb-left{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
.rb-stars{color:#FFC940;font-size:13px;letter-spacing:2px;flex-shrink:0;}
.rb-score{font-size:13px;font-weight:700;color:var(--white);flex-shrink:0;}
.rb-count{font-size:12px;color:rgba(255,255,255,.4);white-space:nowrap;}
.rb-sep{width:1px;height:14px;background:rgba(255,255,255,.15);flex-shrink:0;}
.rb-location{font-size:12px;color:rgba(255,255,255,.4);white-space:nowrap;}
.rb-cta{flex-shrink:0;font-size:12px;font-weight:700;color:var(--white);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);padding:6px 14px;border-radius:var(--r);white-space:nowrap;}

/* SERVICES */
.services{padding:52px var(--pad);}
.services-inner{max-width:1080px;margin:0 auto;}
.sec-label{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.sec-title{font-size:clamp(24px,5vw,34px);font-weight:800;letter-spacing:-.035em;line-height:1.1;color:var(--ink);margin-bottom:28px;}
.service-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.service-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;}
.service-icon{font-size:22px;margin-bottom:10px;}
.service-name{font-size:14px;font-weight:800;letter-spacing:-.02em;color:var(--ink);margin-bottom:5px;}
.service-desc{font-size:12px;color:var(--muted);line-height:1.6;}

/* FEATURE */
.feature{position:relative;}
.feature-photo{aspect-ratio:3/2;overflow:hidden;background:var(--border);}
.feature-photo img{width:100%;height:100%;object-fit:cover;}
.review-card{background:var(--white);border:1px solid var(--border);border-top:none;padding:24px var(--pad);}
.review-stars{color:#FFC940;font-size:12px;letter-spacing:2px;margin-bottom:10px;}
.review-text{font-size:clamp(14px,3vw,17px);font-weight:600;letter-spacing:-.02em;line-height:1.5;color:var(--ink);margin-bottom:10px;font-style:italic;}
.review-author{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;}

/* CONTACT */
.contact{padding:52px var(--pad);max-width:1080px;margin:0 auto;}
.contact-title{font-size:clamp(24px,5vw,34px);font-weight:800;letter-spacing:-.035em;color:var(--ink);margin-bottom:20px;}
.contact-phone{background:var(--accent);border-radius:var(--r-lg);padding:20px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:opacity .15s;}
.contact-phone:active{opacity:.88;}
.contact-phone-icon{width:44px;height:44px;background:rgba(255,255,255,.15);border-radius:var(--r);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.contact-phone-icon svg{width:20px;height:20px;stroke:var(--white);fill:none;stroke-width:2;stroke-linecap:round;}
.contact-phone-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.12em;margin-bottom:2px;}
.contact-phone-num{font-size:22px;font-weight:800;letter-spacing:-.03em;color:var(--white);}
.contact-addr{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;display:flex;align-items:flex-start;gap:12px;margin-bottom:32px;}
.addr-icon{width:36px;height:36px;background:var(--off);border-radius:var(--r);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.addr-icon svg{width:16px;height:16px;stroke:var(--muted);fill:none;stroke-width:2;stroke-linecap:round;}
.addr-text{font-size:14px;color:var(--ink);line-height:1.6;}
.addr-dir{display:inline-block;margin-top:5px;font-size:12px;font-weight:700;color:var(--accent);}
.hours-title{font-size:16px;font-weight:800;letter-spacing:-.025em;margin-bottom:12px;}
.hours-list{list-style:none;border-top:1px solid var(--border);}
.hours-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;}
.hours-row:last-child{border:none;}
.hours-day{color:var(--muted);}
.hours-time{font-weight:600;color:var(--ink);}
.hours-time.closed{color:var(--muted);font-weight:400;}
.hours-row.today .hours-day{color:var(--ink);font-weight:700;}
.hours-row.today .hours-time{color:var(--accent);}

footer{background:var(--ink);padding:18px var(--pad);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.foot-logo{font-size:14px;font-weight:800;letter-spacing:-.02em;color:rgba(255,255,255,.25);}
.foot-credit{font-size:11px;color:rgba(255,255,255,.1);}

.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:150;background:var(--white);border-top:1px solid var(--border);padding:12px var(--pad) max(12px,env(safe-area-inset-bottom));}
.sticky-cta.visible{display:flex;gap:10px;}
.sticky-call{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:var(--white);font-size:14px;font-weight:700;padding:14px;border-radius:var(--r);}
.sticky-call svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;}
.sticky-hours{display:flex;align-items:center;justify-content:center;padding:14px 16px;background:var(--off);border:1px solid var(--border);border-radius:var(--r);font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;}

@keyframes fade-up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
.fu{opacity:0;animation:fade-up .5s ease forwards;}
.d1{animation-delay:.1s;}.d2{animation-delay:.2s;}.d3{animation-delay:.3s;}.d4{animation-delay:.4s;}

@media(min-width:768px){
  :root{--pad:40px;}
  .sticky-cta{display:none!important;}
  .nav-links{display:flex;gap:24px;}
  .nav-link{font-size:13px;color:var(--muted);font-weight:500;}
  .nav-link:hover{color:var(--ink);}
  .hero-inner{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding-bottom:48px;}
  .hero-photo{margin:0;border-radius:var(--r-lg);aspect-ratio:4/3;height:auto;overflow:hidden;}
  .service-grid{grid-template-columns:repeat(3,1fr);}
  .feature-inner{display:grid;grid-template-columns:1fr 1fr;}
  .feature-photo{aspect-ratio:unset;height:100%;min-height:300px;}
  .review-card{border-top:1px solid var(--border);border-left:none;display:flex;flex-direction:column;justify-content:center;padding:40px;}
  .contact-layout{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;}
  .contact-title{grid-column:1 / 3;}
}
@media(min-width:1024px){.service-grid{grid-template-columns:repeat(3,1fr);}}
</style>
</head>
<body>
<a class="visually-hidden" href="#main">Skip to main content</a>

<nav role="banner">
  <div class="nav-logo">${esc(name)}</div>
  <div class="nav-links" aria-label="Page navigation">
    ${services.length ? `<a href="#services" class="nav-link">Services</a>` : ''}
    <a href="#contact" class="nav-link">Hours &amp; Contact</a>
  </div>
  ${phone ? `<a href="tel:${cp}" class="nav-cta">Get in touch</a>` : ''}
</nav>

<main id="main">
<section class="hero">
  <div class="hero-inner">
    <div class="hero-text">
      <div class="hero-eyebrow fu">
        <span class="hero-eyebrow-dot" aria-hidden="true"></span>
        <span class="hero-eyebrow-text">${esc(cityStr || 'Local')}</span>
      </div>
      <h1 class="fu d1">${esc(name)}</h1>
      <p class="hero-sub fu d2">${esc(tagline)}</p>
      <div class="hero-ctas fu d3">
        ${phone ? `<a href="tel:${cp}" class="btn-primary" aria-label="Call ${esc(name)} at ${esc(phone)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          ${esc(phone)}
        </a>` : ''}
        ${services.length ? `<a href="#services" class="btn-secondary">Our services →</a>` : ''}
      </div>
      <div class="hero-trust fu d4">
        <div class="trust-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${ratingTxt} · ${reviewCount} reviews
        </div>
        ${cityStr ? `<div class="trust-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(cityStr)}
        </div>` : ''}
      </div>
    </div>
    ${heroImg ? `<div class="hero-photo">
      <img src="${heroImg}" alt="${heroAlt}" fetchpriority="high" decoding="async">
    </div>` : ''}
  </div>
</section>

<div class="rating-bar" role="img" aria-label="${ratingTxt} stars, ${reviewCount} Google reviews${cityStr ? ', ' + cityStr : ''}">
  <div class="rb-left">
    <span class="rb-stars" aria-hidden="true">${stars(rating)}</span>
    <span class="rb-score">${ratingTxt}</span>
    <span class="rb-count">· ${reviewCount} Google reviews</span>
    ${cityStr ? `<div class="rb-sep" aria-hidden="true"></div><span class="rb-location">📍 ${esc(cityStr)}</span>` : ''}
  </div>
  ${phone ? `<a href="tel:${cp}" class="rb-cta" aria-label="Call now">Call now →</a>` : ''}
</div>

${servicesHTML}
${featureHTML}

<section class="contact" id="contact" aria-labelledby="contact-title">
  <h2 class="contact-title" id="contact-title">Get in touch.</h2>
  <div class="contact-layout">
    <div>
      ${phone ? `<a href="tel:${cp}" class="contact-phone" aria-label="Call ${esc(name)} at ${esc(phone)}">
        <div class="contact-phone-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
        </div>
        <div>
          <div class="contact-phone-label">Call or text</div>
          <div class="contact-phone-num">${esc(phone)}</div>
        </div>
      </a>` : ''}
      ${address ? `<address style="font-style:normal;">
        <div class="contact-addr">
          <div class="addr-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div class="addr-text">${esc(address)}</div>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="addr-dir">Get directions →</a>
          </div>
        </div>
      </address>` : ''}
    </div>
    ${hoursHTML}
  </div>
</section>
</main>

<footer>
  <span class="foot-logo">${esc(name)}</span>
  <span class="foot-credit">A HelloSite · gethellosite.com</span>
</footer>

${phone ? `<div class="sticky-cta" role="complementary" aria-label="Quick contact">
  <a href="tel:${cp}" class="sticky-call" aria-label="Call ${esc(name)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.5 19.79 19.79 0 01.22 1.89 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
    Call ${esc(phone)}
  </a>
  <a href="#contact" class="sticky-hours">Hours →</a>
</div>` : ''}

${claimCTA('var(--accent)', place.id)}

<script>
(function(){'use strict';
var hero=document.querySelector('.hero'),sticky=document.querySelector('.sticky-cta');
if(hero&&sticky&&window.matchMedia('(max-width:767px)').matches){
  new IntersectionObserver(function(e){sticky.classList.toggle('visible',!e[0].isIntersecting);},{threshold:0}).observe(hero);
}
if('IntersectionObserver' in window){
  var t=document.querySelectorAll('.service-card, .review-card, .contact-phone, .contact-addr');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.animation='fade-up .45s ease forwards';io.unobserve(e.target);}});},{threshold:0.08});
  t.forEach(function(el){el.style.opacity='0';io.observe(el);});
}
})();
</script>
</body>
</html>`;
}


// ─── TEMPLATE SELECTION ──────────────────────────────────────────────────────
// Google Places returns place.types ordered most-to-least specific.
// getTemplate() walks TYPE_MAP in priority order and returns the first match.
// Falls back to "transactional" for unknown types (safe default).

const TYPE_MAP = [
  // ── Transactional ──────────────────────────────────────────────────
  ['pet_groomer',             'transactional'],
  ['barber_shop',             'transactional'],
  ['nail_salon',              'transactional'],
  ['hair_salon',              'transactional'],
  ['hair_care',               'transactional'],
  ['beauty_salon',            'transactional'], // lash, waxing, brow bars
  // ── Minimalist ───────────────────────────────────────────────────
  ['spa',                     'minimalist'],
  ['massage_therapist',       'minimalist'],
  // ── Bold ─────────────────────────────────────────────────────────
  ['car_wash',                'bold'],          // auto detailing
  ['car_repair',              'bold'],
  ['electrician',             'bold'],
  ['plumber',                 'bold'],
  ['general_contractor',      'bold'],
  ['roofing_contractor',      'bold'],
  ['locksmith',               'bold'],
  ['pest_control',            'bold'],
  ['moving_company',          'bold'],
  ['house_cleaning_service',  'bold'],
  ['landscaper',              'bold'],
  ['painter',                 'bold'],
  // ── Informative ──────────────────────────────────────────────────
  ['accounting',              'informative'],
  ['tax_preparation_service', 'informative'],
  ['notary_public',           'informative'],
  ['tailor',                  'informative'],
  ['lawyer',                  'informative'],
  ['insurance_agency',        'informative'],
  ['real_estate_agency',      'informative'],
  ['clothing_store',          'informative'],
  ['store',                   'informative'],
];

// Fallback map: when place.types misses TYPE_MAP, route by detectIndustry's
// coarse classification. Keeps unknown auto/cleaning/landscaping out of the
// transactional bucket, which is the wrong feel for those verticals.
const INDUSTRY_FALLBACK = {
  trades:   'bold',
  grooming: 'transactional',
  pet:      'transactional',
  wellness: 'minimalist',
  retail:   'informative',
};

/**
 * Returns the theme name for a Google Place types array.
 * @param {string[]} placeTypes — place.types from Google Places API
 * @param {string} [industryFallback] — coarse industry from detectIndustry()
 * @returns {"bold"|"minimalist"|"transactional"|"informative"}
 */
function getTemplate(placeTypes = [], industryFallback = null) {
  for (const [type, theme] of TYPE_MAP) {
    if (placeTypes.includes(type)) return theme;
  }
  return INDUSTRY_FALLBACK[industryFallback] || 'transactional';
}


// ─── EXPORTS ──────────────────────────────────────────────────────────────────

module.exports = {
  // Shared utils (unchanged)
  extractPlaceData,
  wrapHTML,
  claimCTA,
  galleryStrip,
  bestReview,
  stars,
  esc,
  cleanPhone,
  headline,
  secureSiteUrl,
  // New template functions
  templateBold,
  templateMinimalist,
  templateTransactional,
  templateInformative,
  // Template selector
  getTemplate,
  TYPE_MAP,
};
