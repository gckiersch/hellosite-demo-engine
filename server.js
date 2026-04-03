const express = require('express');
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
const demoCache = new Map();

// ─── INDUSTRY + LAYOUT ROUTING ───────────────────────────────────────────────
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

// Layout assigned by industry — can be overridden with ?layout= param
const defaultLayouts = {
  trades:   'fullbleed',   // Dark, dramatic, full photo behind text
  grooming: 'split',       // Bold split panel — photo right, text left
  wellness: 'editorial',   // Luxury editorial — photo top, text below
  pet:      'split',       // Bold split — confident, not soft
  retail:   'split',       // Magazine split — text left, product right
};

// ─── PHOTO CLASSIFICATION ────────────────────────────────────────────────────
async function classifyPhotos(photoUrls, industry) {
  if (!photoUrls.length) return { hero: null, gallery: [] };
  const toClassify = photoUrls.slice(0, 8);

  // Hero photo preferences — avoid exterior with signage for hero
  const heroPrefs = {
    trades:   ['interior', 'people', 'detail', 'exterior'],
    grooming: ['people', 'interior', 'detail', 'exterior'],
    wellness: ['interior', 'people', 'detail', 'exterior'],
    pet:      ['people', 'interior', 'detail', 'exterior'],
    retail:   ['interior', 'product', 'people', 'exterior'],
  };
  const gallPrefs = {
    trades:   ['exterior', 'detail', 'people', 'interior'],
    grooming: ['people', 'detail', 'interior', 'exterior'],
    wellness: ['detail', 'interior', 'people', 'product'],
    pet:      ['people', 'detail', 'exterior', 'interior'],
    retail:   ['product', 'interior', 'detail', 'people'],
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 300,
        messages: [{ role: 'user', content: `Classify each photo for a ${industry} business website hero selection. Be strict — only mark as "people" if humans are clearly visible, "interior" if inside the business, "exterior" if outside/storefront/signage, "product" if showing items for sale, "detail" for close-up work/craftsmanship, "other" for anything else. Exterior photos with large signage or text should be marked "exterior". Return ONLY a JSON array in order:\n\n${toClassify.map((u,i)=>`${i+1}. ${u}`).join('\n')}` }]
      })
    });
    const data = await res.json();
    const classifications = JSON.parse(data.content[0].text.trim());
    const classified = toClassify.map((url, i) => ({ url, type: classifications[i] || 'other' }));

    function pickBest(prefs, exclude = []) {
      for (const pref of prefs) {
        const match = classified.find(p => p.type === pref && !exclude.includes(p.url));
        if (match) return match.url;
      }
      return classified.find(p => !exclude.includes(p.url))?.url || null;
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

// ─── FETCH PLACE DETAILS ─────────────────────────────────────────────────────
async function getPlaceDetails(placeId) {
  const fields = ['displayName','formattedAddress','nationalPhoneNumber','regularOpeningHours','rating','userRatingCount','reviews','photos','primaryTypeDisplayName','types','editorialSummary','websiteUri'].join(',');
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
    trades:   'Bold, direct, trustworthy. Blue collar pride. No fluff. Services = specific repair types.',
    grooming: 'Sharp, confident, personal. The craft matters. Services = specific cuts and treatments.',
    wellness: 'Calm, luxurious, restorative. Expert hands. Services = specific treatments.',
    pet:      'Warm, loving, trustworthy. These are family members. Services = specific grooming services.',
    retail:   'Curated, personal, discovery-driven. Services = product categories.',
  };
  const colorDefaults = {
    trades:   { p: '#c94f1a', a: '#d4a017', h: '#e05a1f', theme: 'dark' },
    grooming: { p: '#111118', a: '#c9a84c', h: '#c9a84c', theme: 'dark' },
    wellness: { p: '#7a6548', a: '#c4a882', h: '#9c7a4e', theme: 'light' },
    pet:      { p: '#2d6a4f', a: '#74c69d', h: '#40916c', theme: 'light' },
    retail:   { p: '#6b4c3b', a: '#c4a882', h: '#8b5e3c', theme: 'light' },
  };

  const prompt = `Write punchy, specific website copy for this ${industry} business. Tone: ${tones[industry]}

Business: ${place.displayName?.text}
Type: ${place.primaryTypeDisplayName?.text}
Address: ${place.formattedAddress}
Rating: ${place.rating} (${place.userRatingCount} reviews)
Reviews: ${(place.reviews||[]).slice(0,3).map(r=>r.text?.text?.substring(0,180)).join(' | ')}

Return ONLY valid JSON — no markdown, no backticks:
{
  "tagline": "4-6 word tagline. Short and punchy.",
  "hero_headline": "3-5 POWERFUL words. Use \\n after first 2-3 words.",
  "hero_sub": "2 sentences max. Specific to this business. Reference real details.",
  "services_label": "e.g. Our Services / What We Do / Our Treatments",
  "services": ["6 specific services this business offers"],
  "service_descs": ["6 short descriptions, 1 sentence each"],
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
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
  });
  const data = await res.json();
  const text = data.content[0].text.trim();
  try { return JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Bad JSON from Claude'); }
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
    .mob-full{grid-column:1/-1!important;}
    footer{flex-direction:column!important;gap:.75rem!important;text-align:center!important;padding:1.5rem!important;}
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function navHTML(shortName, copy, theme, links) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(10,10,10,.97)' : 'rgba(252,251,249,.97)';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const h = copy.color_highlight || copy.color_primary;
  return `<nav style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:.9rem 2.5rem;background:${bg};backdrop-filter:blur(16px);border-bottom:1px solid ${border};">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:.06em;color:${text};">${shortName}</div>
    <ul style="display:flex;gap:2rem;list-style:none;align-items:center;" class="mob-hide">
      ${links.map((l,i) => i===links.length-1
        ? `<li><a href="#contact" style="background:${h};color:${isDark?'#000':'#fff'};padding:.45rem 1.1rem;border-radius:3px;text-decoration:none;font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${l}</a></li>`
        : `<li><a href="#${l.toLowerCase().replace(/\s/g,'')}" style="color:${muted};text-decoration:none;font-size:.73rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;">${l}</a></li>`
      ).join('')}
    </ul>
  </nav>`;
}

function servicesHTML(copy, primary, theme, style) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const bg2 = isDark ? '#111' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const isSerif = style === 'serif' || style === 'elegant';
  const titleFont = isSerif ? `'Playfair Display',serif` : `'Bebas Neue',sans-serif`;
  const titleSize = isSerif ? '1.05rem' : '1.1rem';

  return `<section id="services" style="padding:5rem 4rem;background:${bg};" class="mob-pad">
    <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.6rem;">${copy.services_label||'Our Services'}</p>
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};margin-bottom:2.5rem;">${copy.services_label||'What We Do'}</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${border};border:1px solid ${border};border-radius:6px;overflow:hidden;" class="mob-stack">
      ${copy.services.map((s,i) => `
      <div style="background:${bg};padding:1.75rem 2rem;transition:background .2s;position:relative;" onmouseover="this.style.background='${bg2}'" onmouseout="this.style.background='${bg}'">
        <div style="width:28px;height:2px;background:${primary};margin-bottom:1rem;border-radius:2px;opacity:.7;"></div>
        <div style="font-family:${titleFont};font-size:${titleSize};letter-spacing:${isSerif?'-.01em':'.03em'};margin-bottom:.5rem;color:${text};line-height:1.2;font-weight:${isSerif?700:400};">${s}</div>
        <div style="font-size:.8rem;color:${muted};line-height:1.68;">${copy.service_descs[i]||''}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

function galleryHTML(images, name, theme) {
  if (!images?.length) return '';
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const imgs = images.slice(0,4);
  // Use masonry-style grid for 4 images
  if (imgs.length >= 4) {
    return `<div style="padding:0 4rem 5rem;background:${bg};display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:240px 240px;gap:6px;" class="mob-pad">
      <div style="grid-row:1/3;overflow:hidden;border-radius:4px;"><img src="${imgs[0]}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"/></div>
      ${imgs.slice(1).map(url=>`<div style="overflow:hidden;border-radius:4px;"><img src="${url}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}
    </div>`;
  }
  return `<div style="padding:0 4rem 5rem;background:${bg};display:grid;grid-template-columns:repeat(${imgs.length},1fr);gap:6px;">
    ${imgs.map(url=>`<div style="aspect-ratio:4/3;overflow:hidden;border-radius:4px;"><img src="${url}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}
  </div>`;
}

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
          <div style="color:#f59e0b;font-size:1rem;letter-spacing:.05em;">${stars(rating)}</div>
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

function contactHTML(copy, place, primary, highlight, theme) {
  const { phone, address, hours } = extractPlaceData(place);
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const bg2 = isDark ? '#141414' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';

  return `<section id="contact" style="padding:5rem 4rem;background:${bg};display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start;" class="mob-stack mob-pad">
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
  </section>`;
}

function footerHTML(shortName, address, phone, theme, primary) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#060606' : '#eceae5';
  const text = isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.2)';
  return `<footer style="background:${bg};padding:1.5rem 4rem;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.06em;color:${text};">${shortName}</div>
    <div style="font-size:.65rem;color:${text};font-family:'DM Mono',monospace;">${phone||''}</div>
    <div style="font-size:.6rem;color:${isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.12)'};font-family:'DM Mono',monospace;">A HelloSite · GetHelloSite.com</div>
  </footer>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT A — FULL BLEED
// Dark photo behind text with strong overlay. Best for Trades.
// ═══════════════════════════════════════════════════════════════════════════
function layoutFullBleed(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#c94f1a';
  const a = copy.color_accent || '#d4a017';
  const h = copy.color_highlight || p;
  const theme = copy.theme || 'dark';
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f5f2ed' : '#1a1a1a';

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, ['Services','Gallery','Reviews','Call Us'])}

    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      ${photos.hero ? `<div style="position:absolute;inset:0;background:url('${photos.hero}') center/cover no-repeat;"></div>` : ''}
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

    ${servicesHTML(copy, p, theme, 'numbered')}
    ${galleryHTML(photos.gallery, name, theme)}
    ${reviewsHTML(reviews, rating, reviewCount, p, theme)}
    ${contactHTML(copy, place, p, h, theme)}
    ${footerHTML(shortName, address, phone, theme, p)}
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT B — SPLIT PANEL
// Bold 50/50 split — text left, photo right. Best for Grooming, Retail.
// ═══════════════════════════════════════════════════════════════════════════
function layoutSplit(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#111118';
  const a = copy.color_accent || '#c9a84c';
  const h = copy.color_highlight || a;
  const theme = copy.theme || 'dark';
  const isDark = theme === 'dark';
  const panelBg = isDark ? '#08080f' : '#fafaf8';
  const textColor = isDark ? '#f5f2ed' : '#1a1a1a';
  const mutedColor = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  const serviceStyle = industry === 'retail' ? 'line' : 'clean';

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, ['Services','Gallery','Reviews','Book'])}

    <section style="min-height:100vh;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;" class="mob-stack">
      <div style="display:flex;flex-direction:column;justify-content:center;padding:9rem 4rem 5rem 5rem;background:${panelBg};position:relative;z-index:2;" class="mob-pad">
        <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${a};margin-bottom:1.25rem;" class="fu">${copy.tagline}</p>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(3.5rem,6vw,6.5rem);line-height:.88;letter-spacing:.02em;margin-bottom:1.5rem;color:${textColor};" class="fu d1">${formatHeadline(copy.hero_headline, a)}</h1>
        <p style="font-size:1rem;color:${mutedColor};line-height:1.8;max-width:400px;margin-bottom:2.5rem;" class="fu d2">${copy.hero_sub}</p>
        <div style="display:flex;gap:.85rem;flex-wrap:wrap;" class="fu d3">
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="background:${a};color:${isDark?'#000':'#fff'};padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Book — ${phone}</a>`:''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,auto);gap:2.5rem;margin-top:3.5rem;padding-top:2.5rem;border-top:1px solid ${isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'};" class="fu d4">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.25rem;color:${a};line-height:1;">LA</div><div style="font-size:.6rem;color:${mutedColor};letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
      <div style="position:relative;overflow:hidden;min-height:500px;" class="mob-hide">
        ${photos.hero?`<img src="${photos.hero}" alt="${name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;"/>`:'<div style="position:absolute;inset:0;background:#111;"></div>'}
        <div style="position:absolute;inset:0;background:linear-gradient(to right,${isDark?'rgba(8,8,15,.7)':'rgba(250,250,248,.4)'} 0%,transparent 35%);"></div>
      </div>
    </section>

    ${servicesHTML(copy, a, theme, serviceStyle)}
    ${galleryHTML(photos.gallery, name, theme)}
    ${reviewsHTML(reviews, rating, reviewCount, a, theme)}
    ${contactHTML(copy, place, a, h, theme)}
    ${footerHTML(shortName, address, phone, theme, a)}
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT C — EDITORIAL STACK
// Large contained photo up top, elegant text below. Best for Wellness, Pet.
// ═══════════════════════════════════════════════════════════════════════════
function layoutEditorial(place, copy, photos, industry) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#7a6548';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || p;
  const theme = copy.theme || 'light';
  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0a' : '#fafaf8';
  const textColor = isDark ? '#f5f2ed' : '#1a1a1a';
  const mutedColor = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const isPet = industry === 'pet';
  const headlineFont = isPet ? `'Playfair Display',Georgia,serif` : `'Playfair Display',Georgia,serif`;

  return baseHTML(name, theme, `
    ${navHTML(shortName, copy, theme, ['Services','Gallery','Reviews','Book'])}

    <!-- EDITORIAL HERO — photo top, text below -->
    <section style="padding-top:5rem;background:${bg};">

      <!-- Photo block — contained, prominent -->
      <div style="margin:0 2.5rem;border-radius:16px;overflow:hidden;height:65vh;position:relative;" class="mob-pad">
        ${photos.hero
          ? `<img src="${photos.hero}" alt="${name}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;"/>`
          : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${p},${a});"></div>`
        }
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 50%);"></div>
        <!-- Floating tagline over photo -->
        <div style="position:absolute;bottom:2rem;left:2.5rem;">
          <div style="display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);color:#fff;font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.15em;padding:.4rem 1rem;border-radius:100px;">${copy.tagline}</div>
        </div>
        <!-- Rating badge -->
        <div style="position:absolute;top:1.5rem;right:1.5rem;background:rgba(255,255,255,.95);padding:.6rem 1rem;border-radius:100px;display:flex;align-items:center;gap:.5rem;">
          <span style="color:#f59e0b;font-size:.85rem;">${stars(rating)}</span>
          <span style="font-size:.75rem;font-weight:600;color:#1a1a1a;">${rating} · ${reviewCount} reviews</span>
        </div>
      </div>

      <!-- Text block below photo -->
      <div style="padding:3.5rem 5rem 5rem;max-width:800px;" class="mob-pad fu">
        <h1 style="font-family:${headlineFont};font-size:clamp(3rem,6vw,5.5rem);font-weight:700;line-height:1.02;letter-spacing:-.02em;margin-bottom:1.5rem;color:${textColor};" class="fu d1">${copy.hero_headline.replace(/\\n|\n/g,' ')}</h1>
        <p style="font-size:1.05rem;color:${mutedColor};line-height:1.8;max-width:520px;margin-bottom:2.25rem;" class="fu d2">${copy.hero_sub}</p>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;" class="fu d3">
          <a href="#contact" style="background:${p};color:#fff;padding:.88rem 2rem;text-decoration:none;font-size:.82rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:${isPet?'100px':'3px'};">Book Appointment</a>
          ${phone?`<span style="font-size:.88rem;color:${mutedColor};">${phone}</span>`:''}
        </div>
      </div>
    </section>

    ${servicesHTML(copy, p, theme, isPet ? 'dot' : 'elegant')}
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
    case 'split':     return layoutSplit(place, copy, photos, industry);
    case 'editorial': return layoutEditorial(place, copy, photos, industry);
    default:          return layoutFullBleed(place, copy, photos, industry);
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
    console.log(`\n━━━ ${place_id} [layout:${layout||'auto'}]`);
    const place = await getPlaceDetails(place_id);
    const industry = detectIndustry(place);
    console.log(`✓ ${place.displayName?.text} → ${industry}`);

    if (industry === 'unsupported') {
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HelloSite</title></head><body style="font-family:sans-serif;background:#FFF7E8;color:#17324D;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;"><div><h1 style="font-size:1.75rem;margin-bottom:.75rem;">Coming Soon</h1><p style="opacity:.6;max-width:360px;margin:0 auto 1.5rem;line-height:1.7;">We're working on templates for this business type. We currently support trades, grooming, wellness, pet care, and retail.</p><a href="https://gethellosite.com" style="background:#17324D;color:#fff;padding:.75rem 1.5rem;border-radius:100px;text-decoration:none;font-weight:600;">Learn More</a></div></body></html>`);
    }

    const allPhotoUrls = (place.photos||[]).slice(0,8).map(p=>getPhotoUrl(p.name,1400));
    const [photos, copy] = await Promise.all([
      classifyPhotos(allPhotoUrls, industry),
      generateCopy(place, industry)
    ]);

    const html = renderDemo(place, copy, photos, industry, layout);
    demoCache.set(cacheKey, html);
    console.log(`✓ Done — ${industry} / ${layout||defaultLayouts[industry]} (cached)`);

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
      const [pid,layout]=k.split(':');
      return `<li>${k} <a href="/demo?place_id=${pid}&layout=${layout==='default'?'':layout}">[view]</a> <a href="/demo?place_id=${pid}&layout=${layout==='default'?'':layout}&refresh=true">[refresh]</a></li>`;
    }).join('')}</ul>`);
});

app.get('/', (req, res) => {
  res.send(`<style>body{font-family:monospace;padding:2rem;background:#0a0a0a;color:#f5f2ed;}a{color:#c94f1a;}code{background:#111;padding:.2rem .4rem;border-radius:2px;}h3{color:#888;margin:1.5rem 0 .5rem;font-size:.8rem;letter-spacing:.1em;}</style>
    <h2>⬡ HelloSite Demo Engine v4</h2>
    <p style="color:#555;margin:.5rem 0 1.5rem;">3 layout formats · in-memory cache · smarter photo selection · <a href="/cache" style="color:#4EA7FF;">${demoCache.size} cached</a></p>
    <p><strong>Usage:</strong> <code>/demo?place_id=ID</code> or <code>/demo?place_id=ID&layout=split|editorial|fullbleed</code></p>
    <p style="color:#444;font-size:.8rem;margin-top:.4rem;">Add <code>?refresh=true</code> to bust cache.</p>
    <h3>LAYOUT A — FULLBLEED (trades default)</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJj-aliA_PwoARI36KBu4KTcQ">TNT Auto Repair</a></li>
    </ul>
    <h3>LAYOUT B — SPLIT (grooming + retail default)</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJz6ca4qC5woARRewY64ReE94">Bushwick Barbershop</a></li>
      <li><a href="/demo?place_id=ChIJ9cAF4wyTwoAR_Jdg-iCVg-A">Adobe Design</a></li>
    </ul>
    <h3>LAYOUT C — EDITORIAL (wellness + pet default)</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJuZ--3qnHwoARRyWOYPuvQVk">Làmay Nail Spa</a></li>
      <li><a href="/demo?place_id=ChIJF6NXG_jHwoARVsJdvFTe1tA">21Pooch</a></li>
    </ul>
    <h3>TRY ANY LAYOUT ON ANY BUSINESS</h3>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJj-aliA_PwoARI36KBu4KTcQ&layout=editorial">TNT → editorial</a></li>
      <li><a href="/demo?place_id=ChIJuZ--3qnHwoARRyWOYPuvQVk&layout=split">Làmay → split</a></li>
    </ul>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HelloSite Demo Engine v4 on port ${PORT}`));
