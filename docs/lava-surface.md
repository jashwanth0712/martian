# Lava Surface Implementation

## Overview
The lava surface replaces the original water system (`WaterSurface.js`). It uses the same mesh, geometry, and ripple/shore/ice infrastructure but with Mars-themed lava colors and effects.

## Color System (3 layers)
1. **Crust** (`0x1a0800`) — near-black cooled volcanic base
2. **Veins** (`0xd94000`) — orange-red flowing channels driven by `detailsMask()` (ripples + shore edges)
3. **Hotspots** (`0xff6a00` → `0xffaa22`) — bright orange/yellow blobs from slow-scrolling layered Perlin noise (`hotspotNode` + `glowNode`)

## Effects
- **Glow blobs**: Two Perlin noise layers multiplied together (`glowNode`), slowly drifting in opposite directions, create organic bright areas
- **Hotspots**: Single Perlin layer at low frequency for large-scale brightness variation
- **Lava sparkles** (`LavaSmoke.js`): 300 instanced `SpriteNodeMaterial` sprites with `AdditiveBlending`, same visual style as reactor fire sparkles (`0xff4400 * 6.0` emissive). Fixed world positions spread across 60-unit radius, terrain-gated to only appear over lava (`terrainData.b >= 0.17`). Rise 3 units over a 5-second cycle with fade-in/fade-out.

## Decisions & Learnings
- **Voronoi noise rejected**: Creates visible honeycomb/cell patterns — not organic enough for lava
- **Emissive `outputNode` override rejected**: Made lava too bright/washed, lost shadow detail
- **Large smoke particles rejected**: Billboard smoke cluttered the scene
- **Perlin multiplication works well**: Two Perlin layers at different frequencies multiplied together produce natural-looking irregular hotspot shapes
- **Sparkle positions must be fixed**: Tying particle positions to `focusPoint` (camera) made them slide with the vehicle. Using baked world-space positions in `instancedArray` keeps them anchored to the lava.

## Key Files
- `sources/Game/World/WaterSurface.js` — main lava surface shader and mesh
- `sources/Game/World/LavaSmoke.js` — lava sparkle particles (despite filename, now sparkles not smoke)
- `sources/Game/World/Areas/ReactorArea.js` — reference for sparkle visual pattern

## Updated: 2026-04-28
