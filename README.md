# HelloSite Demo Engine

Generates live demo websites for local businesses from a single Google Place ID.

## How It Works

Pass any Google Place ID → get a fully built, real-looking demo site with:
- Real business photos from Google
- AI-generated custom copy (Claude)
- Real reviews, hours, phone, address
- Industry-matched template (trades, retail, grooming, wellness, food)
- Smart photo selection per template

## Usage

```
GET /demo?place_id=GOOGLE_PLACE_ID
```

## Test Place IDs

| Business | Place ID | Template |
|---|---|---|
| TNT Auto Repair | `ChIJj-aliA_PwoARI36KBu4KTcQ` | trades |
| Adobe Design (South Pas) | `ChIJ9cAF4wyTwoAR_Jdg-iCVg-A` | retail |
| Ivan Echo Park Barber | `ChIJofsOYmvHwoAR9rqWW_O0G58` | grooming |

## Environment Variables

Set these in Railway (never commit them):

```
GOOGLE_API_KEY=your_google_places_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Deploy to Railway

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select this repo
4. Add environment variables above
5. Add custom domain: `demo.gethellosite.com`
6. Done

## Local Dev

```bash
npm install
GOOGLE_API_KEY=xxx ANTHROPIC_API_KEY=xxx npm run dev
```

## Industry Templates

| Type | Google Types Detected |
|---|---|
| `trades` | car_repair, electrician, plumber, contractor |
| `grooming` | barber_shop, hair_salon, hair_care |
| `wellness` | nail_salon, spa, massage, beauty_salon |
| `food` | restaurant, cafe, bakery, bar |
| `fitness` | gym, yoga_studio, sports_club |
| `retail` | store, gift_shop, clothing_store (default) |
