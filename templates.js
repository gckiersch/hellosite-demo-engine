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
// 5 weights down from 7 — drops 500 (substituted by 400/600) and italic 700 (substituted by italic 800)
const _FONTS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,800&display=swap';


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
<link rel="stylesheet" href="/static/css/transactional.css">
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
<link rel="stylesheet" href="/static/css/bold.css">
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
<link rel="stylesheet" href="/static/css/minimalist.css">
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
<link rel="stylesheet" href="/static/css/informative.css">
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
