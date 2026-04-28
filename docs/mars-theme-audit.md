# Mars Theme Audit — World Elements

Status of all visual/environmental elements in `sources/Game/World/World.js`.

---

## DISABLED (commented out)

These have been removed from the scene as part of the Mars conversion.

| Element | Class | Reason |
|---|---|---|
| waterSurface | `WaterSurface` | **CONVERTED → Lava surface** (re-enabled, color/speed changed) |
| grass | `Grass` | **CONVERTED → Martian pebbles** (re-enabled, reshaped/recolored) |
| leaves | `Leaves` | Requires trees/plant life — Earth-only |
| rain | `RainLines` | Liquid rain does not occur on Mars |
| bushes | `Bushes` | Green vegetation — Earth-specific |
| birchTrees | `Trees` | Earth vegetation |
| oakTrees | `Trees` | Earth vegetation |
| cherryTrees | `Trees` | Earth vegetation |
| flowers | `Flowers` | Earth vegetation |
| bricks | `Bricks` | Earth urban prop |
| benches | `Benches` | Earth urban furniture |
| bowling | `BowlingArea` | Earth recreation — removed from Areas.js, Map.js, achievements (2026-04-28) |
| social | `SocialArea` | Social media statues/links — Earth-specific; disabled in Areas.js, Game.js, Map.js (2026-04-28) |

---

## KEEP (already Mars-compatible)

No changes needed.

| Element | Class | Reason |
|---|---|---|
| floor | `Floor` | Warm sandy/rocky palette already looks Martian |
| windLines | `WindLines` | Mars has dust-laden wind — fits perfectly |
| visualTornado | `VisualTornado` | Already red-tinted; Mars is famous for dust devils |
| fireballs | `Fireballs` | Explosion FX, physics-neutral |
| visualVehicle | `VisualVehicle` | Already designed as a Mars rover |
| grid | `Grid` | Abstract UI overlay, environment-neutral |
| intro | `Intro` | UI/UX mechanic, environment-neutral |

---

## MODIFY (pending — mechanics valid, need re-skinning)

These are still active in the scene. Theming work needed.

| Element | Class | What to change |
|---|---|---|
| confetti | `Confetti` | Recolor to rust/orange tones → "dust burst" |
| lightnings | `Lightnings` | Mars has electrostatic discharge in dust storms; replace thunder sounds |
| snow | `Snow` | Reframe as CO2 frost / Martian ice deposits |
| fences | `Fences` | Likely Earth-rural style — swap model for sci-fi/metal barriers |
| explosiveCrates | `ExplosiveCrates` | Replace wooden crates with pressurized tanks/fuel containers |
| poleLights | `PoleLights` | Fireflies disabled; lamp poles kept as Mars base lighting ✓ |
| lanterns | `Lanterns` | Replace with industrial indicator lights or warning beacons |
| scenery | `Scenery` | Road shader is fine; 3D prop models need auditing |
| areas | `Areas` | Rename zones (toilet → habitat, landing pad, etc.) — bowling, social & projects removed; projects replaced with Reactor |
| whispers | `Whispers` | Replace flame beacon + country flags with comm beacon / colony ID |

---

## Notes

- `windLines` could be tinted reddish/dusty for extra Martian atmosphere
- `snow` system can double as CO2 frost without major code changes
- `lightnings` electrostatic discharge is scientifically valid on Mars (dust storm static)
- Audit performed: 2026-04-26
- Updated: 2026-04-28 — bowling area removed, pole light fireflies disabled, social area disabled
- Updated: 2026-04-28 — Projects area replaced with Reactor (programmatic glowing reactor core, rotating rings, sparks, struts). Old GLB visuals hidden, physics disabled, new cylinder collider added. Achievement replaced with "Power Up". Future PR: Among Us-style interactive task.
