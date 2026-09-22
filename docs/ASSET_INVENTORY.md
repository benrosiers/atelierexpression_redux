# Asset Inventory — Atelier Expression

Generated: 2026-06-17

## Update (this pass) — real logo + real photos now in use

- **Final logo shipped.** A real vector logo (`raw/logo_final_1024.svg`, sourced from
  `atelier-expression-logo-1024-download.svg`) now replaces `logo_temp_1024.png` everywhere
  (Header, Footer, favicon, Organization JSON-LD). `logo_temp_1024.png` is left in place
  unreferenced rather than deleted — see the repo-wide "don't delete without necessity" rule —
  but nothing points to it anymore.
- **Real (non-AI) Cindy photos added**, sourced from `raw/sesion_pre_00_solo/` (see
  `docs/MEDIA_INVENTORY.md` for full provenance): `cindy-invitation-energie.jpg`,
  `cindy-invitation-micro.jpg`, `cindy-invitation-portrait.jpg` (+ `.webp` pairs). These now
  occupy the highest-visibility placements: homepage hero collage, homepage photo mood strip,
  À propos secondary portrait, `/reserver` sidebar. Still important: **these are solo shots of
  Cindy, not group workshop photos** — no group session has happened yet.
- **OG image created.** `og-image.jpg` didn't exist before this pass despite being referenced
  in `site.ts` — social shares were broken. Now generated from the real logo + tagline.

## Raw Assets (E:/Omni/AtelierExpression/raw — DO NOT DELETE)

| File | Description | Status | Notes |
|------|-------------|--------|-------|
| `logo_final_1024.svg` | Real vector logo | ✅ In use | Replaces the temp PNG logo everywhere |
| `logo_temp_1024.png` | Abstract figure logo with rising colored dots | ⚠️ Unreferenced | Superseded by the real logo; left in place, not deleted |
| `cindy_00.png`–`cindy_08.png`, `cindy_group_*.png`, `cindy_studio_*.png` | AI-generated placeholder imagery | ⚠️ Still placeholders | Confirmed by direct visual inspection to be AI stock-style images, not real photos. Still used as decorative mood imagery on lower-scrutiny pages (see `MEDIA_INVENTORY.md`) |
| `sesion_pre_00_solo/` | Real photos/video of Cindy, solo, 2026-06-22 | ✅ Selected shots in use | See `docs/MEDIA_INVENTORY.md` and `docs/DEMO_WORKSHOP_RECAP_NOTES.md` |

## Deployed Assets (public/assets/images — copies, originals untouched)

| File | Used in | Usage |
|------|---------|-------|
| `logo.svg`, `logo-mark-192.png`, `logo-mark-512.png` | Header, Footer, favicon, Organization JSON-LD | Real logo mark |
| `cindy-invitation-energie.jpg/.webp` | Hero collage (primary), workshop-feature photo accent | Real photo — high energy |
| `cindy-invitation-micro.jpg/.webp` | Homepage mood strip (wide), Cindy Invitation section | Real photo — landscape |
| `cindy-invitation-portrait.jpg/.webp` | Hero collage (secondary), mood strip (narrow), À propos, `/reserver` | Real photo — calm portrait |
| `og-image.jpg` | Open Graph / Twitter card | Newly created — didn't exist before |

## Missing Assets — To Commission or Photograph

### High Priority

| Asset | Description | Where Used |
|-------|-------------|------------|
| Group laughter photo | 5–10 adults laughing together in a warm workshop space (from a **real** group workshop — none has happened yet) | Homepage hero, once available |
| Workshop in action | Group doing an exercise, hands visible, movement | /ateliers feature section |
| Circle of participants | Group seated in a circle, sharing | /a-propos, methodology section |

### Medium Priority

| Asset | Description | Where Used |
|-------|-------------|------------|
| Candid Cindy facilitating | Cindy laughing with a group, not posing | /a-propos (not hero) |
| Workshop venue photo | Warm, light-filled room | /ateliers, /reserver |
| OG social image | 1200×630px, "On rit. On joue. On s'exprime." | All social previews |

### Photo Direction (Photographer Brief)

**DO:**
- Groups of 5–10 adults
- Laughing, candid, movement
- Warm ambient light (natural or soft interior)
- Circular formations, hands, eye contact
- Diverse ages (30–60), inclusive
- Cindy as facilitator — laughing, interacting, NOT posing

**DON'T:**
- Solo portraits front-facing
- Dark dramatic lighting
- Studio backdrop
- Formal/corporate postures
- Revealing clothing
- Any seductive or pose-focused framing

## Placeholder Status

All image placements in the current site use the two Cindy photos as temporary placeholders.
The collage treatment (border-radius, overlapping layout, color shapes) makes them cohesive
until real workshop photography is available.

The system is designed so photos can be swapped by replacing files in `/public/assets/images/`.
