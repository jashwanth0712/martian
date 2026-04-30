import { Conversation } from '@elevenlabs/client'

const BURST_MAP = {
    forward:     { name: 'burstForward',    accel:  1, steer:  0 },
    backward:    { name: 'burstBackward',   accel: -1, steer:  0 },
    front_right: { name: 'burstFrontRight', accel:  1, steer: -1 },
    front_left:  { name: 'burstFrontLeft',  accel:  1, steer:  1 },
    back_left:   { name: 'burstBackLeft',   accel: -1, steer:  1 },
    back_right:  { name: 'burstBackRight',  accel: -1, steer: -1 },
}

export class VoiceAgent
{
    constructor(game)
    {
        this.game = game
        this.conversation = null
        this.status = 'idle'
        this.micOpen = false

        this.createUI()
    }

    createUI()
    {
        const style = document.createElement('style')
        style.textContent = `@keyframes voice-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(255, 107, 53, 0); } }`
        document.head.appendChild(style)

        this.button = document.createElement('button')
        this.button.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
            <path d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.93V22H13V18.93C16.39 18.43 19 15.53 19 12H17Z" fill="currentColor"/>
        </svg>`

        Object.assign(this.button.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid #555',
            background: 'rgba(20, 15, 10, 0.85)',
            color: '#888',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(4px)',
        })

        this.button.addEventListener('mousedown', (e) => { e.preventDefault(); this.pushToTalk(true) })
        this.button.addEventListener('mouseup', () => this.pushToTalk(false))
        this.button.addEventListener('mouseleave', () => { if(this.micOpen) this.pushToTalk(false) })
        this.button.addEventListener('touchstart', (e) => { e.preventDefault(); this.pushToTalk(true) })
        this.button.addEventListener('touchend', () => this.pushToTalk(false))
        this.button.addEventListener('touchcancel', () => this.pushToTalk(false))

        document.addEventListener('keydown', (e) =>
        {
            if(e.code === 'KeyN' && !e.repeat) this.pushToTalk(true)
        })
        document.addEventListener('keyup', (e) =>
        {
            if(e.code === 'KeyN') this.pushToTalk(false)
        })

        document.body.appendChild(this.button)

        this.statusLabel = document.createElement('div')
        Object.assign(this.statusLabel.style, {
            position: 'fixed',
            bottom: '74px',
            left: '20px',
            color: '#ff6b35',
            fontSize: '11px',
            fontFamily: 'monospace',
            background: 'rgba(20, 15, 10, 0.85)',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'none',
            zIndex: '1000',
        })
        document.body.appendChild(this.statusLabel)
    }

    updateUI()
    {
        if(this.status === 'idle' || this.status === 'disconnected')
        {
            this.button.style.border = '2px solid #555'
            this.button.style.color = '#888'
            this.button.style.background = 'rgba(20, 15, 10, 0.85)'
            this.button.style.animation = ''
            this.statusLabel.style.display = 'none'
        }
        else if(this.status === 'listening')
        {
            this.button.style.border = '2px solid #ff6b35'
            this.button.style.color = '#ff6b35'
            this.button.style.background = 'rgba(20, 15, 10, 0.85)'
            this.button.style.animation = 'voice-pulse 1.5s ease-in-out infinite'
            this.statusLabel.textContent = 'LISTENING...'
            this.statusLabel.style.display = 'block'
        }
        else if(this.status === 'speaking')
        {
            this.button.style.border = '2px solid #ff6b35'
            this.button.style.color = '#fff'
            this.button.style.background = '#ff6b35'
            this.button.style.animation = ''
            this.statusLabel.textContent = 'COPILOT SPEAKING'
            this.statusLabel.style.display = 'block'
        }
        else if(this.status === 'connected')
        {
            this.button.style.border = '2px solid #ff6b35'
            this.button.style.color = '#ff6b35'
            this.button.style.background = 'rgba(20, 15, 10, 0.85)'
            this.button.style.animation = ''
            this.statusLabel.textContent = 'HOLD TO TALK (N)'
            this.statusLabel.style.display = 'block'
        }
    }

    async pushToTalk(pressed)
    {
        if(!this.conversation && pressed)
        {
            this._connectingFromPress = true
            await this.startSession()
            this._connectingFromPress = false
            return
        }

        if(!this.conversation) return

        this.micOpen = pressed
        this.conversation.setMicMuted(!pressed)

        if(pressed)
        {
            this.status = 'listening'
        }
        else if(this.status !== 'speaking')
        {
            this.status = 'connected'
        }
        this.updateUI()
    }

    async startSession()
    {
        const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID
        if(!agentId)
        {
            console.error('VoiceAgent: VITE_ELEVENLABS_AGENT_ID not set')
            return
        }

        try
        {
            await navigator.mediaDevices.getUserMedia({ audio: true })

            this.conversation = await Conversation.startSession({
                agentId,
                clientTools: {
                    execute_movement: async (params) =>
                    {
                        const result = await this.executeBurstSequence(params.steps)
                        return JSON.stringify(result)
                    },
                },
                onStatusChange: ({ status }) =>
                {
                    if(status === 'disconnected')
                    {
                        this.conversation = null
                        this.micOpen = false
                        this.status = 'disconnected'
                        this.updateUI()
                    }
                },
                onError: (error) =>
                {
                    console.error('VoiceAgent error:', error)
                },
                onModeChange: ({ mode }) =>
                {
                    if(mode === 'speaking')
                    {
                        this.status = 'speaking'
                        this.updateUI()
                    }
                    else if(mode === 'listening' && this.micOpen)
                    {
                        this.status = 'listening'
                        this.updateUI()
                    }
                    else if(mode === 'listening' && !this.micOpen)
                    {
                        this.status = 'connected'
                        this.updateUI()
                    }
                },
            })

            this.conversation.setMicMuted(true)
            this.micOpen = false
            this.status = 'connected'
            this.updateUI()
        }
        catch(error)
        {
            console.error('VoiceAgent: Failed to start session:', error)
            this.status = 'idle'
            this.updateUI()
        }
    }

    async executeBurstSequence(steps)
    {
        const player = this.game.player
        if(!player)
            return { success: false, error: 'No player' }

        let total = 0

        for(const step of steps)
        {
            const def = BURST_MAP[step.direction]
            if(!def) continue

            const count = Math.min(Math.max(step.count || 1, 1), 10)

            for(let i = 0; i < count; i++)
            {
                while(player.activeBurst !== null)
                    await new Promise(r => setTimeout(r, 50))

                player.activeBurst = def.name
                player.burstTimeLeft = player.burstDuration
                player._burstAccel = def.accel
                player._burstSteer = def.steer
                total++

                await new Promise(r => setTimeout(r, 520))
            }
        }

        return { success: true, bursts_executed: total }
    }

    async endSession()
    {
        if(this.conversation)
        {
            await this.conversation.endSession()
            this.conversation = null
        }
        this.micOpen = false
        this.status = 'idle'
        this.updateUI()
    }

    destroy()
    {
        this.endSession()
        if(this.button) this.button.remove()
        if(this.statusLabel) this.statusLabel.remove()
    }
}
