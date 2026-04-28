# Burst Controls System

## Overview

All ASDF/ZX keys use a **500ms burst** model: a single press triggers the action for exactly 500ms, then it stops. The player must release and re-press for another burst. Bursts are non-interruptible — no other burst can start during an active one.

Arrow keys and gamepad remain as traditional hold-to-move controls.

## Key Mapping

| Key | Action | Burst Params |
|-----|--------|-------------|
| A | Forward | accel: 1, steer: 0 |
| S | Backward | accel: -1, steer: 0 |
| D | Front-right | accel: 1, steer: -1 |
| F | Front-left | accel: 1, steer: 1 |
| Z | Back-left | accel: -1, steer: 1 |
| X | Back-right | accel: -1, steer: -1 |

## Architecture

### Burst State (Player.js constructor)

- `activeBurst` — `null` or the burst action name (lock field, prevents re-triggering)
- `burstTimeLeft` — seconds remaining (decremented with `ticker.delta`, not `deltaScaled`)
- `burstDuration` — constant `0.5` (500ms)
- `_burstAccel` / `_burstSteer` — cached direction values for the active burst

### Control Flow

1. Burst actions are registered via `addActions()` in `Player.setInputs()` (e.g. `burstForward`, `burstFrontRight`, etc.)
2. The existing `Inputs.start()` toggle guard suppresses browser key-repeat automatically
3. Event listeners in `setInputs()` set `activeBurst` + direction on first press
4. At the **end** of `Player.updatePrePhysics()`, the burst block overrides `accelerating` and `steering` — this ensures bursts take priority over any hold-key or nipple input
5. When `burstTimeLeft` reaches 0, state resets and accelerating/steering are zeroed

### Countdown UI (VisualVehicle.js)

- A `<div>` element created in `setScreenPosition()`, appended to `game.domElement`
- Positioned each frame using the existing `screenPosition` projection (chassis world pos → screen coords)
- Shows remaining ms (e.g. `"342ms"`) in orange text with dark background
- Hidden when no burst is active
- Cleaned up in `destroy()`

## Key Files

- `sources/Game/Player.js` — burst state, event listeners, physics override in `updatePrePhysics()`
- `sources/Game/World/VisualVehicle.js` — countdown DOM element creation and per-frame positioning
- `sources/Game/Inputs/Inputs.js` — action system (unchanged, but important for understanding toggle guard)

## Important Notes

- **Use `ticker.delta` not `ticker.deltaScaled`** for burst countdown — the game has `ticker.scale = 2`, so `deltaScaled` would make 500ms feel like 250ms wall-clock
- **Steering sign convention**: negative steering = right turn, positive = left turn (matches existing `right.active → steering -= 1` pattern)
- **KeyF was removed from `interact` action** — interact now uses Enter/E/Gamepad.cross only
- **KeyA was removed from `left`, KeyS stays on `backward`** (arrow keys still provide hold-to-move forward/backward/left/right)
