# Map / World Layout — Codebase Analysis

## Architecture Overview

The game is a 3D interactive world built with **Three.js (WebGPU)** and **RAPIER** physics. The world layout is **authored in Blender** and exported as multiple GLB files — there is no JSON map config. All object placements are encoded as transforms within GLB scene hierarchies.

---

## Asset Map

| Element | Format | Source File |
|---|---|---|
| Terrain heightmap + road/grass data | Pre-baked texture (PNG/KTX) | `static/terrain/terrain.png` |
| Terrain collision mesh | GLB geometry | `static/terrain/terrain.glb` |
| Named areas & interactives | GLB with embedded reference objects | `static/areas/areas.glb` |
| Roads + static scenery | GLB with embedded references | `static/scenery/scenery.glb` |
| Birch tree positions | References GLB | `static/birchTrees/birchTreesReferences.glb` |
| Oak tree positions | References GLB | `static/oakTrees/oakTreesReferences.glb` |
| Cherry tree positions | References GLB | `static/cherryTrees/cherryTreesReferences.glb` |
| Bush positions | References GLB | `static/bushes/bushesReferences.glb` |
| Flower positions | References GLB | `static/flowers/flowersReferences.glb` |
| Fence positions | References GLB | `static/fences/fencesReferences.glb` |
| Bench positions | References GLB | `static/benches/benchesReferences.glb` |
| Pole light positions | References GLB | `static/poleLights/poleLightsReferences.glb` |
| Lantern positions | References GLB | `static/lanterns/lanternsReferences.glb` |
| Player spawn points | GLB with named children | `static/respawns/respawnsReferences.glb` |
| Grass | Procedural (TSL shader, runtime) | Generated at runtime |
| 2D UI map image | Static WebP (day/night variants) | `static/ui/map/map-day.webp` / `map-night.webp` |
| 2D UI map pins | Hardcoded JS array | `sources/Game/Map.js` lines 43–56 |
| Terrain gradient colors | Hardcoded canvas gradient | `sources/Game/Terrain.js` lines 45–49 |

---

## Key Source Files

### World Entry Point
**`sources/Game/World/World.js`**

Builds the scene in two steps:
- **Step 0** (lines 49–53): Creates `Grid` (intro visual) and `Intro` (loading screen).
- **Step 1** (lines 54–81): Instantiates all visual/physical elements: `Floor`, `WaterSurface`, `Grass`, trees, `Bushes`, `Flowers`, `Bricks`, `Fences`, `Benches`, `Scenery`, `PoleLights`, `Lanterns`, particles, weather, and `Areas`.
- **Step 2** (lines 83–86): Creates `Whispers` after a tick delay.

### Terrain
**`sources/Game/Terrain.js`** and **`sources/Game/World/Floor.js`**

- **Size:** 192 world units, 128 subdivisions (`Terrain.js:13`).
- **Texture channels:**
  - `.r` = slab/road surface data
  - `.g` = grass presence (controls grass painting and shadows)
  - `.b` = elevation/water depth (used to displace floor mesh vertices vertically)
- **Physics heightfield:** Extracted from `terrain.glb` geometry → passed to RAPIER as `heightfield` collider (`Floor.js:120–153`).
- **Visual floor:** `THREE.PlaneGeometry` dynamically sized around the player; vertex shader displaces Y using `.b` channel (`Floor.js:84`).

### Named Areas (Zones)
**`sources/Game/World/Areas/Areas.js`** and **`sources/Game/World/Areas/Area.js`**

13 named areas: `achievements`, `altar`, `behindTheScene`, `bowling`, `career`, `circuit`, `cookie`, `lab`, `landing`, `projects`, `social`, `toilet`, `timeMachine`.

Each area in `areas.glb` has embedded **reference objects** (named `ref*` / `reference*`) that define:
- `zoneBounding`: cylinder for enter/leave events (`Area.js:74–102`)
- `zoneFrustum`: sphere for frustum culling — hides/shows meshes based on camera viewport (`Area.js:104–176`)

### Roads & Scenery
**`sources/Game/World/Scenery.js`**

- All static scenery comes from `static/scenery/scenery.glb`.
- Road mesh identified by `ref*road*` named object inside the GLB (`Scenery.js:51`).
- Procedural glitter sparkle shader added to road (`Scenery.js:57–86`).

### Vegetation (Trees, Bushes, etc.)
**`sources/Game/World/Trees.js`**, **`Fences.js`**, **`Bricks.js`**, **`Benches.js`**

All follow the same pattern:
- A `*References.glb` file contains one child object per placement; each child's `matrix` encodes position/rotation/scale.
- `Trees.js` (lines 52–65) iterates references and sets instance matrices on a `THREE.InstancedMesh`.
- Physics capsule colliders placed at each tree position (`Trees.js:102–119`).

### Respawn Points
**`sources/Game/Respawns.js`**

- All spawn locations come from `static/respawns/respawnsReferences.glb`.
- Each child is named `respawn<Name>` (e.g., `respawnLanding`); name is lowercased to become the key.
- No hardcoded position data — everything lives in the GLB.

### 2D UI Map
**`sources/Game/Map.js`**

- Renders `static/ui/map/map-day.webp` / `map-night.webp` as the map overlay.
- `worldToMap()` (lines 154–168): converts 3D world XZ → 2D UV by dividing by `terrain.size` (192) and offsetting by 0.5.
- 12 pins defined as a hardcoded array (lines 43–56) with `respawnName` (to look up 3D coordinates) and a manual `offset` for label positioning.

### Grass
**`sources/Game/World/Grass.js`**

Fully procedural — 280×280 = 78,400 blades:
- Random XZ scatter within a grid.
- TSL shader samples terrain `.g` to hide blades in non-grass areas (`Grass.js:126`).
- Perlin noise for height variation; wind offset; blades face camera.

---

## How to Change the Layout

### Option A — Full layout change (new terrain, new area positions)
1. Edit `resources/folio-2025.blend` in Blender.
2. Re-export: `terrain.glb`, `terrain.png`, `areas.glb`, `scenery.glb`, `respawnsReferences.glb`.
3. Replace the 2D UI map images (`map-day.webp`, `map-night.webp`).
4. Update pin positions/offsets in `sources/Game/Map.js:43–56`.

### Option B — Move/add/remove vegetation or props
1. Edit the corresponding `*References.glb` (positions are stored as object transforms).
2. No shader or JS changes needed.

### Option C — Add or relocate a named area
1. Edit `areas.glb` in Blender — each area is a named group with embedded `ref*` objects.
2. Update `respawnsReferences.glb` with the new spawn point.
3. Add/update the pin entry in `sources/Game/Map.js:43–56`.
4. If it's a new area type, create a new class in `sources/Game/World/Areas/` extending `Area.js`.

### Option D — Only change the 2D map overlay image
1. Replace `static/ui/map/map-day.webp` and `static/ui/map/map-night.webp`.
2. Adjust pin `offset` values in `sources/Game/Map.js:43–56` if pin positions shift.

---

## Blender Source
The master Blender file is at: `resources/folio-2025.blend`
