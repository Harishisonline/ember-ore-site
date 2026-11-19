# Ember & Ore — build notes

## Brief
```
Business:       Ember & Ore, small-batch coffee roaster, Portland (OR). Hero product: 250 g bag of
                single-origin Ethiopian Guji, $22.
Primary action: Start the monthly bean subscription (secondary: buy one bag).
Proof we have:  None supplied. No reviews, years, press, photos, address. → nothing invented;
                the page sells with the product itself, honest specifics and clear terms.
3 adjectives:   warm, exact, unfussy
Signature:      The roast, in 3D. A kraft 250 g pouch sits in a drift of beans; scrolling the pinned
                hero takes the beans from green (raw "ore") through drying, browning and first crack
                to a light roast (the "ember"), while a roast curve draws itself and the bag turns
                to show its back. Drag to turn the bag yourself.
```

## Assumptions (user unavailable — all go on the Ask-the-client list)
- Subscription = one 250 g bag of the current Guji, $22 per delivery, every 4 weeks or every 2 weeks,
  skip/pause/cancel any time. Shipping cost not stated on the page ("shown at checkout").
- Roast level: light (Guji is commonly light-roasted). Ships within a few days of roasting.
- Tasting notes, process (washed / natural), elevation and washing station of THEIR lot are unknown.
  The page describes the Guji zone in general terms (southern Ethiopia, Oromia region, high
  elevation, known for floral and stone-fruit cups) and labels the lot specifics "printed on the bag".
- Grind options: whole bean, filter (pour-over/drip), espresso.
- No checkout exists yet: the subscribe form is front-end only and shows a confirmation note.
  Wire to Shopify Subscriptions / Stripe Checkout / Recharge.
- No phone, email, street address, hours or social handles → not shown; JSON-LD has city only.
- Roast temperatures shown are typical approximate bean temperatures, labelled "approx.".
- Builder credit per user rule: "Site by Harish" + LinkedIn / X / GitHub. Profile URLs are not yet
  filled in USER.md, so links point at the network roots — fill before sending.

## Tokens
| token | name | value | use |
|---|---|---|---|
| --kiln | Kiln | oklch(0.19 0.018 50) | hero + dark sections ground |
| --char | Char | oklch(0.26 0.03 45) | raised dark surface |
| --green-bean | Green bean | oklch(0.92 0.03 115) | light section ground (unroasted bean, not cream) |
| --roast | Roast | oklch(0.24 0.04 45) | ink on light |
| --husk | Husk | oklch(0.80 0.05 75) | ink on dark, kraft tone |
| --ember | Ember | oklch(0.70 0.17 50) | accent, CTAs only (≤10%) |

Type: Bricolage Grotesque (display, 500/700, optical sizing) + Instrument Sans (text 400/500/600).
Radius language: 999px on buttons/inputs (pouch-label roundness), 0 elsewhere.

## Wireframes
```
HERO (pinned 220% on desktop, 160% phone)
[nav: wordmark ............ Subscribe]
| H1 "Guji, roasted in Portland, at your door every month"   [3D pouch + beans]   |
| lede + [Start my subscription] [Buy one bag $22]           roast readout + curve|

THE BAG (light, split)
| giant "250 g"  |  specs as a definition list (origin, region, roast, size, price)

A MONTH OF IT (dark, horizontal timeline, genuine sequence)
 roast day → ships → arrives → brew it → next bag

SUBSCRIBE (light, the conversion section)
| terms in plain words | form: grind, cadence, email, zip  [Start my subscription] |

BREW IT (tight text column + ratio table)

FOOTER (Portland OR, credit)
mobile: sticky "Subscribe — $22 a bag" bar
```

## Principles
1. Ore → ember: every colour and motion is the roast (green bean ground, kiln dark, ember accent).
2. Specific over salesy: grams, ratios, cadence, price on the page; no invented praise.
3. One moment: the roast is the only big motion; everything else is still and quiet.

## Plan review against the tell list
- Dark ground + orange accent risks "near-black + vermilion". Mitigation: the dark is a warm
  brown kiln (not black), the accent is an amber ember used only on CTAs/glow, and the light
  sections use a green-bean ground taken from unroasted coffee — not cream.
- No ALL-CAPS eyebrows, no middle-dot meta strings, no mono micro-labels; numbers use tabular figures.
- The timeline numbering is a real sequence (days), allowed.
- 3D: the subject is the product (the 250 g pouch + beans), not a placeholder.

## Log
- Hero mode: `scene` (live Three.js). No image/video generation allowed, so `frames` was out; the
  product is an object, so a procedural pouch + instanced beans is the honest subject. Pouch label,
  kraft fibres and valve are drawn to canvas textures at runtime (no model files, ~0 KB of assets).
- R1: roast never advanced. IntersectionObserver reported the pinned hero as not intersecting, so the
  render loop was paused. Replaced with a scroll check against the ScrollTrigger end.
- R2: 230 beans buried the label; cut to 130 (70 phone), widened the orbit, and push beans that pass
  in front of the pouch up/down out of the label. Pouch made taller (1.36 x 2.25).
- R3: the ember point light washed everything orange at first crack; cut 18 → 4, emissive 0.35 → 0.12,
  darkened the first-crack bean colour. Final stage label threshold moved to 0.95 so scrub lag can't
  leave "first crack" showing at 205 °C.
- R4 (phone): pouch overlapped the CTA; shrank to 0.5 scale and moved it into the band between the
  links and the readout; readout became a single bottom row (stage left, ≈ temp right).
- R5: headline capped at 9.6svh so the laptop hero fits; drag hint moved into the readout block.
- R6: light nav was translucent over the form → solid; 250 g made sticky on desktop to fill the empty
  column; terms list lost its hairlines (too many ruled lists).
- Subtract: removed the glow on the first timeline dot.
- Poster + OG image are renders of this scene (Playwright screenshot of the end state), used for
  reduced motion / no-WebGL / link previews.
