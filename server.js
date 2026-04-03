const express = require('express');
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
const demoCache = new Map();

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

// ─── PHOTO CLASSIFICATION ────────────────────────────────────────────────────
async function classifyPhotos(photoUrls, industry) {
  if (!photoUrls.length) return { hero: null, gallery: [], detail: null };
  const toClassify = photoUrls.slice(0, 6);

  const heroPrefs = {
    trades:   ['exterior', 'interior', 'people', 'detail'],
    grooming: ['people', 'interior', 'exterior', 'detail'],
    wellness: ['interior', 'detail', 'people', 'exterior'],
    pet:      ['people', 'interior', 'exterior', 'detail'],
    retail:   ['interior', 'product', 'exterior', 'detail'],
  };
  const gallPrefs = {
    trades:   ['people', 'detail', 'interior', 'exterior'],
    grooming: ['people', 'detail', 'interior', 'exterior'],
    wellness: ['detail', 'people', 'interior', 'product'],
    pet:      ['people', 'detail', 'interior', 'exterior'],
    retail:   ['product', 'detail', 'interior', 'people'],
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 200,
        messages: [{ role: 'user', content: `Classify each photo URL for a ${industry} business website. Return ONLY a JSON array of: exterior|interior|product|people|detail|other\n\n${toClassify.map((u,i)=>`${i+1}. ${u}`).join('\n')}` }]
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
    for (let i = 0; i < 3; i++) {
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

function getPhotoUrl(photoName, maxWidth = 1200) {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
}

// ─── GENERATE COPY ────────────────────────────────────────────────────────────
async function generateCopy(place, industry) {
  const tones = {
    trades:   'Bold, direct, trustworthy. These are hardworking people who fix things right. No fluff. Services = specific repair types.',
    grooming: 'Sharp, confident, personal. The barber relationship is everything. Services = specific cuts and treatments.',
    wellness: 'Calm, luxurious, restorative. Quiet confidence. Services = specific treatments and nail services.',
    pet:      'Warm, loving, caring. Pet owners trust you with their family. Services = specific grooming and care services.',
    retail:   'Curated, warm, personal. Discovery and gifting. Services = specific product categories.',
  };
  const colorDefaults = {
    trades:   { p: '#c94f1a', a: '#d4a017', h: '#e05a1f', theme: 'dark' },
    grooming: { p: '#111118', a: '#c9a84c', h: '#c9a84c', theme: 'dark' },
    wellness: { p: '#7a6548', a: '#c4a882', h: '#9c7a4e', theme: 'light' },
    pet:      { p: '#2d6a4f', a: '#74c69d', h: '#40916c', theme: 'light' },
    retail:   { p: '#6b4c3b', a: '#c4a882', h: '#8b5e3c', theme: 'light' },
  };

  const prompt = `Write copy for a ${industry} business website. Tone: ${tones[industry]}

Business: ${place.displayName?.text}
Type: ${place.primaryTypeDisplayName?.text}
Address: ${place.formattedAddress}
Rating: ${place.rating} (${place.userRatingCount} reviews)
Reviews: ${(place.reviews||[]).slice(0,3).map(r=>r.text?.text?.substring(0,180)).join(' | ')}

Return ONLY valid JSON:
{
  "tagline": "4-6 word tagline for this specific business",
  "hero_headline": "3-5 powerful words. Use \\n after first 2-3 words for line break.",
  "hero_sub": "2 sentences. Reference real details from their reviews. Specific to this business.",
  "services_label": "Section label e.g. Our Services / What We Carry / Our Treatments",
  "services": ["6 specific services this business actually offers"],
  "service_descs": ["6 concise descriptions, 1-2 sentences, specific to this business"],
  "cta_heading": "2-3 word contact heading",
  "cta_sub": "One warm sentence inviting them to visit or call",
  "color_primary": "hex — ${colorDefaults[industry]?.p}",
  "color_accent": "hex — ${colorDefaults[industry]?.a}",
  "color_highlight": "hex — ${colorDefaults[industry]?.h}",
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
    shortName: (place.displayName?.text || 'Business').split(' ').slice(0,2).join(' '),
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
  return h.split(/\\n|\n/).map((l,i) => i===1 ? `<em style="color:${color};font-style:normal;">${l}</em>` : l).join('\n');
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function navHTML(shortName, phone, copy, theme, links) {
  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(10,10,12,0.96)' : 'rgba(252,251,249,0.96)';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';
  const h = copy.color_highlight || copy.color_primary;

  return `<nav style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1rem 2.5rem;background:${bg};backdrop-filter:blur(12px);border-bottom:1px solid ${border};">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.35rem;letter-spacing:.05em;color:${text};">${shortName}</div>
    <ul style="display:flex;gap:1.75rem;list-style:none;align-items:center;">
      ${links.map((l,i) => i === links.length-1
        ? `<li><a href="#contact" style="background:${h};color:#fff;padding:.45rem 1.1rem;border-radius:3px;text-decoration:none;font-size:.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">${l}</a></li>`
        : `<li><a href="#${l.toLowerCase().replace(/\s/g,'')}" style="color:${muted};text-decoration:none;font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;transition:color .2s;">${l}</a></li>`
      ).join('')}
    </ul>
  </nav>`;
}

function servicesSection(copy, primary, theme, style) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';
  const bg2 = isDark ? '#141414' : '#f3f0eb';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';
  const titleFont = (style === 'serif') ? `'Playfair Display',Georgia,serif` : `'Bebas Neue',sans-serif`;
  const titleSize = (style === 'serif') ? '1.1rem' : '1.15rem';
  const titleWeight = (style === 'serif') ? '700' : '400';
  const titleSpacing = (style === 'serif') ? '-.01em' : '.04em';

  return `<section id="services" style="padding:5rem 4rem;background:${bg};">
    <p style="font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.22em;text-transform:uppercase;color:${primary};margin-bottom:.6rem;">${copy.services_label || 'Our Services'}</p>
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,4vw,3rem);line-height:1;color:${text};margin-bottom:2.5rem;">What We Do</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${border};border:1px solid ${border};border-radius:4px;overflow:hidden;">
      ${copy.services.map((s,i) => `
      <div style="background:${bg};padding:1.5rem 1.75rem;transition:background .2s;" onmouseover="this.style.background='${bg2}'" onmouseout="this.style.background='${bg}'">
        ${style==='numbered' ? `<div style="font-family:'DM Mono',monospace;font-size:.6rem;color:${primary};opacity:.7;margin-bottom:.75rem;letter-spacing:.1em;">${String(i+1).padStart(2,'0')}</div>` : ''}
        ${style==='dot' ? `<div style="width:6px;height:6px;background:${primary};border-radius:50%;margin-bottom:.85rem;"></div>` : ''}
        ${style==='line' ? `<div style="width:20px;height:2px;background:${primary};margin-bottom:.85rem;border-radius:1px;"></div>` : ''}
        ${style==='serif' ? `<div style="width:20px;height:1px;background:${primary};opacity:.5;margin-bottom:.85rem;"></div>` : ''}
        <div style="font-family:${titleFont};font-size:${titleSize};font-weight:${titleWeight};letter-spacing:${titleSpacing};margin-bottom:.5rem;color:${text};line-height:1.2;">${s}</div>
        <div style="font-size:.8rem;color:${muted};line-height:1.65;">${copy.service_descs[i]||''}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

function gallerySection(images, name, theme) {
  if (!images || !images.length) return '';
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';
  return `<div style="padding:0 4rem 5rem;background:${bg};display:grid;grid-template-columns:repeat(${Math.min(images.length,3)},1fr);gap:6px;">
    ${images.map(url => `<div style="aspect-ratio:4/3;overflow:hidden;border-radius:3px;"><img src="${url}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .5s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}
  </div>`;
}

function reviewsSection(reviews, rating, reviewCount, primary, accent, theme) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#111113' : '#f3f0eb';
  const bg2 = isDark ? '#0d0d0d' : '#fafaf8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  return `<section id="reviews" style="background:${bg};padding:5rem 4rem;">
    <div style="display:flex;align-items:baseline;gap:1.5rem;margin-bottom:2.5rem;flex-wrap:wrap;">
      <div>
        <p style="font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.22em;text-transform:uppercase;color:${primary};margin-bottom:.5rem;">What People Say</p>
        <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,4vw,3rem);line-height:1;color:${text};">Google Reviews</h2>
      </div>
      <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1.25rem;background:${bg2};border:1px solid ${border};border-radius:3px;margin-left:auto;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${accent};line-height:1;">${rating}</div>
        <div>
          <div style="color:#f59e0b;font-size:.9rem;line-height:1;">${'★'.repeat(Math.round(rating))}</div>
          <div style="font-size:.7rem;color:${muted};margin-top:.2rem;">${reviewCount} reviews</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      ${reviews.map(r => {
        const txt = (r.text?.text||'').substring(0,160);
        return `<div style="background:${bg2};border:1px solid ${border};padding:1.25rem 1.5rem;border-radius:3px;">
          <div style="color:#f59e0b;font-size:.75rem;letter-spacing:.05em;margin-bottom:.6rem;">★★★★★</div>
          <p style="font-size:.8rem;color:${muted};line-height:1.68;margin-bottom:.8rem;font-style:italic;">"${txt}${(r.text?.text||'').length>160?'…':''}"</p>
          <p style="font-size:.65rem;color:${muted};letter-spacing:.06em;text-transform:uppercase;font-family:'DM Mono',monospace;opacity:.6;">— ${r.authorAttribution?.displayName||'Google Review'}</p>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function contactSection(copy, place, primary, highlight, theme) {
  const { phone, address, hours } = extractPlaceData(place);
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';
  const bg2 = isDark ? '#141414' : '#f3f0eb';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  return `<section id="contact" style="padding:5rem 4rem;background:${bg};display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start;">
    <div>
      <p style="font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.22em;text-transform:uppercase;color:${primary};margin-bottom:.5rem;">Come See Us</p>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,4vw,3rem);line-height:1;color:${text};margin-bottom:.85rem;">${copy.cta_heading||'Get In Touch'}</h2>
      <p style="font-size:.85rem;color:${muted};line-height:1.75;max-width:360px;margin-bottom:1.75rem;">${copy.cta_sub||''}</p>
      ${hours.length ? `<div>${hours.map(h => {
        const parts = h.split(': ');
        const closed = !parts[1]||parts[1].toLowerCase().includes('closed');
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid ${border};">
          <span style="font-size:.75rem;color:${muted};">${parts[0]}</span>
          <span style="font-family:'DM Mono',monospace;font-size:.72rem;color:${closed?(isDark?'#3a3a3a':'#ccc'):text};">${parts[1]||'Closed'}</span>
        </div>`;
      }).join('')}</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:.75rem;">
      ${phone ? `<a href="tel:${cleanPhone(phone)}" style="display:flex;align-items:center;gap:.85rem;padding:.9rem 1.1rem;background:${bg2};border:1px solid ${border};border-radius:3px;text-decoration:none;color:${text};">
        <span style="font-size:1rem;">📞</span>
        <div><div style="font-size:.6rem;color:${muted};letter-spacing:.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.15rem;">Phone</div><div style="font-size:.88rem;font-weight:500;">${phone}</div></div>
      </a>` : ''}
      <div style="display:flex;align-items:flex-start;gap:.85rem;padding:.9rem 1.1rem;background:${bg2};border:1px solid ${border};border-radius:3px;">
        <span style="font-size:1rem;margin-top:.1rem;">📍</span>
        <div><div style="font-size:.6rem;color:${muted};letter-spacing:.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.15rem;">Address</div><div style="font-size:.82rem;line-height:1.5;">${address}</div></div>
      </div>
      <a href="https://maps.google.com/?q=${encodeURIComponent(address)}" target="_blank" style="display:block;text-align:center;padding:.8rem;background:${highlight};color:#fff;text-decoration:none;font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;margin-top:.25rem;">Get Directions →</a>
    </div>
  </section>`;
}

function footerHTML(shortName, address, phone, theme, primary) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#080808' : '#f0ede8';
  const text = isDark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)';
  const border = isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';

  return `<footer style="background:${bg};border-top:1px solid ${border};padding:1.5rem 4rem;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.05em;color:${text};">${shortName}</div>
    <div style="font-size:.68rem;color:${text};font-family:'DM Mono',monospace;">${phone||''}</div>
    <div style="font-size:.6rem;color:${isDark?'rgba(255,255,255,.1)':'rgba(0,0,0,.15)'};font-family:'DM Mono',monospace;">A HelloSite · GetHelloSite.com</div>
  </footer>`;
}

function baseHTML(name, theme, body) {
  const isDark = theme === 'dark';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:${isDark?'#0d0d0d':'#fafaf8'};color:${isDark?'#f5f2ed':'#1a1a1a'};font-family:'DM Sans',sans-serif;font-weight:300;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @media(max-width:768px){
    nav ul{display:none!important;}
    [data-section]{padding:3.5rem 1.5rem!important;}
    [data-grid]{grid-template-columns:1fr!important;}
    [data-hero-split]{grid-template-columns:1fr!important;}
    [data-hero-split] [data-hero-image]{display:none!important;}
    footer{flex-direction:column!important;gap:.6rem!important;text-align:center!important;padding:1.25rem 1.5rem!important;}
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── TEMPLATE: TRADES ─────────────────────────────────────────────────────────
function renderTrades(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#c94f1a';
  const a = copy.color_accent || '#d4a017';
  const h = copy.color_highlight || '#e05a1f';

  return baseHTML(name, 'dark', `
    ${navHTML(shortName, phone, copy, 'dark', ['Services','Gallery','Reviews','Call Us'])}
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero?`url('${photos.hero}') center/cover no-repeat`:'#0d0d0d'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(10,10,10,.97) 40%,rgba(10,10,10,.45) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 5rem;max-width:660px;">
        <div style="display:inline-flex;align-items:center;gap:.4rem;border:1px solid ${p};color:${p};font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.14em;padding:.35rem .9rem;border-radius:2px;margin-bottom:1.25rem;">
          <span style="width:5px;height:5px;background:${p};border-radius:50%;animation:pulse 2s infinite;"></span>${copy.tagline}
        </div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(3.5rem,7vw,6.5rem);line-height:.92;letter-spacing:.015em;margin-bottom:1.25rem;white-space:pre-line;color:#f5f2ed;">${formatHeadline(copy.hero_headline, p)}</h1>
        <p style="font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.78;max-width:460px;margin-bottom:2.25rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="background:${h};color:#fff;padding:.8rem 1.75rem;text-decoration:none;font-size:.78rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">📞 ${phone}</a>`:''}
          <a href="#services" style="border:1px solid rgba(255,255,255,.18);color:#f5f2ed;padding:.8rem 1.75rem;text-decoration:none;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Our Services</a>
        </div>
        <div style="display:flex;gap:2.5rem;margin-top:2.75rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.07);">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.62rem;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.62rem;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};line-height:1;">LA</div><div style="font-size:.62rem;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
    </section>
    ${servicesSection(copy, p, 'dark', 'numbered')}
    ${gallerySection(photos.gallery, name, 'dark')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'dark')}
    ${contactSection(copy, place, p, h, 'dark')}
    ${footerHTML(shortName, address, phone, 'dark', p)}
  `);
}

// ─── TEMPLATE: GROOMING ───────────────────────────────────────────────────────
function renderGrooming(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#111118';
  const a = copy.color_accent || '#c9a84c';
  const h = copy.color_highlight || '#c9a84c';

  return baseHTML(name, 'dark', `
    ${navHTML(shortName, phone, copy, 'dark', ['Services','Gallery','Reviews','Book'])}
    <section data-hero-split style="min-height:100vh;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;">
      <div style="display:flex;flex-direction:column;justify-content:center;padding:8rem 3rem 5rem 4rem;background:#08080f;position:relative;z-index:2;">
        <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${a};margin-bottom:1rem;">${copy.tagline}</p>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(3rem,5.5vw,5.5rem);line-height:.92;letter-spacing:.02em;margin-bottom:1.25rem;color:#f5f2ed;white-space:pre-line;">${formatHeadline(copy.hero_headline, a)}</h1>
        <p style="font-size:.9rem;color:rgba(255,255,255,.45);line-height:1.8;max-width:380px;margin-bottom:2.25rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="background:${a};color:#000;padding:.8rem 1.75rem;text-decoration:none;font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Book — ${phone}</a>`:''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-top:2.75rem;padding-top:1.75rem;border-top:1px solid rgba(255,255,255,.06);">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.6rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.6rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:${a};line-height:1;">LA</div><div style="font-size:.6rem;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
      <div data-hero-image style="position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:${photos.hero?`url('${photos.hero}') center/cover no-repeat`:'#111'};"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(8,8,15,.7) 0%,transparent 35%);"></div>
      </div>
    </section>
    ${servicesSection(copy, a, 'dark', 'clean')}
    ${gallerySection(photos.gallery, name, 'dark')}
    ${reviewsSection(reviews, rating, reviewCount, a, h, 'dark')}
    ${contactSection(copy, place, a, h, 'dark')}
    ${footerHTML(shortName, address, phone, 'dark', a)}
  `);
}

// ─── TEMPLATE: WELLNESS ───────────────────────────────────────────────────────
function renderWellness(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#7a6548';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || '#9c7a4e';

  return baseHTML(name, 'light', `
    ${navHTML(shortName, phone, copy, 'light', ['Services','Gallery','Reviews','Book'])}
    <section style="min-height:100vh;position:relative;display:flex;align-items:flex-end;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero?`url('${photos.hero}') center 30%/cover no-repeat`:'linear-gradient(135deg,#f5f0ea,#e8ddd0)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(250,247,243,.98) 28%,rgba(250,247,243,.15) 100%);"></div>
      <div style="position:relative;z-index:2;padding:3.5rem 4rem 5.5rem;width:100%;">
        <div style="max-width:560px;">
          <p style="font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${p};margin-bottom:.85rem;">${copy.tagline}</p>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5.5vw,4.5rem);font-weight:600;line-height:1.08;letter-spacing:-.01em;color:#1a1a1a;margin-bottom:1.25rem;white-space:pre-line;">${copy.hero_headline.replace(/\\n|\n/g,'\n')}</h1>
          <p style="font-size:.92rem;color:rgba(0,0,0,.5);line-height:1.8;max-width:420px;margin-bottom:1.75rem;">${copy.hero_sub}</p>
          <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
            <a href="#contact" style="background:${p};color:#fff;padding:.78rem 1.75rem;text-decoration:none;font-size:.77rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;border-radius:3px;">Book Appointment</a>
            ${phone?`<span style="font-size:.83rem;color:rgba(0,0,0,.45);font-weight:400;">${phone}</span>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;margin-top:1.75rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,.08);">
            <span style="color:#f59e0b;font-size:.85rem;">${'★'.repeat(Math.round(rating))}</span>
            <span style="font-size:.78rem;color:rgba(0,0,0,.4);">${rating} · ${reviewCount} reviews on Google</span>
          </div>
        </div>
      </div>
    </section>
    ${servicesSection(copy, p, 'light', 'serif')}
    ${gallerySection(photos.gallery, name, 'light')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'light')}
    ${contactSection(copy, place, p, h, 'light')}
    ${footerHTML(shortName, address, phone, 'light', p)}
  `);
}

// ─── TEMPLATE: PET ────────────────────────────────────────────────────────────
function renderPet(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#2d6a4f';
  const a = copy.color_accent || '#74c69d';
  const h = copy.color_highlight || '#40916c';

  return baseHTML(name, 'light', `
    ${navHTML(shortName, phone, copy, 'light', ['Services','Gallery','Reviews','Book'])}
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero?`url('${photos.hero}') center/cover no-repeat`:'linear-gradient(135deg,#e8f5ef,#d1ead9)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(248,252,250,.97) 46%,rgba(248,252,250,.4) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 5rem;max-width:640px;">
        <div style="display:inline-block;background:${p};color:#fff;font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;padding:.35rem .85rem;border-radius:100px;margin-bottom:1.25rem;">${copy.tagline}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5.5vw,4.5rem);font-weight:600;line-height:1.08;letter-spacing:-.01em;color:#1a1a1a;margin-bottom:1.25rem;white-space:pre-line;">${copy.hero_headline.replace(/\\n|\n/g,'\n')}</h1>
        <p style="font-size:.92rem;color:rgba(0,0,0,.5);line-height:1.8;max-width:440px;margin-bottom:1.75rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          <a href="#contact" style="background:${p};color:#fff;padding:.78rem 1.75rem;text-decoration:none;font-size:.77rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;border-radius:100px;">Book a Groom</a>
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="border:1.5px solid rgba(0,0,0,.12);color:#333;padding:.78rem 1.75rem;text-decoration:none;font-size:.77rem;letter-spacing:.08em;text-transform:uppercase;border-radius:100px;">${phone}</a>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:1.75rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,.08);">
          <span style="color:#f59e0b;font-size:.85rem;">${'★'.repeat(Math.round(rating))}</span>
          <span style="font-size:.78rem;color:rgba(0,0,0,.4);">${rating} · ${reviewCount} reviews on Google</span>
        </div>
      </div>
    </section>
    ${servicesSection(copy, p, 'light', 'dot')}
    ${gallerySection(photos.gallery, name, 'light')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'light')}
    ${contactSection(copy, place, p, h, 'light')}
    ${footerHTML(shortName, address, phone, 'light', p)}
  `);
}

// ─── TEMPLATE: RETAIL ─────────────────────────────────────────────────────────
function renderRetail(place, copy, photos) {
  const { name, shortName, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#6b4c3b';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || '#8b5e3c';

  return baseHTML(name, 'light', `
    ${navHTML(shortName, phone, copy, 'light', ['Shop','Gallery','Reviews','Visit'])}
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero?`url('${photos.hero}') center/cover no-repeat`:'linear-gradient(135deg,#f5f0ea,#ede5d5)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(252,249,245,.97) 46%,rgba(252,249,245,.4) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 5rem;max-width:640px;">
        <div style="display:inline-block;background:${p};color:#fff;font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;padding:.35rem .85rem;border-radius:2px;margin-bottom:1.25rem;">${copy.tagline}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.75rem,5.5vw,4.75rem);font-weight:600;line-height:1.05;letter-spacing:-.01em;color:#1a1a1a;margin-bottom:1.25rem;white-space:pre-line;">${copy.hero_headline.replace(/\\n|\n/g,'\n')}</h1>
        <p style="font-size:.92rem;color:rgba(0,0,0,.5);line-height:1.8;max-width:440px;margin-bottom:1.75rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          <a href="#contact" style="background:${p};color:#fff;padding:.78rem 1.75rem;text-decoration:none;font-size:.77rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;border-radius:2px;">Visit Us</a>
          ${phone?`<a href="tel:${cleanPhone(phone)}" style="border:1px solid rgba(0,0,0,.15);color:#333;padding:.78rem 1.75rem;text-decoration:none;font-size:.77rem;letter-spacing:.06em;text-transform:uppercase;border-radius:2px;">${phone}</a>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:1.75rem;padding-top:1.5rem;border-top:1px solid rgba(0,0,0,.08);">
          <span style="color:#f59e0b;font-size:.85rem;">${'★'.repeat(Math.round(rating))}</span>
          <span style="font-size:.78rem;color:rgba(0,0,0,.4);">${rating} · ${reviewCount} reviews on Google</span>
        </div>
      </div>
    </section>
    ${servicesSection(copy, p, 'light', 'line')}
    ${gallerySection(photos.gallery, name, 'light')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'light')}
    ${contactSection(copy, place, p, h, 'light')}
    ${footerHTML(shortName, address, phone, 'light', p)}
  `);
}

// ─── MAIN ROUTE ──────────────────────────────────────────────────────────────
app.get('/demo', async (req, res) => {
  const { place_id, refresh } = req.query;
  if (!place_id) return res.status(400).send('Missing place_id. Usage: /demo?place_id=YOUR_PLACE_ID');

  // Serve from cache if available (skip cache with ?refresh=true)
  if (demoCache.has(place_id) && refresh !== 'true') {
    console.log(`⚡ Cache hit: ${place_id}`);
    res.setHeader('Content-Type', 'text/html');
    return res.send(demoCache.get(place_id));
  }

  try {
    console.log(`\n━━━ ${place_id}`);
    const place = await getPlaceDetails(place_id);
    const industry = detectIndustry(place);
    console.log(`✓ ${place.displayName?.text} → ${industry}`);

    if (industry === 'unsupported') {
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HelloSite</title><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap" rel="stylesheet"></head><body style="font-family:'DM Sans',sans-serif;background:#FFF7E8;color:#17324D;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;"><div><div style="font-size:2rem;margin-bottom:1rem;">👋</div><h1 style="font-size:1.75rem;font-weight:800;margin-bottom:.75rem;">Coming Soon</h1><p style="color:rgba(23,50,77,.6);max-width:380px;line-height:1.7;margin:0 auto 1.5rem;">We're working on templates for restaurants and fitness businesses. In the meantime, we support trades, grooming, wellness, pet care, and retail.</p><a href="https://gethellosite.com" style="background:#17324D;color:#fff;padding:.75rem 1.5rem;border-radius:100px;text-decoration:none;font-weight:600;font-size:.875rem;">Learn More at HelloSite</a></div></body></html>`);
    }

    const allPhotoUrls = (place.photos||[]).slice(0,6).map(p=>getPhotoUrl(p.name,1200));
    const [photos, copy] = await Promise.all([
      classifyPhotos(allPhotoUrls, industry),
      generateCopy(place, industry)
    ]);

    const renderers = { trades:renderTrades, grooming:renderGrooming, wellness:renderWellness, pet:renderPet, retail:renderRetail };
    const html = (renderers[industry]||renderRetail)(place, copy, photos);

    // Cache and serve
    demoCache.set(place_id, html);
    console.log(`✓ Done — ${industry} (cached)`);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send(`<pre style="padding:2rem;font-family:monospace;">Error: ${err.message}\n\n${err.stack}</pre>`);
  }
});

app.get('/cache', (req, res) => {
  const keys = [...demoCache.keys()];
  res.send(`<style>body{font-family:monospace;padding:2rem;background:#0d0d0d;color:#f5f2ed;}a{color:#4EA7FF;}</style>
    <h2>Cache status: ${keys.length} demos cached</h2>
    <ul style="line-height:2;margin-top:1rem;">${keys.map(k => `<li>${k} <a href="/demo?place_id=${k}&refresh=true">↺ refresh</a></li>`).join('')}</ul>
    <p style="margin-top:1rem;color:#444;font-size:.8rem;">Add ?refresh=true to any demo URL to regenerate and re-cache.</p>`);
});

app.get('/', (req, res) => {
  const cached = demoCache.size;
  res.send(`<style>body{font-family:monospace;padding:2rem;background:#0d0d0d;color:#f5f2ed;}a{color:#c94f1a;}code{background:#1a1a1a;padding:.2rem .4rem;border-radius:2px;}</style>
    <h2>⬡ HelloSite Demo Engine v3</h2>
    <p style="color:#666;margin:.5rem 0 1.5rem;">Generates demo sites from Google Place IDs · <a href="/cache" style="color:#4EA7FF;">${cached} cached</a></p>
    <p><strong>Usage:</strong> <code>/demo?place_id=GOOGLE_PLACE_ID</code></p>
    <p style="color:#555;font-size:.8rem;margin-top:.5rem;">Add <code>?refresh=true</code> to force regeneration.</p>
    <br>
    <p style="color:#444;margin-bottom:.5rem;">Test IDs:</p>
    <ul style="line-height:2.2;color:#666;">
      <li><a href="/demo?place_id=ChIJj-aliA_PwoARI36KBu4KTcQ">TNT Auto Repair</a> — trades</li>
      <li><a href="/demo?place_id=ChIJz6ca4qC5woARRewY64ReE94">Bushwick Barbershop</a> — grooming</li>
      <li><a href="/demo?place_id=ChIJuZ--3qnHwoARRyWOYPuvQVk">Làmay Nail Spa</a> — wellness</li>
      <li><a href="/demo?place_id=ChIJF6NXG_jHwoARVsJdvFTe1tA">21Pooch</a> — pet</li>
      <li><a href="/demo?place_id=ChIJ9cAF4wyTwoAR_Jdg-iCVg-A">Adobe Design</a> — retail</li>
    </ul>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HelloSite Demo Engine v3 on port ${PORT}`));
