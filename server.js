const express = require('express');
const {
  templateTrades,
  templateGrooming,
  templateWellness,
  templatePet,
  templateRetail,
  templateRealEstate,
} = require('./templates');
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── CACHE ───────────────────────────────────────────────────────────────────
const demoCache = new Map();

// ─── HERO PHOTO OVERRIDES ────────────────────────────────────────────────────
// Hardcoded clean hero photos for specific businesses
// Bypasses classifier entirely — use when Google photos have text/logos
const heroOverrides = {
  'ChIJj-aliA_PwoARI36KBu4KTcQ': 'https://lh3.googleusercontent.com/p/AF1QipMLDOab55zCroTuQn8MfxNaD9mM7VsETR0ub6SB=s1360-w1360-h1020-rw', // TNT Auto Repair
  // 'ChIJuZ--3qnHwoARRyWOYPuvQVk': 'PASTE_CLEAN_LAMAY_PHOTO_URL_HERE', // Làmay Nail Spa
};

// ─── INDUSTRY ROUTING ────────────────────────────────────────────────────────
function detectIndustry(place) {
  const types = (place.types || []).join(',').toLowerCase();
  const primary = (place.primaryTypeDisplayName?.text || '').toLowerCase();
  if (types.match(/car_repair|electrician|plumber|contractor|roofing|locksmith|auto_parts|auto_repair/)) return 'trades';
  if (types.match(/pet_care|veterinary|pet_grooming|animal/) || primary.includes('pet') || primary.includes('dog') || primary.includes('cat')) return 'pet';
  if (types.match(/barber_shop/) || primary.includes('barber')) return 'grooming';
  if (types.match(/hair_salon|hair_care/) || primary.includes('hair')) return 'grooming';
  if (types.match(/nail_salon|spa|massage|beauty_salon/)) return 'wellness';
  if (types.match(/restaurant|cafe|bakery|bar|food|meal/)) return 'unsupported';
  if (types.match(/gym|fitness|yoga|sports_club/)) return 'unsupported';
  if (types.match(/store|shop|gift|clothing|jewelry|boutique/)) return 'retail';
  return 'retail';
}

const defaultLayouts = {
  trades:   'trades',
  grooming: 'grooming',
  wellness: 'wellness',
  pet:      'pet',
  retail:   'retail',
};

// Industry eyebrow labels — FIX #1
const serviceEyebrows = {
  trades:   'What We Do',
  grooming: 'The Services',
  wellness: 'Our Treatments',
  pet:      'Our Services',
  retail:   'The Shop',
};

// ─── PHOTO CLASSIFICATION ────────────────────────────────────────────────────
async function classifyPhotos(photoUrls, industry) {
  if (!photoUrls.length) return { hero: null, gallery: [] };
  const toClassify = photoUrls.slice(0, 8);

  const heroPrefs = {
    trades:   ['interior', 'people', 'detail', 'exterior'],
    grooming: ['people', 'interior', 'detail', 'exterior'],
    wellness: ['people', 'interior', 'detail', 'exterior'],
    pet:      ['people', 'interior', 'detail', 'exterior'],
    retail:   ['interior', 'product', 'people', 'exterior'],
  };
  const gallPrefs = {
    trades:   ['people', 'detail', 'interior', 'exterior'],
    grooming: ['people', 'detail', 'interior', 'exterior'],
    wellness: ['people', 'detail', 'interior', 'product'],
    pet:      ['people', 'detail', 'interior', 'exterior'],
    retail:   ['product', 'detail', 'interior', 'people'],
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 300,
        messages: [{ role: 'user', content: `Classify each photo for a ${industry} business website. Categories: "people" (humans clearly visible), "interior" (inside the business, clean), "exterior" (outside/storefront), "product" (items for sale), "detail" (close-up craftsmanship/work), "logo" (contains business logo, text overlay, phone number, address, or promotional graphics — these should NEVER be used as hero photos), "other". Be strict — any photo with business name text, phone numbers, or promotional graphics = "logo". Return ONLY a JSON array:\n\n${toClassify.map((u,i)=>`${i+1}. ${u}`).join('\n')}` }]
      })
    });
    const data = await res.json();
    const classifications = JSON.parse(data.content[0].text.trim());
    // FIX #3 — exclude logo/text photos entirely
    const classified = toClassify.map((url, i) => ({
      url,
      type: classifications[i] || 'other',
      isLogo: classifications[i] === 'logo'
    }));

    function pickBest(prefs, exclude = []) {
      for (const pref of prefs) {
        const match = classified.find(p => p.type === pref && !p.isLogo && !exclude.includes(p.url));
        if (match) return match.url;
      }
      // fallback — anything that isn't a logo
      return classified.find(p => !p.isLogo && !exclude.includes(p.url))?.url || null;
    }

    const hp = heroPrefs[industry] || heroPrefs.retail;
    const gp = gallPrefs[industry] || gallPrefs.retail;
    const hero = pickBest(hp);
    const used = hero ? [hero] : [];
    const gallery = [];
    for (let i = 0; i < 4; i++) {
      const pick = pickBest(gp, [...used, ...gallery]);
      if (pick) gallery.push(pick);
    }
    return { hero, gallery };
  } catch {
    return { hero: photoUrls[0] || null, gallery: photoUrls.slice(1, 4) };
  }
}

// ─── CLASSIFY WITH OVERRIDE CHECK ────────────────────────────────────────────
async function classifyPhotosWithOverride(photoUrls, industry, placeId) {
  const override = heroOverrides[placeId];
  if (override) {
    // Use override as hero, classify rest for gallery
    const galleryUrls = photoUrls.filter(u => u !== override);
    const { gallery } = await classifyPhotos(galleryUrls, industry);
    return { hero: override, gallery };
  }
  return classifyPhotos(photoUrls, industry);
}

// ─── FETCH PLACE ─────────────────────────────────────────────────────────────
async function getPlaceDetails(placeId) {
  const fields = ['displayName','formattedAddress','nationalPhoneNumber','regularOpeningHours','rating','userRatingCount','reviews','photos','primaryTypeDisplayName','types','editorialSummary'].join(',');
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${GOOGLE_API_KEY}`);
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);
  return res.json();
}

function getPhotoUrl(photoName, maxWidth = 1400) {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
}

// ─── GENERATE COPY ────────────────────────────────────────────────────────────
async function generateCopy(place, industry) {
  const tones = {
    trades:   'Bold, direct, trustworthy. Blue collar pride. No fluff. Services must be SPECIFIC repair types this shop actually does — pull from reviews.',
    grooming: 'Sharp, confident, personal. The craft matters. Services = specific cuts and treatments this shop offers.',
    wellness: 'Calm, luxurious, restorative. Expert hands. Services = specific nail/spa treatments.',
    pet:      'Warm, loving, trustworthy. These are family members. Services = specific grooming services.',
    retail:   'Curated, personal, discovery-driven. Services = specific product categories this shop carries.',
  };
  const colorDefaults = {
    trades:   { p: '#c94f1a', a: '#d4a017', h: '#e05a1f', theme: 'dark' },
    grooming: { p: '#111118', a: '#c9a84c', h: '#c9a84c', theme: 'dark' },
    wellness: { p: '#7a6548', a: '#c4a882', h: '#9c7a4e', theme: 'light' },
    pet:      { p: '#2d6a4f', a: '#74c69d', h: '#40916c', theme: 'light' },
    retail:   { p: '#6b4c3b', a: '#c4a882', h: '#8b5e3c', theme: 'light' },
  };

  // FIX #2 — retail gets services_sub, FIX #8 — trades gets specific services prompt
  const extraFields = industry === 'retail'
    ? `"services_sub": "One evocative sentence about what makes this shop special — specific to this business",`
    : '';

  const prompt = `Write punchy, specific website copy for this ${industry} business. Tone: ${tones[industry]}

Business: ${place.displayName?.text}
Type: ${place.primaryTypeDisplayName?.text}
Address: ${place.formattedAddress}
Rating: ${place.rating} (${place.userRatingCount} reviews)
Reviews: ${(place.reviews||[]).slice(0,3).map(r=>r.text?.text?.substring(0,200)).join(' | ')}

Return ONLY valid JSON — no markdown, no backticks:
{
  "tagline": "4-6 word tagline. Short and punchy.",
  "hero_headline": "3-5 POWERFUL words. Use \\n after first 2-3 words.",
  "hero_sub": "2 sentences max. Specific to this business. Reference real details from reviews.",
  "services_label": "${industry === 'trades' ? 'What We Fix — or similar specific label' : industry === 'grooming' ? 'The Craft — or similar' : industry === 'wellness' ? 'Our Treatments — or similar' : industry === 'pet' ? 'Our Services — or similar' : 'Our Collections — or specific category label'}",
  ${extraFields}
  "services": ["6 SPECIFIC services/products — pulled from actual reviews and business type, not generic"],
  "service_descs": ["6 short descriptions, 1 sentence each, specific to this business"],
  "cta_heading": "2-3 words",
  "cta_sub": "One warm sentence to visit or call",
  "color_primary": "${colorDefaults[industry]?.p}",
  "color_accent": "${colorDefaults[industry]?.a}",
  "color_highlight": "${colorDefaults[industry]?.h}",
  "theme": "${colorDefaults[industry]?.theme}"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1400, messages: [{ role: 'user', content: prompt }] })
  });
  const data = await res.json();
  const text = data.content[0].text.trim();
  try { return JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Bad JSON'); }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractPlaceData(place) {
  return {
    name: place.displayName?.text || 'Local Business',
    shortName: (place.displayName?.text || 'Business').split(' ').slice(0,3).join(' '),
    phone: place.nationalPhoneNumber || '',
    address: place.formattedAddress || '',
    rating: place.rating || 5.0,
    reviewCount: place.userRatingCount || 0,
    reviews: (place.reviews || []).slice(0, 3),
    hours: place.regularOpeningHours?.weekdayDescriptions || []
  };
}
function cleanPhone(p) { return p.replace(/\D/g, ''); }
function formatHeadline(h, color) {
  return h.split(/\\n|\n/).map((l,i) => i===1 ? `<span style="color:${color};">${l}</span>` : l).join('<br>');
}
function stars(n) { return '★'.repeat(Math.round(n)); }

// ─── BASE HTML ────────────────────────────────────────────────────────────────
function baseHTML(name, theme, body) {
  const isDark = theme === 'dark';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<link rel="icon" type="image/x-icon" href="https://www.gethellosite.com/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:${isDark?'#0a0a0a':'#fafaf8'};color:${isDark?'#f5f2ed':'#1a1a1a'};font-family:'DM Sans',sans-serif;font-weight:300;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .fu{opacity:0;animation:fadeUp .7s ease forwards;}
  .d1{animation-delay:.15s}.d2{animation-delay:.3s}.d3{animation-delay:.45s}.d4{animation-delay:.6s}
  @media(max-width:768px){
    .mob-hide{display:none!important;}
    .mob-stack{grid-template-columns:1fr!important;min-height:auto!important;}
    .mob-pad{padding:3.5rem 1.5rem!important;}
    footer{flex-direction:column!important;gap:.75rem!important;text-align:center!important;padding:1.5rem!important;}
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── SHARED: NAV ─────────────────────────────────────────────────────────────
function navHTML(shortName, copy, theme, links) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(10,10,10,.97)' : 'rgba(252,251,249,.97)';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const h = copy.color_highlight || copy.color_primary;
  const btnColor = isDark ? '#000' : '#fff';
  return `<nav style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:.9rem 2.5rem;background:${bg};backdrop-filter:blur(16px);border-bottom:1px solid ${border};">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:.06em;color:${text};">${shortName}</div>
    <ul style="display:flex;gap:2rem;list-style:none;align-items:center;" class="mob-hide">
      ${links.map((l,i) => i===links.length-1
        ? `<li><a href="#contact" style="background:${h};color:${btnColor};padding:.45rem 1.1rem;border-radius:3px;text-decoration:none;font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${l}</a></li>`
        : `<li><a href="#${l.toLowerCase().replace(/\s/g,'')}" style="color:${muted};text-decoration:none;font-size:.73rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;">${l}</a></li>`
      ).join('')}
    </ul>
  </nav>`;
}

// ─── SHARED: SERVICES — FIX #1 eyebrow static, heading dynamic ───────────────
function servicesHTML(copy, primary, theme, style, industry) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const bg2 = isDark ? '#111' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const isSerif = style === 'serif' || style === 'elegant';
  const titleFont = isSerif ? `'Playfair Display',serif` : `'Bebas Neue',sans-serif`;
  const titleSize = isSerif ? '1.05rem' : '1.1rem';
  const eyebrow = serviceEyebrows[industry] || 'Our Services';

  // FIX #2 — retail gets services_sub shown below heading
  const subLine = (industry === 'retail' && copy.services_sub)
    ? `<p style="font-size:.92rem;color:${muted};line-height:1.7;max-width:540px;margin-top:.6rem;">${copy.services_sub}</p>`
    : '';

  return `<section id="services" style="padding:5rem 4rem;background:${bg};" class="mob-pad">
    <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.6rem;">${eyebrow}</p>
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};">${copy.services_label||eyebrow}</h2>
    ${subLine}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${border};border:1px solid ${border};border-radius:6px;overflow:hidden;margin-top:2.5rem;" class="mob-stack">
      ${copy.services.map((s,i) => `
      <div style="background:${bg};padding:1.75rem 2rem;transition:background .2s;" onmouseover="this.style.background='${bg2}'" onmouseout="this.style.background='${bg}'">
        <div style="width:32px;height:3px;background:${primary};margin-bottom:1rem;border-radius:2px;opacity:.8;"></div>
        <div style="font-family:${titleFont};font-size:${titleSize};letter-spacing:${isSerif?'-.01em':'.03em'};margin-bottom:.5rem;color:${text};line-height:1.2;font-weight:${isSerif?700:400};">${s}</div>
        <div style="font-size:.8rem;color:${muted};line-height:1.68;">${copy.service_descs[i]||''}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

// ─── SHARED: GALLERY — FIX #4 responsive masonry ─────────────────────────────
function galleryHTML(images, name, theme) {
  if (!images?.length) return '';
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const imgs = images.slice(0,3);
  return `<div style="background:${bg};">
    <div style="display:grid;grid-template-columns:repeat(${imgs.length},1fr);gap:4px;">
      ${imgs.map(url=>`<div style="aspect-ratio:4/3;overflow:hidden;"><img src="${url}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}
    </div>
  </div>`;
}

// ─── SHARED: REVIEWS ─────────────────────────────────────────────────────────
function reviewsHTML(reviews, rating, reviewCount, primary, theme) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#111' : '#f0ede8';
  const bg2 = isDark ? '#0a0a0a' : '#fafaf8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';

  return `<section id="reviews" style="background:${bg};padding:5rem 4rem;" class="mob-pad">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3rem;flex-wrap:wrap;gap:1.5rem;">
      <div>
        <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.5rem;">What People Say</p>
        <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};">Google Reviews</h2>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;background:${bg2};border:1px solid ${border};padding:.8rem 1.5rem;border-radius:4px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:3rem;color:${primary};line-height:1;">${rating}</div>
        <div>
          <div style="color:#f59e0b;font-size:1rem;">${stars(rating)}</div>
          <div style="font-size:.7rem;color:${muted};margin-top:.2rem;font-family:'DM Mono',monospace;">${reviewCount} Google reviews</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;" class="mob-stack">
      ${reviews.map(r => {
        const txt = (r.text?.text||'').substring(0,180);
        return `<div style="background:${bg2};border:1px solid ${border};padding:1.5rem;border-radius:4px;">
          <div style="color:#f59e0b;font-size:.8rem;margin-bottom:.7rem;">★★★★★</div>
          <p style="font-size:.82rem;color:${muted};line-height:1.7;margin-bottom:1rem;font-style:italic;">"${txt}${(r.text?.text||'').length>180?'…':''}"</p>
          <p style="font-size:.65rem;color:${muted};letter-spacing:.08em;text-transform:uppercase;font-family:'DM Mono',monospace;opacity:.6;">— ${r.authorAttribution?.displayName||'Google Review'}</p>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

// ─── SHARED: CONTACT ─────────────────────────────────────────────────────────
function contactHTML(copy, place, primary, highlight, theme) {
  const { phone, address, hours } = extractPlaceData(place);
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const bg2 = isDark ? '#141414' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';

  return `<section id="contact" style="padding:5rem 4rem;background:${bg};" class="mob-pad">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start;" class="mob-stack">
    <div>
      <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.5rem;">Come See Us</p>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};margin-bottom:.85rem;">${copy.cta_heading||'Get In Touch'}</h2>
      <p style="font-size:.88rem;color:${muted};line-height:1.78;max-width:360px;margin-bottom:2rem;">${copy.cta_sub||''}</p>
      ${hours.length ? `<div style="margin-top:1rem;">${hours.map(h => {
        const [day,...rest] = h.split(': ');
        const time = rest.join(': ');
        const closed = !time||time.toLowerCase().includes('closed');
        return `<div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid ${border};">
          <span style="font-size:.75rem;color:${muted};">${day}</span>
          <span style="font-family:'DM Mono',monospace;font-size:.72rem;color:${closed?(isDark?'#333':'#ccc'):text};">${time||'Closed'}</span>
        </div>`;
      }).join('')}</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:.75rem;">
      ${phone?`<a href="tel:${cleanPhone(phone)}" style="display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:${bg2};border:1px solid ${border};border-radius:4px;text-decoration:none;color:${text};">
        <span style="font-size:1.1rem;">📞</span>
        <div><div style="font-size:.6rem;color:${muted};letter-spacing:.12em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.15rem;">Phone</div><div style="font-size:.92rem;font-weight:500;">${phone}</div></div>
      </a>`:''}
      <div style="display:flex;align-items:flex-start;gap:1rem;padding:1rem 1.25rem;background:${bg2};border:1px solid ${border};border-radius:4px;">
        <span style="font-size:1.1rem;margin-top:.1rem;">📍</span>
        <div><div style="font-size:.6rem;color:${muted};letter-spacing:.12em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.15rem;">Address</div><div style="font-size:.85rem;line-height:1.5;">${address}</div></div>
      </div>
      <a href="https://maps.google.com/?q=${encodeURIComponent(address)}" target="_blank" style="display:block;text-align:center;padding:.85rem;background:${highlight};color:${isDark?'#000':'#fff'};text-decoration:none;font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:4px;margin-top:.25rem;">Get Directions →</a>
    </div>
    </div>
  </section>`;
}

// ─── SHARED: FOOTER — FIX #10 social icons ───────────────────────────────────
function footerHTML(shortName, address, phone, theme, primary) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#060606' : '#eceae5';
  const text = isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.2)';
  const iconColor = isDark ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)';
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

  const socialIcons = `
    <div style="display:flex;align-items:center;gap:.85rem;">
      <a href="${mapsUrl}" target="_blank" title="Google Maps" style="color:${iconColor};transition:color .2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${iconColor}'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </a>
      <a href="https://www.instagram.com/" target="_blank" title="Instagram — add your handle during setup" style="color:${iconColor};transition:color .2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${iconColor}'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      </a>
      <a href="https://www.facebook.com/" target="_blank" title="Facebook — add your page during setup" style="color:${iconColor};transition:color .2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${iconColor}'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <a href="https://www.yelp.com/search?find_desc=${encodeURIComponent(shortName)}" target="_blank" title="Yelp" style="color:${iconColor};transition:color .2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${iconColor}'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.16 12.73l-3.948 1.12c-.96.272-1.76-.8-1.2-1.624l2.376-3.496c.496-.73 1.568-.482 1.72.384l.544 3.08c.064.36-.144.464-.144.464s.016-.016-.352-.048l.004.12zm-9.024-7.176l.8 4.024c.192.984-.992 1.6-1.712.896L6.8 7.144c-.624-.624-.28-1.664.584-1.816l3.28-.568c.48-.08.48.8.472.794zm-5.624 9.664l3.752-1.56c.912-.38 1.808.576 1.36 1.456l-1.864 3.68c-.392.768-1.464.704-1.76-.104l-1.128-3.264c-.048-.136.096-.272.096-.272s-.12.08-.456.064zm11.128 4.08l-2.944-2.512c-.72-.616-.312-1.776.608-1.808l4.072-.144c.832-.028 1.264.936.76 1.568l-1.712 2.128c-.128.16-.224.192-.224.192s.096-.112-.192-.464l-.368.04zm-5.432.776l.192-4.144c.048-.992 1.296-1.36 1.872-.576l2.488 3.312c.52.696.064 1.664-.784 1.744l-3.296.32c-.128.016-.256-.016-.256-.016s.128.016-.216-.64z"/></svg>
      </a>
    </div>`;

  return `<footer style="background:${bg};padding:1.5rem 4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.06em;color:${text};">${shortName}</div>
    ${socialIcons}
    <div style="font-size:.6rem;color:${isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.12)'};font-family:'DM Mono',monospace;">A HelloSite · GetHelloSite.com</div>
  </footer>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY LAYOUT A — FULL BLEED (kept for ?layout=fullbleed override)
// ═══════════════════════════════════════════════════════════════════════════
function layoutFullBleed(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#c94f1a';
  const a = copy.color_accent || '#d4a017';
  const h = copy.color_highlight || p;
  const theme = copy.theme || 'dark';

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, ['Services','Gallery','Reviews','Call Us'])}
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      ${photos.hero?`<div style="position:absolute;inset:0;background:url('${photos.hero}') center/cover no-repeat;"></div>`:''}
      <div style="position:absolute;inset:0;background:linear-gradient(105deg,rgba(5,5,5,.97) 42%,rgba(5,5,5,.5) 75%,rgba(5,5,5,.2) 100%);"></div>
      <div style="position:relative;z-index:2;padding:9rem 5rem 6rem;max-width:720px;" class="mob-pad fu">
        <div style="display:inline-flex;align-items:center;gap:.5rem;border:1px solid ${p};color:${p};font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.15em;padding:.35rem .9rem;border-radius:2px;margin-bottom:1.5rem;">
          <span style="width:5px;height:5px;background:${p};border-radius:50%;animation:pulse 2s infinite;"></span>${copy.tagline}
        </div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(4.5rem,9vw,8rem);line-height:.9;letter-spacing:.01em;margin-bottom:1.5rem;color:#f5f2ed;" class="fu d1">${formatHeadline(copy.hero_headline, p)}</h1>
        <p style="font-size:1.05rem;color:rgba(255,255,255,.55);line-height:1.78;max-width:500px;margin-bottom:2.5rem;" class="fu d2">${copy.hero_sub}</p>
        <div style="display:flex;gap:.85rem;flex-wrap:wrap;" class="fu d3">
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="background:${h};color:#fff;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">📞 ${phone}</a>`:''}
          <a href="#services" style="border:1px solid rgba(255,255,255,.2);color:#f5f2ed;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Our Services</a>
        </div>
        <div style="display:flex;gap:3rem;margin-top:3.5rem;padding-top:2.5rem;border-top:1px solid rgba(255,255,255,.07);" class="fu d4">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.62rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.62rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:${a};line-height:1;">LA</div><div style="font-size:.62rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
    </section>
    ${servicesHTML(copy, p, theme, 'numbered', industry)}
    ${galleryHTML(photos.gallery, name, theme)}
    ${reviewsHTML(reviews, rating, reviewCount, p, theme)}
    ${contactHTML(copy, place, p, h, theme)}
    ${footerHTML(shortName, address, phone, theme, p)}
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY LAYOUT B — SPLIT PANEL (kept for ?layout=split override)
// ═══════════════════════════════════════════════════════════════════════════
function layoutSplit(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#111118';
  const a = copy.color_accent || '#c9a84c';
  const h = copy.color_highlight || a;
  const theme = copy.theme || 'dark';
  const isDark = theme === 'dark';
  const panelBg = isDark ? '#08080f' : '#fafaf8';
  const mutedColor = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const textColor = isDark ? '#f5f2ed' : '#1a1a1a';
  const serviceStyle = industry === 'retail' ? 'line' : 'clean';

  const ctaLabel = industry === 'retail' ? `Call Us — ${phone}` :
                   industry === 'pet' ? `Book a Groom — ${phone}` :
                   `Book — ${phone}`;

  const city = address.split(',')[1]?.trim().split(' ')[0] || 'Local';

  const navLinks = industry === 'retail'
    ? ['Shop','Gallery','Reviews','Call Us']
    : ['Services','Gallery','Reviews', industry === 'pet' ? 'Book' : 'Book'];

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, navLinks)}
    <section style="height:100vh;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;" class="mob-stack">
      <div style="display:flex;flex-direction:column;justify-content:center;padding:9rem 4rem 5rem 5rem;background:${panelBg};position:relative;z-index:2;overflow-y:auto;" class="mob-pad">
        <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${a};margin-bottom:1.25rem;" class="fu">${copy.tagline}</p>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(3.5rem,6vw,6.5rem);line-height:.88;letter-spacing:.02em;margin-bottom:1.5rem;color:${textColor};" class="fu d1">${formatHeadline(copy.hero_headline, a)}</h1>
        <p style="font-size:1rem;color:${mutedColor};line-height:1.8;max-width:400px;margin-bottom:2.5rem;" class="fu d2">${copy.hero_sub}</p>
        <div style="display:flex;gap:.85rem;flex-wrap:wrap;" class="fu d3">
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="background:${a};color:${isDark?'#000':'#fff'};padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">${ctaLabel}</a>`:''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,auto);gap:2.5rem;margin-top:3.5rem;padding-top:2.5rem;border-top:1px solid ${isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'};" class="fu d4">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">${city}</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
      <div style="position:relative;overflow:hidden;" class="mob-hide">
        ${photos.hero
          ? `<img src="${photos.hero}" alt="${name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;display:block;"/><div style="position:absolute;inset:0;background:linear-gradient(to right,${isDark?'rgba(8,8,15,.65)':'rgba(250,250,248,.3)'} 0%,transparent 30%);"></div>`
          : `<div style="position:absolute;inset:0;background:${isDark?'#111':'#eee'};"></div>`
        }
      </div>
    </section>
    ${servicesHTML(copy, a, theme, serviceStyle, industry)}
    ${galleryHTML(photos.gallery, name, theme)}
    ${reviewsHTML(reviews, rating, reviewCount, a, theme)}
    ${contactHTML(copy, place, a, h, theme)}
    ${footerHTML(shortName, address, phone, theme, a)}
    <div style="position:fixed;bottom:20px;right:20px;z-index:9999;background:${a};color:${isDark?'#000':'#fff'};padding:13px 22px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:.03em;box-shadow:0 8px 28px ${a}44;font-family:system-ui,sans-serif;line-height:1.4;text-align:center;max-width:220px;">✦ Reply to the email<br><span style="font-size:11px;opacity:.85;font-weight:400;">to claim this site</span></div>
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY LAYOUT C — WELLNESS (kept for ?layout=legacy_wellness override)
// ═══════════════════════════════════════════════════════════════════════════
function layoutWellness(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#7a6548';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || p;
  const theme = 'light';

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, ['Services','Gallery','Reviews','Book'])}

    <!-- WELLNESS HERO — full bleed, text overlaid at bottom -->
    <section style="min-height:100vh;position:relative;display:flex;align-items:flex-end;overflow:hidden;">
      ${photos.hero
        ? `<div style="position:absolute;inset:0;background:url('${photos.hero}') center/cover no-repeat;"></div>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,${p},${a});"></div>`
      }
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(10,8,6,.92) 0%,rgba(10,8,6,.6) 35%,rgba(10,8,6,.1) 65%,transparent 100%);"></div>

      <div style="position:absolute;top:5rem;right:2.5rem;background:rgba(255,255,255,.95);padding:.6rem 1.1rem;border-radius:100px;display:flex;align-items:center;gap:.5rem;z-index:2;">
        <span style="color:#f59e0b;font-size:.9rem;">${stars(rating)}</span>
        <span style="font-size:.78rem;font-weight:600;color:#1a1a1a;">${rating} · ${reviewCount} reviews</span>
      </div>

      <div style="position:relative;z-index:2;padding:0 5rem 5rem;width:100%;max-width:800px;" class="mob-pad fu">
        <div style="display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.85);font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.15em;padding:.38rem 1rem;border-radius:100px;margin-bottom:1.25rem;">${copy.tagline}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(3.5rem,7vw,6rem);font-weight:700;line-height:1.0;letter-spacing:-.02em;color:#fff;margin-bottom:1.25rem;" class="fu d1">${copy.hero_headline.replace(/\\n|\n/g,'<br>')}</h1>
        <p style="font-size:1.05rem;color:rgba(255,255,255,.65);line-height:1.75;max-width:500px;margin-bottom:2rem;" class="fu d2">${copy.hero_sub}</p>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;" class="fu d3">
          <a href="#contact" style="background:${p};color:#fff;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Book Appointment</a>
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="border:1px solid rgba(255,255,255,.3);color:#fff;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">${phone}</a>`:''}
        </div>
      </div>
    </section>

    ${servicesHTML(copy, p, theme, 'elegant', industry)}
    ${galleryHTML(photos.gallery, name, theme)}
    ${reviewsHTML(reviews, rating, reviewCount, p, theme)}
    ${contactHTML(copy, place, p, h, theme)}
    ${footerHTML(shortName, address, phone, theme, p)}
  `);
}

// ─── RENDERER DISPATCH ───────────────────────────────────────────────────────
function renderDemo(place, copy, photos, industry, layoutOverride) {
  const layout = layoutOverride || defaultLayouts[industry] || 'fullbleed';
  switch(layout) {
    // ── NEW TEMPLATES ──
    case 'trades':          return templateTrades(place, copy, photos, industry);
    case 'grooming':
      copy.color_primary = '#2C2C2C'; copy.color_accent = '#2C2C2C'; copy.color_highlight = '#555555'; copy.theme = 'light';
      return layoutSplit(place, copy, photos, industry);
    case 'wellness':        return templateWellness(place, copy, photos, industry);
    case 'pet':
      copy.color_primary = '#2B5FC7'; copy.color_accent = '#2B5FC7'; copy.color_highlight = '#3B6FD7'; copy.theme = 'light';
      return layoutSplit(place, copy, photos, industry);
    case 'retail':
      copy.color_primary = '#9B3054'; copy.color_accent = '#9B3054'; copy.color_highlight = '#B03060'; copy.theme = 'light';
      return layoutSplit(place, copy, photos, industry);
    case 'realestate':      return templateRealEstate(place, copy, photos, industry);
    // ── CLIENT-FACING ALIASES (used in Tally form layout picker) ──
    case 'bold':            return layoutFullBleed(place, copy, photos, industry);
    case 'clean':           return layoutSplit(place, copy, photos, industry);
    // ── LEGACY (still accessible via ?layout=) ──
    case 'split':           return layoutSplit(place, copy, photos, industry);
    case 'fullbleed':       return layoutFullBleed(place, copy, photos, industry);
    case 'legacy_wellness': return layoutWellness(place, copy, photos, industry);
    case 'editorial':       return layoutWellness(place, copy, photos, industry);
    default:                return layoutFullBleed(place, copy, photos, industry);
  }
}

// ─── MAIN ROUTE ──────────────────────────────────────────────────────────────
app.get('/demo', async (req, res) => {
  const { place_id, refresh, layout } = req.query;
  if (!place_id) return res.status(400).send('Missing place_id');

  const cacheKey = `${place_id}:${layout||'default'}`;

  if (demoCache.has(cacheKey) && refresh !== 'true') {
    console.log(`⚡ Cache hit: ${cacheKey}`);
    res.setHeader('Content-Type', 'text/html');
    return res.send(demoCache.get(cacheKey));
  }

  try {
    console.log(`\n━━━ ${place_id}`);
    const place = await getPlaceDetails(place_id);
    const industry = detectIndustry(place);
    console.log(`✓ ${place.displayName?.text} → ${industry}`);

    if (industry === 'unsupported') {
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HelloSite</title></head><body style="font-family:sans-serif;background:#FFF7E8;color:#17324D;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;"><div><h1 style="font-size:1.75rem;margin-bottom:.75rem;">Coming Soon</h1><p style="opacity:.6;max-width:360px;margin:0 auto 1.5rem;line-height:1.7;">We currently support trades, grooming, wellness, pet care, and retail.</p><a href="https://gethellosite.com" style="background:#17324D;color:#fff;padding:.75rem 1.5rem;border-radius:100px;text-decoration:none;font-weight:600;">Learn More</a></div></body></html>`);
    }

    const allPhotoUrls = (place.photos||[]).slice(0,8).map(p=>getPhotoUrl(p.name,1400));
    const [photos, copy] = await Promise.all([
      classifyPhotosWithOverride(allPhotoUrls, industry, place_id),
      generateCopy(place, industry)
    ]);

    const html = renderDemo(place, copy, photos, industry, layout);
    demoCache.set(cacheKey, html);
    console.log(`✓ Done — ${industry} / ${layout||defaultLayouts[industry]}`);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send(`<pre style="padding:2rem;font-family:monospace;">Error: ${err.message}\n\n${err.stack}</pre>`);
  }
});

app.get('/cache', (req, res) => {
  const keys = [...demoCache.keys()];
  res.send(`<style>body{font-family:monospace;padding:2rem;background:#0a0a0a;color:#f5f2ed;}a{color:#4EA7FF;}</style>
    <h2>Cache — ${keys.length} demos</h2>
    <ul style="line-height:2.2;margin-top:1rem;">${keys.map(k=>{
      const [pid,lay]=k.split(':');
      return `<li>${k} <a href="/demo?place_id=${pid}&layout=${lay==='default'?'':lay}">[view]</a> <a href="/demo?place_id=${pid}&layout=${lay==='default'?'':lay}&refresh=true">[↺ refresh]</a></li>`;
    }).join('')}</ul>`);
});

app.get('/', (req, res) => {
  res.send(`<style>body{font-family:monospace;padding:2rem;background:#0a0a0a;color:#f5f2ed;}a{color:#c94f1a;}code{background:#111;padding:.2rem .4rem;border-radius:2px;}h3{color:#555;margin:1.5rem 0 .5rem;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;}</style>
    <h2>⬡ HelloSite Demo Engine v5</h2>
    <p style="color:#444;margin:.5rem 0 1.5rem;">6 templates · smart photo selection · cached · <a href="/cache" style="color:#4EA7FF;">${demoCache.size} cached</a></p>
    <p><strong>Usage:</strong> <code>/demo?place_id=ID</code> — add <code>&layout=split|fullbleed|legacy_wellness</code> to use old layouts · <code>&refresh=true</code> to bust cache</p>
    <h3>Trades</h3>
    <ul style="line-height:2.2;color:#666;"><li><a href="/demo?place_id=ChIJj-aliA_PwoARI36KBu4KTcQ">TNT Auto Repair</a> — trades</li></ul>
    <h3>Grooming</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJz6ca4qC5woARRewY64ReE94">Bushwick Barbershop</a> — grooming</li>
    </ul>
    <h3>Wellness</h3>
    <ul style="line-height:2.2;color:#666;"><li><a href="/demo?place_id=ChIJuZ--3qnHwoARRyWOYPuvQVk">Làmay Nail Spa</a> — wellness</li></ul>
    <h3>Pet</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJF6NXG_jHwoARVsJdvFTe1tA">21Pooch</a> — pet</li>
    </ul>
    <h3>Retail</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJ9cAF4wyTwoAR_Jdg-iCVg-A">Adobe Design</a> — retail</li>
    </ul>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HelloSite Demo Engine v5 on port ${PORT}`));
