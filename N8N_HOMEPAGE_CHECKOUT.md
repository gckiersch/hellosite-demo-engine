# n8n — Home-page checkout handoff

## What changed

The Stripe Embedded Checkout now runs in two places:

1. **`demo.gethellosite.com/secure/:placeId`** — existing flow, driven by a known Google Place ID. The Stripe session is tagged with `client_reference_id = place_id`. n8n matches an **existing** Airtable lead by `place_id`.

2. **`gethellosite.com` (home page pricing cards)** — new flow, no `place_id` yet. Buyer enters Business name + City + Email in a mini form before paying. The Stripe session has **no `client_reference_id`**; instead `session.metadata` carries `business_name`, `city`, `email`, `plan`, `cadence`, and `source: 'home-page'`. n8n must **create a new** Airtable lead from this metadata.

Both flows fire the same `checkout.session.completed` webhook. The difference is in how we match / create the lead.

---

## What you need to do in n8n

Open the **HelloSite Fulfillment** workflow in your kidskamp instance. Add one branching step right after the Stripe webhook trigger, and create a new path for `source === 'home-page'`.

### Step-by-step

1. **Open the workflow** that's subscribed to the Stripe webhook. The trigger node's path is `https://kidskamp.app.n8n.cloud/webhook/stripe-payment` (production URL).

2. **Add an `IF` node right after the trigger.** It should split by payment source:
   - Condition: `{{ $json.body.data.object.metadata.source }}` equals `"home-page"`
   - `true` → goes to the new home-page branch (details below)
   - `false` (or missing) → goes to the existing place_id-match branch

3. **Build the home-page branch** — two nodes:

   **Node A: Airtable → Create record**
   - Base: `appU6O0NHhOrbiZNT`
   - Table: `Leads`
   - Fields to set (map from the Stripe event metadata):
     | Airtable field | Value (n8n expression) |
     |---|---|
     | Business Name | `{{ $json.body.data.object.metadata.business_name }}` |
     | City | `{{ $json.body.data.object.metadata.city }}` |
     | Email | `{{ $json.body.data.object.metadata.email }}` or `{{ $json.body.data.object.customer_details.email }}` |
     | Tier | `{{ $json.body.data.object.metadata.plan }}` → "Starter" / "Executive" (capitalize if needed) |
     | Billing Cadence | `{{ $json.body.data.object.metadata.cadence }}` → "Monthly" / "Annual" |
     | Status | `"Converted"` (fixed) |
     | Source | `"Home Page Self-Serve"` (fixed) |
     | Stripe Session ID | `{{ $json.body.data.object.id }}` |
     | Payment Date | `{{ $now }}` (or parse from the Stripe event timestamp) |

   **Node B: reuse the existing "Send onboarding email" step** from the other branch. The onboarding email with the Tally form link (`tally.so/r/D4Dr0q`) should fire identically — same domain options email, same Tally.

4. **Merge the branches back** after both "Send onboarding email" nodes, or let them dead-end independently since they don't need to converge.

5. **Activate** the workflow (top-right toggle on the canvas).

### What the webhook payload looks like

When a home-page checkout completes, the `checkout.session.completed` event body will include:

```json
{
  "data": {
    "object": {
      "id": "cs_live_...",
      "mode": "subscription",
      "payment_status": "paid",
      "customer_details": {
        "email": "buyer@example.com",
        "name": "Buyer Name"
      },
      "metadata": {
        "business_name": "Acme Auto Repair",
        "city": "East LA",
        "email": "buyer@example.com",
        "plan": "starter",
        "cadence": "monthly",
        "source": "home-page"
      },
      "client_reference_id": null
    }
  }
}
```

When it's a demo-page checkout, it looks like this instead:

```json
{
  "data": {
    "object": {
      "id": "cs_live_...",
      "client_reference_id": "ChIJPcp7akqj6IgREF5cfZ95yIc",
      "metadata": {
        "place_id": "ChIJPcp7akqj6IgREF5cfZ95yIc",
        "plan": "executive",
        "cadence": "annual",
        "source": "demo-page"
      }
    }
  }
}
```

The `metadata.source` field is the reliable discriminator.

---

## Testing

1. After deploying + setting the Vercel env var (see main handoff), open `gethellosite.com` on your phone.
2. Click "Secure my site →" on Starter.
3. Enter a test business (e.g. "Test Co", "Austin TX", your own email).
4. Pay with Stripe test card `4242 4242 4242 4242` if you've temporarily swapped to test keys — or with a real card if you want to fully test-fire n8n.
5. Watch n8n's Executions tab to confirm the workflow picked up the event and took the new branch.
6. Check Airtable — a new Lead record should exist with Status = "Converted".
7. Check your inbox — onboarding email with Tally link should arrive.

---

## Follow-up enhancement ideas (not needed for MVP)

- Add a Google Places lookup node between "Create Airtable Lead" and "Send onboarding email" so the new lead gets a `place_id` automatically (helpful for the downstream demo-rebuild flow that uses place_id).
- Send a Slack notification to Cam when a home-page sale closes so he knows there's a new manual domain purchase needed.
- Add basic validation to the webhook branch to reject events where required metadata is missing (defensive).

---

Once this n8n branch is in place, the home-page embedded checkout is fully wired end-to-end.
