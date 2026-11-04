# Delivery status — 4 November 2026

**Playable technical vertical slice; Milestone A is not complete.** The original brief remains the acceptance criteria. This file deliberately records deviations rather than implying they are resolved.

## Free public multiplayer deployment

Vercel now connects to the user-created free Render backend at `https://virtual-diwali.onrender.com`. On 4 November 2026, two isolated Chrome sessions on the public Vercel site passed create/join, chat, firework launch, shared finale, photo download and reload/rejoin without mocks. All fifteen domain tests and TypeScript checks pass. The Render blueprint uses only a Free instance without a disk. Local room state is lost when the backend sleeps, restarts or redeploys; waking after idle can take about a minute. See docs/VERCEL.md for repeatable checks. This supersedes older public-deployment blockers below; sustained load, WAN voice and the remaining feature/art acceptance are still open.

## Published character update

Development and production now load the same bundled male and female GLBs. The supplied female saree character has replaced HVGirl; the old cylindrical dress overlay and development-only model route are removed. Her source provenance is recorded separately in ASSETS.md and remains unverified. Male has five draft clips and female eleven; final animation quality, garment contact and the full original brief remain unfinished. The requirements audit tracks remaining acceptance work.

## Earlier character integration notes (superseded above)

Latest local review: female hair topology restored and duplicate positions welded; browser preview no longer shows the spotted scalp. The local Vite build loads this supplied female draft, while production retains its fallback pending provenance. Male geometry and rest skeleton were widened together. Eighteen fireworks now include short sampled trails and seeded drifting smoke. Three browser tests pass, including repeated creation/disposal of 72 effects; production build passes. These updates supersede older eight-kind and reference-character descriptions below; the requirements audit remains authoritative for unfinished scope.

The male avatar now loads the supplied CC BY 4.0 Indian Man In Dhoti model after Blender garment fitting, skeleton fitting and weight repairs. Four authored clips are included; shoulder deformation and gait still need polish. Male wardrobe colors tint the actual shirt material instead of the old procedural skirt. The female working model now has a 19-bone rig and eleven draft clips, but remains outside the public game pending visual refinement and provenance verification. This supersedes older references below to Xbot as the active male character.

The multiplayer browser test now selects the new male avatar; create/join, chat, launch, finale and reconnect passed after restarting a stopped local server. These checks establish integration, not final animation quality.

| Area | Current delivery | Remaining acceptance work |
|---|---|---|
| Rooms | Create/join, 10-character random codes, 2–12 slots, host controls, reconnect, persistence | Public deployment, WAN testing, formal abuse testing |
| World | Explorable original Chennai-inspired block with Tamil signs, balconies, lamps, kolam, shops and utility wires | Replace procedural buildings/props with licensed detailed production models; add vehicles, authentic photo-reference pass, interiors and collision polish |
| Avatars | Two licensed rigged reference models, idle/walk clips, female Samba clip, preview and shared appearance | Realistic male/female Tamil characters with hair, face detail, jewelry and fitted clothes; Xbot is a mannequin and HVGirl is stylized |
| Clothes | Ownership, preview/revert, purchases, palette changes, persistence | Proper skinned garment meshes, saree drape/pallu, clipping prevention, full catalogue, physical NPC demonstration |
| Selfies | Optional path omitted; entry works without photos | UV-compatible head assets, landmark detection, consent, private processing, preview/reset/deletion, reconstruction provider if needed |
| Fireworks | Eight kinds, seeded timing, authoritative outcomes, placement, finite stock, particle trajectories, light objects and synthetic spatial audio | Rich smoke/trails, production sound recordings, mesh props, stronger light selection, physically plausible ignition clips and full 13-category catalogue |
| Synchronization | Server movement, appearance, gestures, economy, events and finale | Client prediction/reconciliation, packet-loss and long-latency endurance |
| Social | Room text chat and five gesture selections | Complete matching skeletal clips, individual mute, active speakers and LiveKit voice |
| Photo booth | Local canvas screenshot, clean UI capture | Group camera staging, poses and festive frame |
| Graphics | Shadows, PBR asphalt with normal/roughness maps, plaster texture, glow, fog, low/medium/high particle/resolution presets | Compressed textures, geometry LOD, proper asset streaming, adaptive resolution, baked lighting, measured mobile optimization |
| Privacy | No photo collection; private guest token hashed server-side; inventory sent only to owner | Security audit, managed backup retention, formal production privacy review |

## Asset blockers

The verified sources used in this build did not yield a production-ready, compatible set of Chennai environment assets, realistic Indian human bodies, rigged sarees/veshtis and NPC cloth demonstrations. No paid assets were purchased and no unlicensed models were substituted. General reference rigs are explicitly marked as such. Their existence does not satisfy the realism requirement.

To complete the art milestone, procure or commission redistributable web-game assets with source license evidence: two natural-proportion human rigs, UV-mapped heads, matching skinned traditional clothing, required gesture/interaction clips, a compact Chennai street kit, two shop interior kits and cloth demonstration clips. Web-delivered GLBs must be covered by the license, not merely offline-render rights. Confirm topology, scale and animation compatibility before integration.

## Next implementation order

1. Replace reference character and garment assets, preserving the current authoritative appearance IDs and wardrobe flow.
2. Replace procedural street/shops with approved optimized GLBs and collision proxies.
3. Add validated local face processing only after the target head UV and morph contract exists. Keep source photographs off the network by default.
4. Add NPC greeting, hand-over and pre-animated cloth demonstration clips.
5. Finish smoke/audio and animation blending, profile real desktop/mobile devices and test eight rendered clients.
6. Deploy under HTTPS/WSS, verify WAN recovery and host controls, then extend voice and social features.
