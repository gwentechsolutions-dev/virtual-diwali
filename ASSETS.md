# Asset inventory and attribution

Downloaded 4 November 2026. Models are reference assets, not claims of authentic Tamil attire. Original geometry and procedural audiovisual code were authored for this application.

| Local file | Source / attribution | License | Changes and role |
|---|---|---|---|
| `public/assets/female.glb` | [HVGirl — Babylon.js Assets contributors](https://github.com/BabylonJS/Assets/blob/master/meshes/HVGirl.glb) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), repository default | Renamed only; scaled/instantiated at runtime, independent experimental cloth overlay. Stylized female reference with Idle, Samba, Walking, WalkingBack. |
| `public/assets/male.glb` | [Xbot — Babylon.js Assets contributors](https://github.com/BabylonJS/Assets/blob/master/meshes/Xbot.glb) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), repository default | Renamed only; scaled/instantiated at runtime with separate overlay. Mannequin reference, not a realistic human. Includes idle/walk/run and pose clips. |
| `public/assets/asphalt-diffuse.jpg` | [Asphalt 02 — Poly Haven](https://polyhaven.com/a/asphalt_02) | [CC0](https://polyhaven.com/license) | Original 1K diffuse surface, tiled at runtime. |
| `public/assets/asphalt-normal.jpg` | Same Asphalt 02 asset | CC0 | Original OpenGL normal map. |
| `public/assets/asphalt-roughness.jpg` | Same Asphalt 02 asset | CC0 | Original roughness map. |
| `public/assets/plaster-diffuse.jpg` | [Plastered Wall 02 — Poly Haven](https://polyhaven.com/a/plastered_wall_02) | CC0 | Original 1K diffuse, tinted and tiled at runtime. |
| Original buildings, fixtures, kolam, cloth overlays, signs | This project | Original project code/art | Procedural architectural study; unsuitable as final realism assets. |
| Synthetic firework sounds | This project | Original project code | Deterministic synthesized noise, not licensed field recordings. |
| DM Sans | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/dmsans) | SIL Open Font License 1.1 | Loaded from Google Fonts; system fallback if unavailable. |
| Noto Sans Tamil | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/notosanstamil) | SIL Open Font License 1.1 | Loaded from Google Fonts; Nirmala UI/system fallback. |
| Lucide icons | [Lucide](https://github.com/lucide-icons/lucide/blob/main/LICENSE) | ISC | npm package; no icon assets resold separately. |

Babylon's license evidence is preserved at `public/assets/babylon-license.md`; the upstream [repository notice](https://github.com/BabylonJS/Assets/blob/master/README.md) specifies CC BY 4.0 except where an asset folder specifies otherwise. Attribution also appears in in-game Settings. Keep attribution and license links when redistributing these models.

**Powered by Poly Haven.** The public API was used during sourcing; the application makes no runtime API calls. See [API terms](https://github.com/Poly-Haven/Public-API/blob/main/ToS.md). No Fab purchase, scraped photo, AI-generated model substitute or paid avatar service is included.

No Soldier model is included in the final asset set: an initial candidate was replaced because model-specific license evidence was not established. Do not infer a model's license solely from a code library's MIT license.

## Updated male avatar

`public/assets/characters/indian_man_animated.glb` derives from **Indian Man In Dhoti** by **anandmohan662**, [original listing](https://sketchfab.com/3d-models/indian-man-in-dhoti-54b9e050d0d6424b848a04bec02a85d0), CC BY 4.0 as recorded in the source GLB metadata. Changes: garment fitting, rest-skeleton fitting, skin weights, authored Idle/Walk/Run/Wave clips and Blender export. It replaces Xbot in the current male loading path. The original Xbot remains bundled as an unused reference. Animation quality is still being refined.
