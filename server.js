const express = require('express');
const app = express();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── INDUSTRY ROUTING ────────────────────────────────────────────────────────
// Maps Google place types to our template categories
function detectIndustry(place) {
  const types = place.types || [];
  const typesStr = types.join(',').toLowerCase();
  const primaryType = (place.primaryTypeDisplayName?.text || '').toLowerCase();

  if (typesStr.match(/car_repair|electrician|plumber|contractor|roofing|locksmith|auto_parts/)) return 'trades';
  if (typesStr.match(/barber_shop/) || primaryType.includes('barber')) return 'grooming';
  if (typesStr.match(/hair_salon|hair_care/) || primaryType.includes('hair')) return 'grooming';
  if (typesStr.match(/nail_salon|spa|massage|beauty_salon/)) return 'wellness';
  if (typesStr.match(/restaurant|cafe|bakery|bar|food|meal/)) return 'food';
  if (typesStr.match(/gym|fitness|yoga|sports_club/)) return 'fitness';
  if (typesStr.match(/store|shop|gift|clothing|jewelry|boutique/)) return 'retail';
  return 'retail'; // default fallback
}

// ─── PHOTO CLASSIFICATION VIA CLAUDE VISION ──────────────────────────────────
async function classifyPhotos(photoUrls, industry) {
  if (!photoUrls.length) return { hero: null, gallery: [], detail: null };

  // For speed, classify first 6 photos max
  const toClassify = photoUrls.slice(0, 6);

  const prompt = `You are classifying photos for a ${industry} business website.
For each photo URL below, classify it as one of: exterior | interior | product | food | people | detail | other

Return ONLY a JSON array in the same order as the input, like:
["exterior", "interior", "product", "detail", "people", "other"]

Photo URLs:
${toClassify.map((url, i) => `${i + 1}. ${url}`).join('\n')}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.content[0].text.trim();
    const classifications = JSON.parse(text);

    // Build classified photo map
    const classified = toClassify.map((url, i) => ({
      url,
      type: classifications[i] || 'other'
    }));

    // Select best photo for each slot based on industry
    const heroPreference = {
      trades:   ['exterior', 'interior', 'detail', 'other'],
      grooming: ['interior', 'people', 'exterior', 'detail'],
      wellness: ['interior', 'detail', 'people', 'exterior'],
      food:     ['food', 'interior', 'exterior', 'detail'],
      fitness:  ['interior', 'people', 'exterior', 'detail'],
      retail:   ['interior', 'product', 'exterior', 'detail']
    };

    const galleryPreference = {
      trades:   ['detail', 'interior', 'people', 'exterior'],
      grooming: ['people', 'interior', 'detail', 'exterior'],
      wellness: ['detail', 'interior', 'product', 'people'],
      food:     ['food', 'detail', 'interior', 'people'],
      fitness:  ['people', 'interior', 'detail', 'exterior'],
      retail:   ['product', 'detail', 'interior', 'people']
    };

    function pickBest(prefs, exclude = []) {
      for (const pref of prefs) {
        const match = classified.find(p => p.type === pref && !exclude.includes(p.url));
        if (match) return match.url;
      }
      return classified.find(p => !exclude.includes(p.url))?.url || null;
    }

    const heroPref = heroPreference[industry] || heroPreference.retail;
    const gallPref = galleryPreference[industry] || galleryPreference.retail;

    const hero = pickBest(heroPref);
    const used = hero ? [hero] : [];

    const gallery = [];
    for (let i = 0; i < 3; i++) {
      const pick = pickBest(gallPref, [...used, ...gallery]);
      if (pick) gallery.push(pick);
    }

    const detail = pickBest(['detail', 'product', 'food'], [...used, ...gallery]);

    return { hero, gallery, detail };

  } catch (err) {
    console.error('Photo classification failed, using default order:', err.message);
    return {
      hero: photoUrls[0] || null,
      gallery: photoUrls.slice(1, 4),
      detail: photoUrls[4] || null
    };
  }
}

// ─── FETCH PLACE DETAILS ─────────────────────────────────────────────────────
async function getPlaceDetails(placeId) {
  const fields = [
    'displayName', 'formattedAddress', 'nationalPhoneNumber',
    'regularOpeningHours', 'rating', 'userRatingCount', 'reviews',
    'photos', 'primaryTypeDisplayName', 'types', 'editorialSummary',
    'websiteUri', 'location'
  ].join(',');

  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);
  return res.json();
}

function getPhotoUrl(photoName, maxWidth = 1200) {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
}

// ─── GENERATE COPY VIA CLAUDE ─────────────────────────────────────────────────
async function generateCopy(place, industry) {
  const industryInstructions = {
    trades:   'Bold, trustworthy, direct. "We fix it right." Emphasize reliability, years of experience, fair pricing. Services list = specific repair types.',
    grooming: 'Sharp, confident, personal. Emphasize the barber/stylist relationship. Services list = specific cuts and treatments.',
    wellness: 'Calm, luxurious, restorative. Emphasize relaxation, expertise, results. Services list = specific treatments.',
    food:     'Warm, appetizing, inviting. Emphasize flavor, atmosphere, community. Services list = menu categories or signature items.',
    fitness:  'Energetic, motivational, results-driven. Emphasize transformation, community, coaches. Services list = class types or programs.',
    retail:   'Curated, lifestyle-forward, personal. Emphasize unique finds, gift-giving, discovery. Services list = product categories they carry.'
  };

  const prompt = `You are writing copy for a ${industry} business website demo.
Tone: ${industryInstructions[industry] || industryInstructions.retail}

Business: ${place.displayName?.text}
Type: ${place.primaryTypeDisplayName?.text}
Address: ${place.formattedAddress}
Rating: ${place.rating} stars (${place.userRatingCount} reviews)
Summary: ${place.editorialSummary?.text || 'N/A'}
Top reviews: ${(place.reviews || []).slice(0, 3).map(r => r.text?.text?.substring(0, 200)).join(' | ')}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "tagline": "4-6 word tagline specific to this business",
  "hero_headline": "Bold 3-6 word headline. Use \\n for line break after first 2-3 words.",
  "hero_sub": "2 sentences. Specific to what this business actually does. Reference real details from reviews.",
  "about": "3 sentences about this specific business. Mention neighborhood, years if known, what makes them special.",
  "services_label": "What to call the services section — e.g. 'Our Services', 'What We Carry', 'On The Menu', 'Our Treatments'",
  "services": ["6 specific services/products/offerings for this exact business"],
  "service_descs": ["6 matching descriptions, 1-2 sentences each, specific to this business"],
  "cta_heading": "3-4 word heading for contact section",
  "cta_sub": "1 sentence encouraging them to visit or call",
  "color_primary": "hex color fitting this business (trades=#c94f1a, grooming=#1a1a2e, wellness=#8b7355, food=#c25a2a, fitness=#1d4ed8, retail=#8b5a2b)",
  "color_accent": "complementary hex color",
  "color_highlight": "bright accent for CTAs — should pop against primary",
  "theme": "dark or light"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const text = data.content[0].text.trim();
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Claude returned invalid JSON');
  }
}

// ─── TEMPLATE: TRADES (Auto, Plumbing, Electric, Contracting) ─────────────────
function renderTrades(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const p = copy.color_primary || '#c94f1a';
  const a = copy.color_accent || '#d4a017';
  const h = copy.color_highlight || '#e05a1f';

  return baseHTML(name, 'dark', p, a, h, `
    ${navHTML(name, phone, copy, 'dark', ['Services', 'Reviews', 'Contact'])}

    <!-- HERO -->
    <section class="hero" style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero ? `url('${photos.hero}') center/cover no-repeat` : 'linear-gradient(135deg,#1a1a1a,#0d0d0d)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(13,13,13,0.97) 45%,rgba(13,13,13,0.4) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 4rem;max-width:700px;">
        <div style="display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.05);border:1px solid ${p};color:${p};font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.12em;padding:.4rem 1rem;border-radius:2px;margin-bottom:1.5rem;">
          <span style="width:6px;height:6px;background:${p};border-radius:50%;animation:pulse 2s infinite;"></span>
          ${copy.tagline}
        </div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(4rem,8vw,7rem);line-height:.9;letter-spacing:.02em;margin-bottom:1.5rem;white-space:pre-line;color:#f5f2ed;">${formatHeadline(copy.hero_headline, p)}</h1>
        <p style="font-size:1rem;color:#aaa;line-height:1.75;max-width:480px;margin-bottom:2.5rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          ${phone ? `<a href="tel:${cleanPhone(phone)}" style="${btnPrimary(h)}">📞 ${phone}</a>` : ''}
          <a href="#services" style="${btnOutline()}">Our Services</a>
        </div>
        <div style="display:flex;gap:2.5rem;margin-top:3rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.08);">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:${a};line-height:1;">${rating}★</div><div style="font-size:.7rem;color:#888;letter-spacing:.06em;text-transform:uppercase;margin-top:.2rem;">Google Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:${a};line-height:1;">${reviewCount}</div><div style="font-size:.7rem;color:#888;letter-spacing:.06em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:${a};line-height:1;">✓</div><div style="font-size:.7rem;color:#888;letter-spacing:.06em;text-transform:uppercase;margin-top:.2rem;">Trusted Local</div></div>
        </div>
      </div>
    </section>

    <!-- SERVICES -->
    ${servicesGrid(copy, p, 'dark', 'numbered')}

    <!-- GALLERY -->
    ${gallerySection(photos.gallery, name, 'dark')}

    <!-- REVIEWS -->
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'dark')}

    <!-- CONTACT -->
    ${contactSection(copy, place, photos, p, h, 'dark')}

    ${footerHTML(name, address, phone, 'dark', p)}
  `);
}

// ─── TEMPLATE: RETAIL (Boutique, Gift, Clothing, Jewelry) ─────────────────────
function renderRetail(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews, hours } = extractPlaceData(place);
  const p = copy.color_primary || '#8b5a2b';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || '#a0522d';

  return baseHTML(name, 'light', p, a, h, `
    ${navHTML(name, phone, copy, 'light', ['Shop', 'Gallery', 'Reviews', 'Visit'])}

    <!-- HERO -->
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero ? `url('${photos.hero}') center/cover no-repeat` : 'linear-gradient(135deg,#f5f0e8,#ede5d5)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(250,248,244,.97) 48%,rgba(250,248,244,.5) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 4rem;max-width:680px;">
        <div style="display:inline-block;background:${p};color:#fff;font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.15em;text-transform:uppercase;padding:.4rem 1rem;border-radius:1px;margin-bottom:1.5rem;">${copy.tagline}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(3rem,6vw,5.5rem);line-height:1.05;letter-spacing:-.01em;margin-bottom:1.5rem;color:#1a1a1a;white-space:pre-line;">${copy.hero_headline.replace(/\\n/g, '\n')}</h1>
        <p style="font-size:1.05rem;color:#666;line-height:1.8;max-width:460px;margin-bottom:2.5rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          <a href="#contact" style="background:${p};color:#fff;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;border-radius:1px;">Visit Us</a>
          ${phone ? `<a href="tel:${cleanPhone(phone)}" style="border:1px solid rgba(0,0,0,.2);color:#333;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;border-radius:1px;">${phone}</a>` : ''}
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;margin-top:2.5rem;padding-top:2rem;border-top:1px solid rgba(0,0,0,.08);">
          <span style="color:#f59e0b;font-size:1rem;">${'★'.repeat(Math.round(rating))}</span>
          <span style="font-size:.82rem;color:#888;">${rating} · ${reviewCount} reviews on Google</span>
        </div>
      </div>
    </section>

    <!-- WHAT WE CARRY -->
    ${servicesGrid(copy, p, 'light', 'icons')}

    <!-- GALLERY -->
    ${gallerySection(photos.gallery, name, 'light')}

    <!-- REVIEWS -->
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'light')}

    <!-- VISIT -->
    ${contactSection(copy, place, photos, p, h, 'light')}

    ${footerHTML(name, address, phone, 'light', p)}
  `);
}

// ─── TEMPLATE: GROOMING (Barbershop, Hair Salon) ──────────────────────────────
function renderGrooming(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#1a1a2e';
  const a = copy.color_accent || '#c9a84c';
  const h = copy.color_highlight || '#c9a84c';

  return baseHTML(name, 'dark', p, a, h, `
    ${navHTML(name, phone, copy, 'dark', ['Services', 'Gallery', 'Reviews', 'Book'])}

    <!-- HERO - split layout -->
    <section style="min-height:100vh;display:grid;grid-template-columns:1fr 1fr;position:relative;">
      <div style="display:flex;flex-direction:column;justify-content:center;padding:8rem 3rem 4rem 4rem;background:#0a0a0f;position:relative;z-index:2;">
        <div style="font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:${a};margin-bottom:1.2rem;">${copy.tagline}</div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(3.5rem,6vw,6rem);line-height:.92;letter-spacing:.02em;margin-bottom:1.5rem;color:#f5f2ed;white-space:pre-line;">${formatHeadline(copy.hero_headline, a)}</h1>
        <p style="font-size:.95rem;color:#888;line-height:1.8;max-width:400px;margin-bottom:2.5rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          ${phone ? `<a href="tel:${cleanPhone(phone)}" style="${btnPrimary(a, '#000')}">Book Now — ${phone}</a>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.06);">
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};">${rating}★</div><div style="font-size:.65rem;color:#666;letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Rating</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};">${reviewCount}</div><div style="font-size:.65rem;color:#666;letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Reviews</div></div>
          <div><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${a};">LA</div><div style="font-size:.65rem;color:#666;letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem;">Local</div></div>
        </div>
      </div>
      <div style="position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:${photos.hero ? `url('${photos.hero}') center/cover no-repeat` : 'linear-gradient(135deg,#1a1a2e,#0a0a0f)'};"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(10,10,15,.6) 0%,transparent 40%);"></div>
      </div>
    </section>

    ${servicesGrid(copy, a, 'dark', 'clean')}
    ${gallerySection(photos.gallery, name, 'dark')}
    ${reviewsSection(reviews, rating, reviewCount, a, h, 'dark')}
    ${contactSection(copy, place, photos, a, h, 'dark')}
    ${footerHTML(name, address, phone, 'dark', a)}
  `);
}

// ─── TEMPLATE: WELLNESS (Nail Salon, Spa, Massage) ────────────────────────────
function renderWellness(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#8b7355';
  const a = copy.color_accent || '#c4a882';
  const h = copy.color_highlight || '#9c7a4e';

  return baseHTML(name, 'light', p, a, h, `
    ${navHTML(name, phone, copy, 'light', ['Services', 'Gallery', 'Reviews', 'Book'])}

    <!-- HERO - minimal, airy -->
    <section style="min-height:100vh;position:relative;display:flex;align-items:flex-end;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero ? `url('${photos.hero}') center/cover no-repeat` : 'linear-gradient(135deg,#f8f4ef,#ede5d5)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(248,244,239,.98) 30%,rgba(248,244,239,.3) 100%);"></div>
      <div style="position:relative;z-index:2;padding:4rem 4rem 6rem;width:100%;">
        <div style="max-width:600px;">
          <p style="font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:${p};margin-bottom:1rem;">${copy.tagline}</p>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(3rem,6vw,5rem);line-height:1.05;color:#1a1a1a;margin-bottom:1.5rem;white-space:pre-line;">${copy.hero_headline.replace(/\\n/g, '\n')}</h1>
          <p style="font-size:1rem;color:#777;line-height:1.8;max-width:440px;margin-bottom:2rem;">${copy.hero_sub}</p>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
            <a href="#contact" style="background:${p};color:#fff;padding:.85rem 2rem;text-decoration:none;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;border-radius:1px;">Book Appointment</a>
            ${phone ? `<span style="font-size:.88rem;color:#888;">${phone}</span>` : ''}
          </div>
        </div>
      </div>
    </section>

    ${servicesGrid(copy, p, 'light', 'elegant')}
    ${gallerySection(photos.gallery, name, 'light')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'light')}
    ${contactSection(copy, place, photos, p, h, 'light')}
    ${footerHTML(name, address, phone, 'light', p)}
  `);
}

// ─── TEMPLATE: FOOD (Restaurant, Cafe, Bakery) ────────────────────────────────
function renderFood(place, copy, photos) {
  const { name, phone, address, rating, reviewCount, reviews } = extractPlaceData(place);
  const p = copy.color_primary || '#c25a2a';
  const a = copy.color_accent || '#d4a017';
  const h = copy.color_highlight || '#e06030';

  return baseHTML(name, 'dark', p, a, h, `
    ${navHTML(name, phone, copy, 'dark', ['Menu', 'Gallery', 'Reviews', 'Visit'])}

    <!-- HERO - full bleed food photo -->
    <section style="min-height:100vh;position:relative;display:flex;align-items:center;overflow:hidden;">
      <div style="position:absolute;inset:0;background:${photos.hero ? `url('${photos.hero}') center/cover no-repeat` : 'linear-gradient(135deg,#1a0a00,#0d0d0d)'};"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 100%);"></div>
      <div style="position:relative;z-index:2;padding:8rem 4rem 4rem;max-width:700px;">
        <div style="display:inline-block;background:${p};color:#fff;font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.15em;padding:.4rem 1rem;margin-bottom:1.5rem;">${copy.tagline}</div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(4rem,8vw,7rem);line-height:.9;color:#fff;margin-bottom:1.5rem;white-space:pre-line;">${formatHeadline(copy.hero_headline, a)}</h1>
        <p style="font-size:1.05rem;color:rgba(255,255,255,.75);line-height:1.75;max-width:480px;margin-bottom:2.5rem;">${copy.hero_sub}</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          <a href="#contact" style="${btnPrimary(p)}">Get Directions</a>
          ${phone ? `<a href="tel:${cleanPhone(phone)}" style="${btnOutlineDark()}">📞 ${phone}</a>` : ''}
        </div>
      </div>
    </section>

    ${servicesGrid(copy, p, 'dark', 'food')}
    ${gallerySection(photos.gallery, name, 'dark')}
    ${reviewsSection(reviews, rating, reviewCount, p, a, 'dark')}
    ${contactSection(copy, place, photos, p, h, 'dark')}
    ${footerHTML(name, address, phone, 'dark', p)}
  `);
}

// ─── SHARED COMPONENT: SERVICES GRID ─────────────────────────────────────────
function servicesGrid(copy, primary, theme, style) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';
  const bg2 = isDark ? '#1a1a1a' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? '#888' : '#666';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  const cardStyle = `background:${bg};padding:2rem;border-bottom:1px solid ${border};border-right:1px solid ${border};transition:background .2s;`;

  return `
  <section id="services" style="padding:6rem 4rem;background:${bg};">
    <p style="font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.8rem;">${copy.services_label || 'What We Do'}</p>
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};margin-bottom:3rem;">Our Services</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);background:${border};border:1px solid ${border};">
      ${copy.services.map((s, i) => `
      <div style="${cardStyle}">
        ${style === 'numbered' ? `<div style="font-family:'DM Mono',monospace;font-size:.65rem;color:${primary};margin-bottom:.8rem;opacity:.8;">0${i+1}</div>` : ''}
        ${style === 'icons' ? `<div style="width:8px;height:8px;background:${primary};border-radius:50%;margin-bottom:1rem;"></div>` : ''}
        ${style === 'elegant' ? `<div style="width:24px;height:1px;background:${primary};margin-bottom:1rem;"></div>` : ''}
        ${style === 'food' ? `<div style="font-size:1.2rem;margin-bottom:.8rem;">🍽</div>` : ''}
        ${style === 'clean' ? `<div style="font-family:'DM Mono',monospace;font-size:.6rem;color:${primary};margin-bottom:.8rem;letter-spacing:.15em;">${String(i+1).padStart(2,'0')}</div>` : ''}
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.25rem;letter-spacing:.04em;margin-bottom:.6rem;color:${text};">${s}</div>
        <div style="font-size:.82rem;color:${muted};line-height:1.65;">${copy.service_descs[i] || ''}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

// ─── SHARED COMPONENT: GALLERY ────────────────────────────────────────────────
function gallerySection(images, name, theme) {
  if (!images || images.length === 0) return '';
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';

  return `
  <div id="gallery" style="padding:0 4rem 6rem;background:${bg};display:grid;grid-template-columns:repeat(${images.length},1fr);gap:8px;">
    ${images.map(url => `
    <div style="aspect-ratio:4/3;overflow:hidden;border-radius:2px;">
      <img src="${url}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .4s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" />
    </div>`).join('')}
  </div>`;
}

// ─── SHARED COMPONENT: REVIEWS ────────────────────────────────────────────────
function reviewsSection(reviews, rating, reviewCount, primary, accent, theme) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#141414' : '#f0ede8';
  const bg2 = isDark ? '#0d0d0d' : '#fafaf8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? '#888' : '#666';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  return `
  <section id="reviews" style="background:${bg};padding:6rem 4rem;">
    <p style="font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.8rem;">What People Say</p>
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,5vw,4rem);line-height:1;color:${text};margin-bottom:2.5rem;">${rating} Stars on Google</h2>
    <div style="display:inline-flex;align-items:center;gap:1.5rem;background:${bg2};border:1px solid ${border};padding:1.25rem 2rem;border-radius:2px;margin-bottom:3rem;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:3.5rem;color:${accent};line-height:1;">${rating}</div>
      <div>
        <div style="color:#f59e0b;font-size:1.1rem;">${'★'.repeat(Math.round(rating))}</div>
        <div style="font-size:.78rem;color:${muted};margin-top:.3rem;">${reviewCount} Google Reviews</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;">
      ${reviews.map(r => `
      <div style="background:${bg2};border:1px solid ${border};padding:1.8rem;border-radius:2px;">
        <div style="color:#f59e0b;font-size:.85rem;margin-bottom:.8rem;">★★★★★</div>
        <p style="font-size:.83rem;color:${muted};line-height:1.72;margin-bottom:1.2rem;font-style:italic;">"${(r.text?.text || '').substring(0,200)}${(r.text?.text || '').length > 200 ? '...' : ''}"</p>
        <p style="font-size:.7rem;color:${muted};letter-spacing:.06em;text-transform:uppercase;font-family:'DM Mono',monospace;opacity:.7;">— ${r.authorAttribution?.displayName || 'Google Review'}</p>
      </div>`).join('')}
    </div>
  </section>`;
}

// ─── SHARED COMPONENT: CONTACT ────────────────────────────────────────────────
function contactSection(copy, place, photos, primary, highlight, theme) {
  const { name, phone, address, hours } = extractPlaceData(place);
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d0d0d' : '#fafaf8';
  const bg2 = isDark ? '#1a1a1a' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? '#888' : '#666';
  const border = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  return `
  <section id="contact" style="padding:6rem 4rem;background:${bg};display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start;">
    <div>
      <p style="font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:${primary};margin-bottom:.8rem;">Come See Us</p>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,4vw,3.5rem);line-height:1;color:${text};margin-bottom:1rem;">${copy.cta_heading || 'Get In Touch'}</h2>
      <p style="font-size:.9rem;color:${muted};line-height:1.75;max-width:380px;margin-bottom:2rem;">${copy.cta_sub || copy.about}</p>
      ${hours.length > 0 ? `<div style="display:flex;flex-direction:column;">
        ${hours.map(h => {
          const parts = h.split(': ');
          const closed = !parts[1] || parts[1].toLowerCase().includes('closed');
          return `<div style="display:flex;justify-content:space-between;padding:.65rem 0;border-bottom:1px solid ${border};font-size:.82rem;">
            <span style="color:${muted};">${parts[0]}</span>
            <span style="font-family:'DM Mono',monospace;font-size:.78rem;color:${closed ? (isDark ? '#444' : '#bbb') : text};">${parts[1] || 'Closed'}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:1rem;">
      ${phone ? `<a href="tel:${cleanPhone(phone)}" style="display:flex;align-items:flex-start;gap:1rem;padding:1.2rem;background:${bg2};border:1px solid ${border};border-radius:2px;text-decoration:none;color:${text};transition:border-color .2s;" onmouseover="this.style.borderColor='${primary}'" onmouseout="this.style.borderColor='${border}'">
        <span>📞</span>
        <div><div style="font-size:.68rem;color:${muted};letter-spacing:.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.2rem;">Phone</div><div style="font-size:.92rem;font-weight:500;">${phone}</div></div>
      </a>` : ''}
      <div style="display:flex;align-items:flex-start;gap:1rem;padding:1.2rem;background:${bg2};border:1px solid ${border};border-radius:2px;">
        <span>📍</span>
        <div><div style="font-size:.68rem;color:${muted};letter-spacing:.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:.2rem;">Address</div><div style="font-size:.88rem;">${address}</div></div>
      </div>
      <a href="https://maps.google.com/?q=${encodeURIComponent(address)}" target="_blank" style="${btnPrimary(highlight)};text-align:center;margin-top:.5rem;">Get Directions →</a>
    </div>
  </section>`;
}

// ─── SHARED: NAV ─────────────────────────────────────────────────────────────
function navHTML(name, phone, copy, theme, links) {
  const isDark = theme === 'dark';
  const navBg = isDark ? 'rgba(13,13,13,0.95)' : 'rgba(250,250,248,0.95)';
  const textCol = isDark ? '#f5f2ed' : '#1a1a1a';
  const mutedCol = isDark ? '#888' : '#666';
  const border = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
  const primary = copy.color_primary || '#c94f1a';
  const highlight = copy.color_highlight || primary;

  return `
  <nav style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.2rem 2.5rem;background:${navBg};backdrop-filter:blur(10px);border-bottom:1px solid ${border};">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:.06em;color:${textCol};">${name}</div>
    <ul style="display:flex;gap:2rem;list-style:none;align-items:center;">
      ${links.map((l, i) => i === links.length - 1
        ? `<li><a href="#contact" style="background:${highlight};color:#fff;padding:.5rem 1.2rem;border-radius:2px;text-decoration:none;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;">${l}</a></li>`
        : `<li><a href="#${l.toLowerCase()}" style="color:${mutedCol};text-decoration:none;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;">${l}</a></li>`
      ).join('')}
    </ul>
  </nav>`;
}

// ─── SHARED: FOOTER ──────────────────────────────────────────────────────────
function footerHTML(name, address, phone, theme, primary) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#141414' : '#f0ede8';
  const text = isDark ? '#f5f2ed' : '#1a1a1a';
  const muted = isDark ? '#555' : '#aaa';
  const border = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';

  return `
  <footer style="background:${bg};border-top:1px solid ${border};padding:2rem 4rem;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:.06em;color:${text};">${name}</div>
    <div style="font-size:.72rem;color:${muted};font-family:'DM Mono',monospace;">${address}${phone ? ' · ' + phone : ''}</div>
    <div style="font-size:.62rem;color:${isDark ? '#2a2a2a' : '#ccc'};font-family:'DM Mono',monospace;">Site by Outpost Strategy</div>
  </footer>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractPlaceData(place) {
  return {
    name: place.displayName?.text || 'Local Business',
    phone: place.nationalPhoneNumber || '',
    address: place.formattedAddress || '',
    rating: place.rating || 5.0,
    reviewCount: place.userRatingCount || 0,
    reviews: (place.reviews || []).slice(0, 3),
    hours: place.regularOpeningHours?.weekdayDescriptions || []
  };
}

function cleanPhone(phone) {
  return phone.replace(/\D/g, '');
}

function formatHeadline(headline, color) {
  const lines = headline.split(/\\n|\n/);
  return lines.map((line, i) => i === 1 ? `<em style="color:${color};font-style:normal;">${line}</em>` : line).join('\n');
}

function btnPrimary(bg, color = '#fff') {
  return `background:${bg};color:${color};padding:.9rem 2rem;text-decoration:none;font-size:.82rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;border-radius:2px;transition:opacity .2s;display:inline-block;`;
}

function btnOutline() {
  return `border:1px solid rgba(255,255,255,.2);color:#f5f2ed;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;border-radius:2px;`;
}

function btnOutlineDark() {
  return `border:1px solid rgba(255,255,255,.3);color:#fff;padding:.9rem 2rem;text-decoration:none;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;border-radius:2px;`;
}

function baseHTML(name, theme, primary, accent, highlight, body) {
  const isDark = theme === 'dark';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${isDark ? '#0d0d0d' : '#fafaf8'}; color: ${isDark ? '#f5f2ed' : '#1a1a1a'}; font-family: 'DM Sans', sans-serif; font-weight: 300; overflow-x: hidden; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  @media (max-width: 768px) {
    nav ul { display: none !important; }
    section { padding: 4rem 1.5rem !important; }
    div[style*="grid-template-columns:repeat(3"] { grid-template-columns: 1fr !important; }
    div[style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; }
    div[style*="padding:8rem 4rem"] { padding: 7rem 1.5rem 3rem !important; }
    div[style*="padding:0 4rem 6rem"] { padding: 0 1.5rem 3rem !important; grid-template-columns: 1fr 1fr !important; }
    footer { flex-direction: column !important; gap: .8rem !important; text-align: center !important; padding: 1.5rem !important; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── MAIN ROUTE ──────────────────────────────────────────────────────────────
app.get('/demo', async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).send('Missing place_id. Usage: /demo?place_id=YOUR_PLACE_ID');

  try {
    console.log(`\n━━━ Building demo for: ${place_id}`);

    const place = await getPlaceDetails(place_id);
    console.log(`✓ Place: ${place.displayName?.text}`);

    const industry = detectIndustry(place);
    console.log(`✓ Industry: ${industry}`);

    const allPhotoUrls = (place.photos || []).slice(0, 6).map(p => getPhotoUrl(p.name, 1200));
    console.log(`✓ Photos: ${allPhotoUrls.length}`);

    const [photos, copy] = await Promise.all([
      classifyPhotos(allPhotoUrls, industry),
      generateCopy(place, industry)
    ]);
    console.log(`✓ Photos classified, copy generated`);

    const renderers = { trades: renderTrades, grooming: renderGrooming, wellness: renderWellness, food: renderFood, retail: renderRetail };
    const render = renderers[industry] || renderRetail;
    const html = render(place, copy, photos);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    console.log(`✓ Done — ${industry} template served`);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send(`<pre>Error: ${err.message}\n\n${err.stack}</pre>`);
  }
});

app.get('/', (req, res) => {
  res.send(`
    <style>body{font-family:monospace;padding:2rem;background:#0d0d0d;color:#f5f2ed;}</style>
    <h2>⬡ Outpost Demo Engine v2</h2>
    <p style="color:#888;margin-top:.5rem;">Auto-generates demo sites from Google Place IDs</p>
    <br>
    <p><strong>Usage:</strong> <code>/demo?place_id=GOOGLE_PLACE_ID</code></p>
    <br>
    <p style="color:#555;">Test businesses:</p>
    <ul style="color:#888;margin-top:.5rem;line-height:2;">
      <li><a href="/demo?place_id=ChIJj-aliA_PwoARI36KBu4KTcQ" style="color:#c94f1a;">TNT Auto Repair</a> → trades template</li>
      <li><a href="/demo?place_id=ChIJ9cAF4wyTwoAR_Jdg-iCVg-A" style="color:#c94f1a;">Adobe Design</a> → retail template</li>
    </ul>
    <br>
    <p style="color:#333;font-size:.8rem;">Industries: trades · grooming · wellness · food · fitness · retail</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Outpost Demo Engine v2 running on port ${PORT}`));
