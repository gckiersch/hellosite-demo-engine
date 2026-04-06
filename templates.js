/**
 * HelloSite — Demo Templates
 * templateTrades: v3 (conversion-focused, full-bleed hero, mobile-first)
 * templateGrooming, Wellness, Pet, Retail, RealEstate: v2 (unchanged)
 */

'use strict';

// ─── SHARED UTILS ─────────────────────────────────────────────────────────────

function extractPlaceData(place) {
  return {
    name:        place.displayName?.text || 'Local Business',
    shortName:   (place.displayName?.text || 'Business').split(' ').slice(0, 3).join(' '),
    phone:       place.nationalPhoneNumber || '',
    address:     place.formattedAddress || '',
    rating:      place.rating || 5.0,
    reviewCount: place.userRatingCount || 0,
    reviews:     (place.reviews || []).slice(0, 3),
    hours:       (place.regularOpeningHours?.weekdayDescriptions || []).slice(0, 3),
  };
}

function cleanPhone(p) { return (p || '').replace(/\D/g, ''); }
function stars(n) { return '★'.repeat(Math.round(n || 5)); }
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function headline(h, color) {
  return (h || '').split(/\\n|\n/)
    .map((l, i) => i === 1 ? `<span style="color:${color};">${esc(l)}</span>` : esc(l))
    .join('<br>');
}

function bestReview(reviews) {
  const pool = (reviews || []).filter(r => (r.rating || 0) >= 4);
  const sorted = pool.sort((a, b) =>
    (b.text?.text || '').length - (a.text?.text || '').length
  );
  const pick = sorted[0] || (reviews || [])[0] || {};
  return {
    text:   (pick.text?.text || '').slice(0, 260),
    author: pick.authorAttribution?.displayName || 'Local Customer',
    rating: pick.rating || 5,
  };
}

function galleryStrip(gallery, border) {
  if (!gallery?.length) return '';
  const cols = Math.min(gallery.length, 3);
  return `
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px;">
    ${gallery.slice(0, 3).map(url =>
      `<div style="height:200px;background:url('${url}') center/cover no-repeat;"></div>`
    ).join('')}
  </div>`;
}

function claimCTA(accent, textColor) {
  return `
  <a href="https://gethellosite.com/#demo"
     style="position:fixed;bottom:20px;right:20px;z-index:9999;
            background:${accent};color:${textColor || '#fff'};
            padding:13px 24px;border-radius:6px;
            font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
            box-shadow:0 8px 32px ${accent}55;text-decoration:none;
            font-family:system-ui,sans-serif;white-space:nowrap;">
    ✦ Claim This Site
  </a>`;
}

function wrapHTML(name, fonts, extraCSS, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{overflow-x:hidden;-webkit-font-smoothing:antialiased;}
  a{text-decoration:none;color:inherit;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  .fu{opacity:0;animation:fadeUp .65s ease forwards;}
  .d1{animation-delay:.1s}.d2{animation-delay:.25s}.d3{animation-delay:.4s}
  @media(max-width:768px){
    .mob-hide{display:none!important;}
    .g3{grid-template-columns:1fr 1fr!important;}
    .gfooter{grid-template-columns:1fr!important;}
    .mob-pad{padding:40px 20px!important;}
  }
  ${extraCSS || ''}
</style>
</head>
<body>${body}</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. TRADES — v3
// Full-bleed hero · Phone prominent · Trust signals in viewport · Mobile-first
// ═══════════════════════════════════════════════════════════════════════════════

function templateTrades(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const allHours = (place.regularOpeningHours?.weekdayDescriptions || []);
  const review = bestReview(reviews);
  const services = copy.services || [];
  const serviceDescs = copy.service_descs || [];

const BG:'#13141A', SURFACE:'#1C1E26', CARD:'#242830', ACCENT:'#B87D2E', TEXT:'#E8E2D8', MUTED:'#7A7A82', BORDER:'#2C2E38'

  const cp = cleanPhone(phone);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  function starsHTML(n, color, size) {
    return `<span style="color:${color};font-size:${size || 16}px;letter-spacing:2px;">${'★'.repeat(Math.round(n || 5))}</span>`;
  }

  function hoursRows(hoursArr) {
    if (!hoursArr || !hoursArr.length) return `<p style="font-size:13px;color:${MUTED};">Call for hours</p>`;
    return hoursArr.map(h => {
      const idx  = h.indexOf(':');
      const day  = idx > -1 ? h.slice(0, idx) : h;
      const time = idx > -1 ? h.slice(idx + 1).trim() : '';
      const closed = time.toLowerCase().includes('closed');
      return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${BORDER};">
        <span style="font-size:13px;color:${MUTED};">${esc(day)}</span>
        <span style="font-size:13px;font-weight:600;color:${closed ? MUTED : TEXT};">${esc(time) || 'Closed'}</span>
      </div>`;
    }).join('');
  }

  function galleryMasonry(gallery) {
    if (!gallery || !gallery.length) return '';
    const imgs = gallery.slice(0, 4);
    if (imgs.length >= 4) {
      return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:200px 200px;gap:4px;">
        <div style="grid-row:1/3;overflow:hidden;">
          <img src="${imgs[0]}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"/>
        </div>
        ${imgs.slice(1).map(url => `<div style="overflow:hidden;">
          <img src="${url}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"/>
        </div>`).join('')}
      </div>`;
    }
    return `<div style="display:grid;grid-template-columns:repeat(${imgs.length},1fr);gap:4px;">
      ${imgs.map(url => `<div style="height:220px;overflow:hidden;">
        <img src="${url}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"/>
      </div>`).join('')}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:${BG};color:${TEXT};font-family:'Barlow',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
  a{text-decoration:none;color:inherit;}
  img{display:block;}
  @keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .fu{opacity:0;animation:fu .6s ease forwards;}
  .d1{animation-delay:.1s}.d2{animation-delay:.22s}.d3{animation-delay:.34s}.d4{animation-delay:.46s}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @media(max-width:680px){
    .desk-only{display:none!important;}
    .hero-text{padding:0 20px 36px!important;}
    .hero-h1{font-size:clamp(40px,12vw,58px)!important;}
    .section{padding:40px 20px!important;}
    .s-grid{grid-template-columns:1fr 1fr!important;}
    .f-grid{grid-template-columns:1fr!important;gap:28px!important;}
    .stats{grid-template-columns:repeat(2,1fr)!important;}
  }
</style>
</head>
<body>

<!-- 1. TOP BAR -->
<div style="background:${ACCENT};padding:10px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
  <span style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;color:#fff;letter-spacing:.08em;text-transform:uppercase;" class="desk-only">
    <span style="display:inline-block;width:7px;height:7px;background:#fff;border-radius:50%;margin-right:7px;animation:pulse 2s infinite;vertical-align:middle;"></span>
    Same-Day Service &nbsp;&middot;&nbsp; Free Estimates &nbsp;&middot;&nbsp; Licensed &amp; Insured
  </span>
  <a href="tel:${cp}" style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;color:#fff;letter-spacing:.03em;">
    &#128222; ${esc(phone)}
  </a>
</div>

<!-- 2. HERO — full bleed photo, text at bottom -->
<section style="position:relative;min-height:92vh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;">
  ${photos.hero
    ? `<div style="position:absolute;inset:0;background:url('${photos.hero}') center/cover no-repeat;"></div>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a1c20,#2a2c30);"></div>`
  }
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,10,.97) 0%,rgba(8,8,10,.7) 30%,rgba(8,8,10,.2) 65%,transparent 100%);"></div>

  <!-- Nav overlay -->
  <div style="position:absolute;top:0;left:0;right:0;z-index:10;padding:18px 32px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:800;letter-spacing:.06em;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5);">${esc(shortName.toUpperCase())}</div>
    <nav style="display:flex;gap:24px;align-items:center;" class="desk-only">
      <a href="#services" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,.6)'">Services</a>
      <a href="#reviews" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,.6)'">Reviews</a>
      <a href="#contact" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,.6)'">Location &amp; Hours</a>
      <a href="tel:${cp}" style="background:${ACCENT};color:#fff;padding:8px 18px;border-radius:4px;font-size:13px;font-weight:700;">Call Now</a>
    </nav>
  </div>

  <!-- Hero text anchored bottom -->
  <div style="position:relative;z-index:2;padding:0 36px 52px;max-width:800px;" class="hero-text">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);padding:6px 14px;border-radius:100px;margin-bottom:20px;" class="fu">
      ${starsHTML(rating, GOLD, 14)}
      <span style="font-size:13px;font-weight:600;color:#fff;">${rating}</span>
      <span style="font-size:12px;color:rgba(255,255,255,.5);">&nbsp;&middot;&nbsp;${reviewCount} Google reviews</span>
    </div>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(52px,8vw,90px);font-weight:800;line-height:.94;letter-spacing:-.01em;color:#fff;margin-bottom:16px;text-shadow:0 2px 16px rgba(0,0,0,.4);" class="fu d1 hero-h1">
      ${headline(copy.hero_headline || name, ACCENT)}
    </h1>
    <p style="font-size:17px;color:rgba(255,255,255,.62);line-height:1.7;max-width:480px;margin-bottom:28px;" class="fu d2">${esc(copy.hero_sub || '')}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;" class="fu d3">
      <a href="tel:${cp}"
         style="background:${ACCENT};color:#fff;padding:14px 28px;border-radius:5px;
                font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;
                letter-spacing:.05em;text-transform:uppercase;
                box-shadow:0 4px 24px rgba(232,82,26,.45);
                display:inline-flex;align-items:center;gap:8px;">
        &#128222; Call Now &mdash; ${esc(phone)}
      </a>
      <a href="#services"
         style="background:rgba(255,255,255,.1);backdrop-filter:blur(8px);color:#fff;
                padding:14px 22px;border-radius:5px;border:1px solid rgba(255,255,255,.18);
                font-size:15px;font-weight:500;">
        See Services
      </a>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:22px;" class="fu d4">
      ${['&#10003; Licensed','&#10003; Insured','&#10003; Free Estimates','&#10003; Same-Day'].map(b =>
        `<span style="font-size:12px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.03em;">${b}</span>`
      ).join('<span style="color:rgba(255,255,255,.18);margin:0 3px;">&middot;</span>')}
    </div>
  </div>
</section>

<!-- 3. STATS STRIP -->
<div style="background:${SURFACE};border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};">
  <div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);" class="stats">
    ${[
      [String(rating), 'Star Rating'],
      [String(reviewCount), 'Google Reviews'],
      ['Same Day', 'Service'],
      ['Free', 'Estimates'],
    ].map(([num, label], i) => `
    <div style="padding:20px 16px;text-align:center;${i < 3 ? `border-right:1px solid ${BORDER};` : ''}">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:${ACCENT};line-height:1;">${esc(num)}</div>
      <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:.1em;margin-top:3px;">${label}</div>
    </div>`).join('')}
  </div>
</div>

<!-- 4. SERVICES -->
<section id="services" style="padding:60px 32px;max-width:960px;margin:0 auto;" class="section">
  <p style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:${ACCENT};letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px;">${esc(copy.services_label || 'WHAT WE DO')}</p>
  <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(32px,5vw,50px);font-weight:800;line-height:1;color:${TEXT};margin-bottom:36px;">Everything Your Vehicle Needs</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;" class="s-grid">
    ${services.map((s, i) => `
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:22px 20px;transition:border-color .2s,transform .2s;"
         onmouseover="this.style.borderColor='${ACCENT}';this.style.transform='translateY(-2px)'"
         onmouseout="this.style.borderColor='${BORDER}';this.style.transform='translateY(0)'">
      <div style="width:32px;height:3px;background:${ACCENT};border-radius:2px;margin-bottom:12px;"></div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;color:${TEXT};margin-bottom:5px;line-height:1.2;">${esc(s)}</div>
      <div style="font-size:13px;color:${MUTED};line-height:1.6;">${esc(serviceDescs[i] || '')}</div>
    </div>`).join('')}
  </div>
</section>

<!-- 5. REVIEW -->
<section id="reviews" style="background:${ACCENT};padding:52px 32px;" class="section">
  <div style="max-width:700px;margin:0 auto;text-align:center;">
    <div style="font-size:56px;color:rgba(255,255,255,.18);line-height:1;margin-bottom:2px;font-family:Georgia,serif;">&ldquo;</div>
    <p style="font-family:'Barlow',sans-serif;font-size:clamp(17px,2.5vw,22px);font-weight:500;color:#fff;line-height:1.7;font-style:italic;margin-bottom:18px;">${esc(review.text)}</p>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;">
      ${starsHTML(review.rating, 'rgba(255,255,255,.8)', 14)}
      <span style="font-size:13px;color:rgba(255,255,255,.7);font-weight:500;">&mdash; ${esc(review.author)}</span>
    </div>
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);padding:7px 16px;border-radius:100px;">
      ${starsHTML(rating, '#fff', 12)}
      <span style="font-size:12px;color:#fff;font-weight:600;">${rating} &middot; ${reviewCount} Google Reviews</span>
    </div>
  </div>
</section>

<!-- 6. GALLERY -->
${photos.gallery && photos.gallery.length ? galleryMasonry(photos.gallery) : ''}

<!-- 7. CONTACT -->
<section id="contact" style="padding:60px 32px;max-width:960px;margin:0 auto;" class="section">
  <p style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:${ACCENT};letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px;">FIND US</p>
  <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(32px,5vw,48px);font-weight:800;line-height:1;color:${TEXT};margin-bottom:36px;">${esc(copy.cta_heading || 'Get In Touch')}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;" class="f-grid">
    <div>
      <p style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:${MUTED};letter-spacing:.15em;text-transform:uppercase;margin-bottom:14px;">Hours</p>
      ${hoursRows(allHours)}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <a href="tel:${cp}"
         style="background:${ACCENT};color:#fff;padding:16px 22px;border-radius:6px;
                display:flex;align-items:center;gap:14px;
                box-shadow:0 4px 20px rgba(232,82,26,.3);transition:transform .2s;"
         onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <span style="font-size:22px;">&#128222;</span>
        <div>
          <div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;opacity:.75;margin-bottom:2px;">Call or Text</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:800;letter-spacing:.02em;">${esc(phone)}</div>
        </div>
      </a>
      <a href="${mapsUrl}" target="_blank"
         style="background:${CARD};border:1px solid ${BORDER};color:${TEXT};padding:16px 22px;border-radius:6px;
                display:flex;align-items:flex-start;gap:14px;transition:border-color .2s;"
         onmouseover="this.style.borderColor='${ACCENT}'" onmouseout="this.style.borderColor='${BORDER}'">
        <span style="font-size:20px;margin-top:2px;">&#128205;</span>
        <div>
          <div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};margin-bottom:4px;">Location</div>
          <div style="font-size:15px;line-height:1.5;">${esc(address)}</div>
          <div style="font-size:12px;color:${ACCENT};margin-top:6px;font-weight:600;">Get Directions &rarr;</div>
        </div>
      </a>
      ${copy.cta_sub ? `<p style="font-size:14px;color:${MUTED};line-height:1.7;">${esc(copy.cta_sub)}</p>` : ''}
    </div>
  </div>
</section>

<!-- 8. FOOTER -->
<footer style="background:#0A0A0C;border-top:1px solid ${BORDER};padding:20px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
  <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.25);">${esc(shortName.toUpperCase())}</div>
  <div style="display:flex;align-items:center;gap:20px;">
    <a href="${mapsUrl}" target="_blank" style="font-size:12px;color:rgba(255,255,255,.25);" onmouseover="this.style.color='${ACCENT}'" onmouseout="this.style.color='rgba(255,255,255,.25)'">Google Maps</a>
    <a href="tel:${cp}" style="font-size:12px;color:rgba(255,255,255,.25);" onmouseover="this.style.color='${ACCENT}'" onmouseout="this.style.color='rgba(255,255,255,.25)'">${esc(phone)}</a>
  </div>
  <div style="font-size:10px;color:rgba(255,255,255,.1);letter-spacing:.06em;">A HelloSite &middot; GetHelloSite.com</div>
</footer>

<!-- 9. CLAIM CTA -->
<a href="https://gethellosite.com/#demo"
   style="position:fixed;bottom:20px;right:20px;z-index:9999;
          background:${ACCENT};color:#fff;
          padding:12px 22px;border-radius:6px;
          font-family:'Barlow Condensed',sans-serif;
          font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
          box-shadow:0 8px 32px rgba(232,82,26,.5);
          display:flex;align-items:center;gap:6px;white-space:nowrap;">
  &#10022; Claim This Site
</a>

</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. GROOMING — Black · Cormorant Garamond · Gold
// ═══════════════════════════════════════════════════════════════════════════════

function templateGrooming(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const review = bestReview(reviews);
  const services = copy.services || [];

  const BG = '#0A0A0A', SURFACE = '#141414', ACCENT = '#C9A84C';
  const TEXT = '#F5F0E8', MUTED = '#666', BORDER = '#1E1E1E';

  return wrapHTML(name,
    'family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Outfit:wght@300;400;500;600',
    `body{background:${BG};color:${TEXT};font-family:'Outfit',sans-serif;}`,
    `
  <div style="height:3px;background:linear-gradient(90deg,transparent,${ACCENT},transparent);"></div>
  <div style="padding:20px 36px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;">
    <div style="font-family:'Cormorant Garamond',serif;font-size:11px;color:${MUTED};letter-spacing:.2em;" class="mob-hide">Est. in Business</div>
    <div style="text-align:center;">
      <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;letter-spacing:.2em;">${esc(name.toUpperCase())}</div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,${ACCENT},transparent);margin:6px 0;"></div>
      <div style="font-size:10px;color:${MUTED};letter-spacing:.22em;text-transform:uppercase;">${esc(copy.tagline || '')}</div>
    </div>
    <div style="text-align:right;font-family:'Cormorant Garamond',serif;font-size:13px;color:${MUTED};" class="mob-hide">
      <a href="tel:${cleanPhone(phone)}" style="color:${MUTED};">${esc(phone)}</a>
    </div>
  </div>
  <div style="padding:44px 36px 52px;max-width:660px;margin:0 auto;text-align:center;" class="mob-pad">
    <span style="color:${ACCENT};font-size:17px;letter-spacing:2px;" class="fu">${stars(rating)}</span>
    <p style="font-size:10px;color:${MUTED};letter-spacing:.2em;text-transform:uppercase;margin-top:8px;margin-bottom:32px;" class="fu">${rating} Stars &middot; ${reviewCount} Reviews</p>
    <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(48px,8vw,84px);font-weight:700;line-height:1.0;margin-bottom:22px;" class="fu d1">
      ${headline(copy.hero_headline, ACCENT)}
    </h1>
    <p style="font-size:14px;color:${MUTED};margin-bottom:36px;font-weight:300;letter-spacing:.03em;line-height:1.8;" class="fu d2">${esc(copy.hero_sub || '')}</p>
    <div style="display:flex;gap:14px;justify-content:center;" class="fu d3">
      <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:${BG};padding:12px 28px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-family:'Outfit',sans-serif;font-weight:600;">BOOK APPOINTMENT</a>
      <a href="#services" style="background:transparent;border:1px solid ${BORDER};color:${MUTED};padding:12px 20px;font-size:11px;letter-spacing:.1em;">SERVICES</a>
    </div>
  </div>
  ${photos.hero ? `<div style="height:360px;background:url('${photos.hero}') center/cover no-repeat;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};"></div>` : ''}
  <div style="background:${SURFACE};padding:48px 36px;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};" class="mob-pad" id="services">
    <div style="max-width:540px;margin:0 auto;">
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:11px;font-weight:600;color:${MUTED};letter-spacing:.3em;text-transform:uppercase;text-align:center;margin-bottom:32px;">${esc(copy.services_label || 'THE MENU')}</h2>
      ${services.map((s, i) => `
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid ${BORDER};padding:14px 0;">
        <span style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;">${esc(s)}</span>
        ${copy.service_descs?.[i] ? `<span style="font-size:12px;color:${MUTED};font-family:'Outfit',sans-serif;font-weight:300;">${esc(copy.service_descs[i])}</span>` : ''}
      </div>`).join('')}
    </div>
  </div>
  <div style="padding:60px 36px;max-width:580px;margin:0 auto;text-align:center;" class="mob-pad">
    <div style="width:36px;height:1px;background:${ACCENT};margin:0 auto 28px;"></div>
    <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(18px,3vw,24px);font-style:italic;line-height:1.7;margin-bottom:18px;">&ldquo;${esc(review.text)}&rdquo;</p>
    <p style="font-size:10px;color:${MUTED};letter-spacing:.2em;text-transform:uppercase;">&mdash; ${esc(review.author)}</p>
    <div style="width:36px;height:1px;background:${ACCENT};margin:28px auto 0;"></div>
  </div>
  ${galleryStrip(photos.gallery, BORDER)}
  <div style="border-top:1px solid ${BORDER};padding:28px 36px;text-align:center;" class="mob-pad">
    <p style="font-size:13px;color:${MUTED};margin-bottom:10px;">${esc(address)}</p>
    <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin-bottom:20px;">
      ${hours.map(h => `<span style="font-size:11px;color:${MUTED};letter-spacing:.04em;">${esc(h)}</span>`).join('')}
    </div>
    <a href="tel:${cleanPhone(phone)}" style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:${ACCENT};">${esc(phone)}</a>
    <div style="margin-top:20px;font-size:10px;color:${BORDER};font-family:'Outfit',sans-serif;letter-spacing:.05em;">A HelloSite &middot; GetHelloSite.com</div>
  </div>
  ${claimCTA(ACCENT, BG)}
  `);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. WELLNESS — Cream · Cormorant · Terracotta
// ═══════════════════════════════════════════════════════════════════════════════

function templateWellness(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const review = bestReview(reviews);
  const services = copy.services || [];

  const BG = '#F7F2EB', SURFACE = '#EDE7DC', ACCENT = '#A6754A';
  const TEXT = '#2A1F18', MUTED = '#8A7E74', BORDER = '#DDD4C8';

  return wrapHTML(name,
    'family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Nunito:wght@400;600;700',
    `body{background:${BG};color:${TEXT};font-family:'Nunito',sans-serif;}`,
    `
  <div style="padding:20px 36px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BORDER};">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;letter-spacing:.04em;">${esc(name)}</div>
      <div style="font-size:11px;color:${MUTED};letter-spacing:.08em;margin-top:3px;">${esc(copy.tagline || '')}</div>
    </div>
    <div style="display:flex;align-items:center;gap:20px;">
      <span style="font-size:14px;color:${MUTED};" class="mob-hide">${esc(phone)}</span>
      <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:#fff;padding:10px 20px;border-radius:30px;font-size:13px;font-weight:700;">Book Now</a>
    </div>
  </div>
  <div style="position:relative;min-height:520px;display:flex;align-items:flex-end;overflow:hidden;">
    ${photos.hero
      ? `<div style="position:absolute;inset:0;background:url('${photos.hero}') center/cover no-repeat;"></div>
         <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(42,31,24,.88) 0%,rgba(42,31,24,.4) 50%,transparent 100%);"></div>`
      : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,${ACCENT},${SURFACE});"></div>
         <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(42,31,24,.7) 0%,transparent 60%);"></div>`
    }
    <div style="position:relative;z-index:2;padding:0 36px 48px;max-width:720px;" class="mob-pad">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;" class="fu">
        <span style="color:${ACCENT};font-size:16px;">${stars(rating)}</span>
        <span style="color:rgba(255,255,255,.65);font-size:13px;">${rating} &middot; ${reviewCount} reviews</span>
      </div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(42px,6.5vw,70px);font-weight:700;line-height:1.08;color:#fff;margin-bottom:18px;" class="fu d1">
        ${headline(copy.hero_headline, '#e8c99a')}
      </h1>
      <p style="font-size:16px;color:rgba(255,255,255,.65);max-width:460px;line-height:1.8;margin-bottom:32px;" class="fu d2">${esc(copy.hero_sub || '')}</p>
      <div style="display:flex;gap:14px;align-items:center;" class="fu d3">
        <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:#fff;padding:13px 28px;border-radius:4px;font-size:14px;font-weight:700;">Schedule a Session</a>
        <a href="tel:${cleanPhone(phone)}" style="border:1px solid rgba(255,255,255,.3);color:#fff;padding:13px 20px;border-radius:4px;font-size:14px;" class="mob-hide">${esc(phone)}</a>
      </div>
    </div>
  </div>
  <div style="background:${SURFACE};padding:52px 36px;border-bottom:1px solid ${BORDER};" class="mob-pad" id="services">
    <div style="max-width:860px;margin:0 auto;">
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:${TEXT};margin-bottom:8px;">${esc(copy.services_label || 'Our Services')}</h2>
      <p style="font-size:14px;color:${MUTED};margin-bottom:32px;line-height:1.7;">${esc(copy.hero_sub || 'Every session tailored to you.')}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;" class="g3">
        ${services.map((s, i) => `
        <div style="background:${BG};border-radius:10px;padding:22px;border:1px solid ${BORDER};">
          <div style="width:28px;height:3px;background:${ACCENT};border-radius:2px;margin-bottom:12px;"></div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;margin-bottom:5px;">${esc(s)}</div>
          ${copy.service_descs?.[i] ? `<div style="font-size:12px;color:${MUTED};line-height:1.6;">${esc(copy.service_descs[i])}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div style="padding:60px 36px;max-width:640px;margin:0 auto;" class="mob-pad">
    <div style="border-left:3px solid ${ACCENT};padding-left:28px;">
      <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(18px,3vw,24px);font-style:italic;line-height:1.75;margin-bottom:14px;">&ldquo;${esc(review.text)}&rdquo;</p>
      <p style="font-size:12px;color:${MUTED};letter-spacing:.06em;">&mdash; ${esc(review.author)}</p>
    </div>
  </div>
  ${galleryStrip(photos.gallery, BORDER)}
  <div style="background:${SURFACE};padding:36px;border-top:1px solid ${BORDER};" class="mob-pad">
    <div style="max-width:860px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;" class="gfooter">
      <div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Find Us</p>
        <p style="font-size:13px;color:${MUTED};line-height:1.9;">${esc(address)}</p>
      </div>
      <div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Hours</p>
        ${hours.map(h => `<p style="font-size:12px;color:${MUTED};line-height:1.9;">${esc(h)}</p>`).join('')}
      </div>
      <div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Call or Text</p>
        <a href="tel:${cleanPhone(phone)}" style="font-size:19px;font-weight:700;color:${TEXT};">${esc(phone)}</a>
        <div style="margin-top:20px;font-size:10px;color:${BORDER};letter-spacing:.05em;">A HelloSite &middot; GetHelloSite.com</div>
      </div>
    </div>
  </div>
  ${claimCTA(ACCENT)}
  `);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. PET — Warm Cream · Nunito · Orange
// ═══════════════════════════════════════════════════════════════════════════════

function templatePet(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const review = bestReview(reviews);
  const services = copy.services || [];

  const BG = '#FEFAF6', SURFACE = '#F5EFE5', ACCENT = '#E07340';
  const TEXT = '#2D2416', MUTED = '#8A7A6A', BORDER = '#E8DDD0';

  return wrapHTML(name,
    'family=Nunito:wght@400;600;700;800',
    `body{background:${BG};color:${TEXT};font-family:'Nunito',sans-serif;}`,
    `
  <div style="background:${ACCENT};padding:9px 24px;text-align:center;">
    <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:.04em;">&#128062; Now Accepting New Clients &middot; <a href="tel:${cleanPhone(phone)}" style="color:#fff;">${esc(phone)}</a></span>
  </div>
  <div style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${BORDER};">
    <div>
      <div style="font-size:21px;font-weight:800;">${esc(name)}</div>
      <div style="font-size:12px;color:${MUTED};margin-top:2px;">${esc(copy.tagline || '')}</div>
    </div>
    <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:#fff;padding:10px 20px;border-radius:30px;font-size:13px;font-weight:800;">Book a Groom</a>
  </div>
  <div style="padding:52px 32px 42px;max-width:860px;margin:0 auto;" class="mob-pad">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;" class="fu">
      <span style="color:${ACCENT};font-size:16px;">${stars(rating)}</span>
      <span style="font-size:13px;color:${MUTED};font-weight:600;">${rating} stars &middot; ${reviewCount} happy pet parents</span>
    </div>
    <h1 style="font-size:clamp(38px,6vw,64px);font-weight:800;line-height:1.08;margin-bottom:16px;" class="fu d1">
      ${headline(copy.hero_headline, ACCENT)}
    </h1>
    <p style="font-size:16px;color:${MUTED};max-width:460px;line-height:1.75;margin-bottom:32px;" class="fu d2">${esc(copy.hero_sub || '')}</p>
    <a href="tel:${cleanPhone(phone)}" style="display:inline-block;background:${TEXT};color:${BG};padding:14px 30px;border-radius:30px;font-size:14px;font-weight:800;" class="fu d3">Schedule Your Pet&rsquo;s Visit &rarr;</a>
  </div>
  ${photos.hero ? `<div style="height:300px;background:url('${photos.hero}') center/cover no-repeat;border-top:2px solid ${BORDER};border-bottom:2px solid ${BORDER};"></div>` : ''}
  <div style="background:${SURFACE};padding:44px 32px;border-top:2px solid ${BORDER};border-bottom:2px solid ${BORDER};" class="mob-pad" id="services">
    <div style="max-width:860px;margin:0 auto;">
      <h2 style="font-size:26px;font-weight:800;margin-bottom:8px;">${esc(copy.services_label || 'Our Services')}</h2>
      <p style="font-size:14px;color:${MUTED};margin-bottom:28px;line-height:1.7;">${esc(copy.hero_sub || 'Professional grooming for every breed and size.')}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;" class="g3">
        ${services.map((s, i) => `
        <div style="background:${BG};border-radius:14px;padding:18px 20px;border:2px solid ${BORDER};">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${esc(s)}</div>
          ${copy.service_descs?.[i] ? `<div style="font-size:11px;color:${MUTED};line-height:1.5;">${esc(copy.service_descs[i])}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div style="padding:52px 32px;max-width:620px;margin:0 auto;text-align:center;" class="mob-pad">
    <div style="font-size:40px;color:${ACCENT};line-height:1;margin-bottom:10px;">&#128062;</div>
    <p style="font-size:clamp(15px,2.5vw,19px);line-height:1.75;margin-bottom:14px;font-style:italic;">&ldquo;${esc(review.text)}&rdquo;</p>
    <p style="font-size:12px;color:${MUTED};font-weight:600;">&mdash; ${esc(review.author)}</p>
  </div>
  ${galleryStrip(photos.gallery, BORDER)}
  <div style="background:${SURFACE};padding:36px 32px;border-top:2px solid ${BORDER};" class="mob-pad">
    <div style="max-width:860px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;" class="gfooter">
      <div>
        <p style="font-size:11px;font-weight:800;color:${ACCENT};letter-spacing:.1em;text-transform:uppercase;margin-bottom:9px;">Location</p>
        <p style="font-size:13px;color:${MUTED};line-height:1.9;">${esc(address)}</p>
      </div>
      <div>
        <p style="font-size:11px;font-weight:800;color:${ACCENT};letter-spacing:.1em;text-transform:uppercase;margin-bottom:9px;">Hours</p>
        ${hours.map(h => `<p style="font-size:12px;color:${MUTED};line-height:1.9;">${esc(h)}</p>`).join('')}
      </div>
      <div>
        <p style="font-size:11px;font-weight:800;color:${ACCENT};letter-spacing:.1em;text-transform:uppercase;margin-bottom:9px;">Call Us</p>
        <a href="tel:${cleanPhone(phone)}" style="font-size:19px;font-weight:800;color:${TEXT};">${esc(phone)}</a>
        <div style="margin-top:20px;font-size:10px;color:${BORDER};letter-spacing:.05em;">A HelloSite &middot; GetHelloSite.com</div>
      </div>
    </div>
  </div>
  ${claimCTA(ACCENT)}
  `);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. RETAIL — Off-White · Playfair Display · Rose
// ═══════════════════════════════════════════════════════════════════════════════

const RETAIL_SWATCHES = ['#F9EEF0','#EAF0EA','#F0EAF4','#FFF3E8','#EAF0F8','#FFE8E8'];

function templateRetail(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const review = bestReview(reviews);
  const services = copy.services || [];

  const BG = '#FDFAF8', SURFACE = '#F5EFE8', ACCENT = '#C44569';
  const TEXT = '#2A1F1A', MUTED = '#9A8880', BORDER = '#E8DDD5';

  return wrapHTML(name,
    'family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Jost:wght@400;500;600',
    `body{background:${BG};color:${TEXT};font-family:'Jost',sans-serif;}`,
    `
  <div style="background:${ACCENT};padding:9px 24px;text-align:center;">
    <span style="font-size:12px;font-weight:500;color:#fff;letter-spacing:.12em;text-transform:uppercase;">
      Free local delivery on orders $75+ &middot; <a href="tel:${cleanPhone(phone)}" style="color:#fff;">${esc(phone)}</a>
    </span>
  </div>
  <div style="padding:20px 36px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BORDER};">
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:23px;font-weight:800;letter-spacing:.02em;">${esc(name)}</div>
      <div style="font-size:11px;color:${MUTED};letter-spacing:.1em;margin-top:3px;">${esc(copy.tagline || '')}</div>
    </div>
    <div style="display:flex;gap:24px;align-items:center;" class="mob-hide">
      <a href="#services" style="font-size:13px;color:${MUTED};">Collections</a>
      <a href="#contact" style="font-size:13px;color:${MUTED};">Visit Us</a>
    </div>
  </div>
  <div style="padding:58px 36px 46px;max-width:860px;margin:0 auto;" class="mob-pad">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;" class="fu">
      <span style="color:${ACCENT};font-size:16px;">${stars(rating)}</span>
      <span style="font-size:13px;color:${MUTED};">${rating} &middot; ${reviewCount} reviews</span>
    </div>
    <h1 style="font-family:'Playfair Display',serif;font-size:clamp(42px,6.5vw,72px);font-weight:800;line-height:1.08;margin-bottom:20px;" class="fu d1">
      ${headline(copy.hero_headline, ACCENT)}
    </h1>
    <p style="font-size:16px;color:${MUTED};max-width:460px;line-height:1.8;margin-bottom:36px;" class="fu d2">${esc(copy.hero_sub || '')}</p>
    <div style="display:flex;gap:12px;" class="fu d3">
      <a href="#services" style="background:${ACCENT};color:#fff;padding:13px 26px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:.04em;">Shop Our Collections</a>
      <a href="#contact" style="background:transparent;border:1px solid ${BORDER};color:${MUTED};padding:13px 20px;border-radius:4px;font-size:13px;">Get Directions</a>
    </div>
  </div>
  ${photos.hero ? `<div style="height:320px;background:url('${photos.hero}') center/cover no-repeat;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};"></div>` : ''}
  <div style="background:${SURFACE};padding:48px 36px;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};" class="mob-pad" id="services">
    <div style="max-width:860px;margin:0 auto;">
      <h2 style="font-family:'Playfair Display',serif;font-size:26px;font-weight:800;margin-bottom:28px;">${esc(copy.services_label || 'Shop by Category')}</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;" class="g3">
        ${services.map((s, i) => `
        <div style="background:${RETAIL_SWATCHES[i % RETAIL_SWATCHES.length]};border-radius:10px;padding:26px 20px;border:1px solid ${BORDER};">
          <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;margin-bottom:5px;">${esc(s)}</div>
          ${copy.service_descs?.[i] ? `<div style="font-size:12px;color:${MUTED};">${esc(copy.service_descs[i])}</div>` : ''}
        </div>`).join('')}
      </div>
      ${copy.services_sub ? `<p style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:${MUTED};margin-top:28px;text-align:center;">${esc(copy.services_sub)}</p>` : ''}
    </div>
  </div>
  <div style="padding:56px 36px;max-width:640px;margin:0 auto;text-align:center;" class="mob-pad">
    <div style="width:48px;height:2px;background:${ACCENT};margin:0 auto 24px;"></div>
    <p style="font-family:'Playfair Display',serif;font-size:clamp(17px,3vw,22px);font-style:italic;line-height:1.75;margin-bottom:14px;">&ldquo;${esc(review.text)}&rdquo;</p>
    <p style="font-size:12px;color:${MUTED};">&mdash; ${esc(review.author)}</p>
    <div style="width:48px;height:2px;background:${ACCENT};margin:24px auto 0;"></div>
  </div>
  ${galleryStrip(photos.gallery, BORDER)}
  <div style="background:${SURFACE};padding:36px;border-top:1px solid ${BORDER};" class="mob-pad" id="contact">
    <div style="max-width:860px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;" class="gfooter">
      <div>
        <p style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Visit Us</p>
        <p style="font-size:13px;color:${MUTED};line-height:1.9;">${esc(address)}</p>
      </div>
      <div>
        <p style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Hours</p>
        ${hours.map(h => `<p style="font-size:12px;color:${MUTED};line-height:1.9;">${esc(h)}</p>`).join('')}
      </div>
      <div>
        <p style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;margin-bottom:9px;">Contact</p>
        <a href="tel:${cleanPhone(phone)}" style="font-size:17px;font-weight:600;color:${TEXT};">${esc(phone)}</a>
        <div style="margin-top:20px;font-size:10px;color:${BORDER};letter-spacing:.05em;">A HelloSite &middot; GetHelloSite.com</div>
      </div>
    </div>
  </div>
  ${claimCTA(ACCENT)}
  `);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. REAL ESTATE — Navy · Libre Baskerville · Gold
// ═══════════════════════════════════════════════════════════════════════════════

const RE_STATS = [
  { num: '400+', label: 'Homes Closed' },
  { num: '14',   label: 'Years Local' },
  { num: '5.0',  label: 'Star Rating' },
  { num: '98%',  label: 'Satisfaction' },
];

function templateRealEstate(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const review = bestReview(reviews);
  const services = copy.services || [];

  const BG = '#0F1923', SURFACE = '#172130', ACCENT = '#C9A84C';
  const TEXT = '#F0ECE4', MUTED = '#7A8896', BORDER = '#243040';

  return wrapHTML(name,
    'family=Libre+Baskerville:ital,wght@0,700;1,400&family=Raleway:wght@400;500;600;700',
    `body{background:${BG};color:${TEXT};font-family:'Raleway',sans-serif;}`,
    `
  <div style="padding:20px 36px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BORDER};">
    <div>
      <div style="font-family:'Libre Baskerville',serif;font-size:21px;font-weight:700;">${esc(name)}</div>
      <div style="font-size:10px;color:${MUTED};letter-spacing:.1em;margin-top:3px;text-transform:uppercase;">${esc(copy.tagline || '')}</div>
    </div>
    <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:${BG};padding:10px 20px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:'Raleway',sans-serif;">Schedule a Call</a>
  </div>
  <div style="padding:62px 36px 50px;max-width:960px;margin:0 auto;" class="mob-pad">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;" class="fu">
      <span style="color:${ACCENT};font-size:16px;">${stars(rating)}</span>
      <span style="font-size:13px;color:${MUTED};">${rating} &middot; ${reviewCount} client reviews</span>
    </div>
    <h1 style="font-family:'Libre Baskerville',serif;font-size:clamp(40px,6.5vw,72px);font-weight:700;line-height:1.08;margin-bottom:20px;" class="fu d1">
      ${headline(copy.hero_headline, ACCENT)}
    </h1>
    <div style="width:56px;height:3px;background:${ACCENT};margin-bottom:22px;" class="fu d2"></div>
    <p style="font-size:16px;color:${MUTED};max-width:520px;line-height:1.85;margin-bottom:36px;" class="fu d2">${esc(copy.hero_sub || '')}</p>
    <div style="display:flex;gap:14px;" class="fu d3">
      <a href="tel:${cleanPhone(phone)}" style="background:${ACCENT};color:${BG};padding:13px 28px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Start Your Search</a>
      <a href="tel:${cleanPhone(phone)}" style="background:transparent;border:1px solid ${BORDER};color:${MUTED};padding:13px 22px;border-radius:4px;font-size:13px;" class="mob-hide">${esc(phone)}</a>
    </div>
  </div>
  ${photos.hero ? `<div style="height:340px;background:url('${photos.hero}') center/cover no-repeat;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};"></div>` : ''}
  <div style="background:${ACCENT};padding:28px 36px;">
    <div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;" class="g3">
      ${RE_STATS.map(({ num, label }) => `
      <div style="text-align:center;">
        <div style="font-family:'Libre Baskerville',serif;font-size:36px;font-weight:700;color:${BG};line-height:1;">${num}</div>
        <div style="font-family:'Raleway',sans-serif;font-size:10px;color:${BG}bb;letter-spacing:.15em;text-transform:uppercase;margin-top:5px;">${label}</div>
      </div>`).join('')}
    </div>
  </div>
  <div style="background:${SURFACE};padding:52px 36px;border-bottom:1px solid ${BORDER};" class="mob-pad" id="services">
    <div style="max-width:960px;margin:0 auto;">
      <h2 style="font-family:'Libre Baskerville',serif;font-size:26px;font-weight:700;margin-bottom:8px;">${esc(copy.services_label || 'How I Can Help')}</h2>
      <p style="font-size:14px;color:${MUTED};margin-bottom:30px;line-height:1.7;">${esc(copy.hero_sub || 'From your first showing to closing day.')}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;" class="g3">
        ${services.map((s, i) => `
        <div style="background:${BG};border:1px solid ${BORDER};padding:22px;border-radius:6px;">
          <div style="width:3px;height:20px;background:${ACCENT};margin-bottom:12px;"></div>
          <div style="font-family:'Libre Baskerville',serif;font-size:14px;font-weight:700;margin-bottom:5px;">${esc(s)}</div>
          ${copy.service_descs?.[i] ? `<div style="font-size:12px;color:${MUTED};line-height:1.6;">${esc(copy.service_descs[i])}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div style="padding:56px 36px;max-width:640px;margin:0 auto;" class="mob-pad">
    <div style="border-left:3px solid ${ACCENT};padding-left:28px;">
      <p style="font-family:'Libre Baskerville',serif;font-size:clamp(17px,2.8vw,21px);font-style:italic;line-height:1.75;margin-bottom:14px;">&ldquo;${esc(review.text)}&rdquo;</p>
      <p style="font-size:11px;color:${MUTED};letter-spacing:.08em;text-transform:uppercase;">&mdash; ${esc(review.author)}</p>
    </div>
  </div>
  ${galleryStrip(photos.gallery, BORDER)}
  <div style="background:${SURFACE};padding:36px;border-top:1px solid ${BORDER};" class="mob-pad" id="contact">
    <div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;" class="gfooter">
      <div>
        <p style="font-family:'Libre Baskerville',serif;font-size:11px;font-weight:700;color:${ACCENT};letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">Office</p>
        <p style="font-size:13px;color:${MUTED};line-height:1.9;">${esc(address)}</p>
      </div>
      <div>
        <p style="font-family:'Libre Baskerville',serif;font-size:11px;font-weight:700;color:${ACCENT};letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">Availability</p>
        ${hours.map(h => `<p style="font-size:12px;color:${MUTED};line-height:1.9;">${esc(h)}</p>`).join('')}
      </div>
      <div>
        <p style="font-family:'Libre Baskerville',serif;font-size:11px;font-weight:700;color:${ACCENT};letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">Direct Line</p>
        <a href="tel:${cleanPhone(phone)}" style="font-family:'Libre Baskerville',serif;font-size:20px;font-weight:700;color:${TEXT};">${esc(phone)}</a>
        <div style="margin-top:20px;font-size:10px;color:${BORDER};letter-spacing:.05em;">A HelloSite &middot; GetHelloSite.com</div>
      </div>
    </div>
  </div>
  ${claimCTA(ACCENT, BG)}
  `);
}


// ─── EXPORTS ──────────────────────────────────────────────────────────────────

module.exports = {
  templateTrades,
  templateGrooming,
  templateWellness,
  templatePet,
  templateRetail,
  templateRealEstate,
};
