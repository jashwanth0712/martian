# Voice Agent (ElevenLabs Conversational AI)

## Overview

Voice control for the Mars rover using ElevenLabs Conversational AI. Players speak natural language commands and the AI copilot translates them into burst movement sequences — fully voice-to-voice, no typing needed.

The agent speaks in radio/walkie-talkie style: "Copy that. Forward two clicks. Over."

## How It Works

```
Player holds mic → ElevenLabs STT → GPT-4.1 Mini parses command → calls execute_movement client tool
→ Client tool queues burst sequence on Player instance → Agent speaks confirmation
```

1. Player clicks the mic button (bottom-left corner) to connect the session
2. ElevenLabs opens a WebSocket session with STT + TTS; mic starts **muted**
3. Player **holds** the mic button or **holds M key** to unmute (push-to-talk)
4. Player says e.g. "Move forward 2 meters then turn right"
5. Player **releases** button/key — mic mutes again
6. The LLM parses this into `[{direction: "forward", count: 2}, {direction: "front_right", count: 1}]`
7. The `execute_movement` client tool runs in the browser, directly setting Player burst state
8. Each burst executes for 500ms with a 20ms buffer between bursts
9. The agent confirms: "Roger. Forward two, right one. Executing. Over."

## Push-to-Talk

The mic uses **push-to-talk** to prevent accidental audio pickup during gameplay.

- **First click/press**: Connects the ElevenLabs session (mic starts muted)
- **Hold button or hold M key**: Unmutes mic — status shows "LISTENING..."
- **Release**: Mutes mic — status shows "HOLD TO TALK (M)"
- **Mouse leave** also mutes (prevents stuck-open mic if cursor leaves button)
- Touch events supported for mobile (touchstart/touchend/touchcancel)

Implementation: Uses `conversation.setMicMuted(boolean)` from the ElevenLabs SDK (`@elevenlabs/client`). The mic is muted immediately after `Conversation.startSession()` completes.

## Setup

1. Get an ElevenLabs API key at https://elevenlabs.io
2. Create the agent:
   ```bash
   elevenlabs auth login
   elevenlabs agents push
   ```
3. Copy the agent ID from the output
4. Add to `.env`:
   ```
   VITE_ELEVENLABS_AGENT_ID=<your-agent-id>
   VITE_GAME_PUBLIC=1
   ELEVENLABS_API_KEY=<your-key>
   ```
5. Run `npm run dev`

## Agent Configuration

- **LLM**: GPT-4.1 Mini (fast parsing of movement commands)
- **Voice**: George (`JBFqnCBsd6RMkjVDRZzb`) — radio/walkie-talkie style
- **Config file**: `agent_configs/mars-rover-copilot.json`

## Client Tool: execute_movement

Defined in `VoiceAgent.js`, registered with the ElevenLabs session. Takes an array of steps:

| Parameter | Type | Description |
|-----------|------|-------------|
| `steps[].direction` | string | One of: forward, backward, front_right, front_left, back_left, back_right |
| `steps[].count` | integer (1-10) | Number of consecutive 500ms bursts |

Returns `{ success: true, bursts_executed: N }` to the agent for confirmation.

## Direction Mapping

| Voice Command | Direction | Burst Name | Accel | Steer |
|--------------|-----------|------------|-------|-------|
| "forward" | forward | burstForward | 1 | 0 |
| "backward" / "back up" | backward | burstBackward | -1 | 0 |
| "turn right" / "front right" | front_right | burstFrontRight | 1 | -1 |
| "turn left" / "front left" | front_left | burstFrontLeft | 1 | 1 |
| "back left" | back_left | burstBackLeft | -1 | 1 |
| "back right" | back_right | burstBackRight | -1 | -1 |

## Key Files

- `sources/Game/VoiceAgent.js` — Voice agent module, client tool, burst sequencing, UI
- `sources/index.js` — Initialization (when VITE_ELEVENLABS_AGENT_ID is set)
- `agent_configs/mars-rover-copilot.json` — ElevenLabs agent configuration
- `agents.json` — ElevenLabs CLI project manifest

## UI States

The mic button in the bottom-left corner shows:
- **Idle/Disconnected**: grey border, grey icon — click to connect
- **Connected (mic muted)**: orange border, label "HOLD TO TALK (M)"
- **Listening (mic open)**: pulsing orange glow, label "LISTENING..."
- **Speaking**: solid orange background, white icon, label "COPILOT SPEAKING"

## Important Notes

- Burst sequencing uses direct Player state manipulation (same as keyboard bursts)
- 520ms delay between bursts (500ms duration + 20ms buffer) ensures no overlap
- Max 10 bursts per step to prevent runaway commands
- The `waitForBurstClear` polling (50ms interval) handles edge cases where timing drifts
- Requires HTTPS in production (microphone access needs secure context)
- Push-to-talk uses `setMicMuted()` from the ElevenLabs SDK — the session stays open while mic toggles
- M key uses `keydown`/`keyup` with `!e.repeat` guard to prevent key-repeat from toggling rapidly
- The agent can still speak (TTS output) even when the player's mic is muted
