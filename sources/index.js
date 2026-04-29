import './threejs-override.js'
import { Game } from './Game/Game.js'
import { VoiceAgent } from './Game/VoiceAgent.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

if(import.meta.env.VITE_GAME_PUBLIC)
{
    window.game = new Game()
    if(import.meta.env.VITE_ELEVENLABS_AGENT_ID)
        window.voiceAgent = new VoiceAgent(window.game)
}
else
{
    const game = new Game()
    if(import.meta.env.VITE_ELEVENLABS_AGENT_ID)
        new VoiceAgent(game)
}