import * as THREE from 'three/webgpu'
import { color, float, Fn, instancedArray, mix, sin, smoothstep, step, texture, uniform, uv, vec3, vec4 } from 'three/tsl'
import { Inputs } from '../../Inputs/Inputs.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { Area } from './Area.js'
import gsap from 'gsap'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

export class LandingArea extends Area
{
    constructor(model)
    {
        super(model)

        this.localTime = uniform(0)
        this.solarPanels = []
        this.dustMotes = []

        this.setLetters()
        this.setKiosk()
        this.hideSword()
        this.setControls()
        this.setBonfire()
        this.setAchievement()
    }

    setLetters()
    {
        const references = this.references.items.get('letters')

        for(const reference of references)
        {
            const physical = reference.userData.object.physical
            physical.colliders[0].setActiveEvents(this.game.RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
            physical.colliders[0].setContactForceEventThreshold(5)
            physical.onCollision = (force, position) =>
            {
                this.game.audio.groups.get('hitBrick').playRandomNext(force, position)
            }
        }
    }

    setKiosk()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('kioskInteractivePoint')[0].position,
            'Map',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('map')
                // interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // this.game.map.items.get('map').events.on('close', () =>
        // {
        //     interactivePoint.show()
        // })
    }

    hideSword()
    {
        for(const object of this.objects.items)
        {
            if(object.visual?.object3D.name === 'sword')
            {
                object.visual.object3D.visible = false
                if(object.physical)
                    object.physical.body.setEnabled(false)
                break
            }
        }
    }

    setControls()
    {
        const controlsPos = this.references.items.get('controlsInteractivePoint')[0].position

        // Hide GLB objects near controls point
        const hideRadius = 4
        for(const object of this.objects.items)
        {
            if(object.visual)
            {
                const dist = object.visual.object3D.position.distanceTo(controlsPos)
                if(dist < hideRadius)
                {
                    object.visual.object3D.visible = false
                    if(object.physical)
                        object.physical.body.setEnabled(false)
                    const idx = this.objects.hideable.indexOf(object.visual.object3D)
                    if(idx !== -1)
                        this.objects.hideable.splice(idx, 1)
                }
            }
        }

        // Station center
        this.stationCenter = controlsPos.clone()
        this.stationCenter.y = 0

        // Build Research Station
        this.setDome()
        this.setSolarPanelsArray()
        this.setAntennaMast()
        this.setStationGroundRing()
        this.setDustMoteParticles()
        this.setStationCollider()

        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            controlsPos,
            'Controls',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.menu.open('controls')
                interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // Menu instance
        const menuInstance = this.game.menu.items.get('controls')

        menuInstance.events.on('close', () =>
        {
            interactivePoint.show()
        })

        menuInstance.events.on('open', () =>
        {
            if(this.game.inputs.mode === Inputs.MODE_GAMEPAD)
                menuInstance.tabs.goTo('gamepad')
            else if(this.game.inputs.mode === Inputs.MODE_MOUSEKEYBOARD)
                menuInstance.tabs.goTo('mouse-keyboard')
            else if(this.game.inputs.mode === Inputs.MODE_TOUCH)
                menuInstance.tabs.goTo('touch')
        })
    }

    setDome()
    {
        const c = this.stationCenter

        // Foundation pad
        const padGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.4, 32)
        const padMaterial = new MeshDefaultMaterial({ colorNode: color('#2c2c2c'), hasWater: false })
        const pad = new THREE.Mesh(padGeometry, padMaterial)
        pad.position.set(c.x, 0.2, c.z)
        this.game.scene.add(pad)
        this.objects.hideable.push(pad)

        // Dome shell (half-sphere)
        const domeGeometry = new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)
        const domeMaterial = new MeshDefaultMaterial({ colorNode: color('#4a4a4a'), hasWater: false })
        const dome = new THREE.Mesh(domeGeometry, domeMaterial)
        dome.position.set(c.x, 0.4, c.z)
        this.game.scene.add(dome)
        this.objects.hideable.push(dome)

        // Wireframe overlay
        const wireGeometry = new THREE.SphereGeometry(2.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)
        const wireMaterial = new THREE.MeshBasicNodeMaterial({ wireframe: true, transparent: true })
        wireMaterial.outputNode = Fn(() =>
        {
            return vec4(vec3(0.6, 0.65, 0.7), float(0.4))
        })()
        const wireframe = new THREE.Mesh(wireGeometry, wireMaterial)
        wireframe.position.set(c.x, 0.4, c.z)
        this.game.scene.add(wireframe)
        this.objects.hideable.push(wireframe)

        // Airlock door
        const doorGeometry = new THREE.BoxGeometry(0.8, 1.4, 0.3)
        const doorMaterial = new MeshDefaultMaterial({ colorNode: color('#3a3a3a'), hasWater: false })
        const door = new THREE.Mesh(doorGeometry, doorMaterial)
        door.position.set(c.x, 0.4 + 0.7, c.z + 2.1)
        this.game.scene.add(door)
        this.objects.hideable.push(door)

        // Door emissive strip
        const stripGeometry = new THREE.PlaneGeometry(0.6, 0.08)
        const stripMaterial = new THREE.MeshBasicNodeMaterial()
        this.doorStripPulse = uniform(1.0)
        stripMaterial.outputNode = Fn(() =>
        {
            const emissive = vec3(0.0, 0.8, 1.0).mul(4.0).mul(this.doorStripPulse)
            return vec4(emissive, float(1))
        })()
        const strip = new THREE.Mesh(stripGeometry, stripMaterial)
        strip.position.set(c.x, 0.4 + 1.2, c.z + 2.26)
        this.game.scene.add(strip)
        this.objects.hideable.push(strip)

        // Interior glow
        const glowGeometry = new THREE.SphereGeometry(2.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)
        const glowMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide })
        this.domeGlowPulse = uniform(0.5)
        glowMaterial.outputNode = Fn(() =>
        {
            const warmColor = vec3(1.0, 0.53, 0.27).mul(2.0).mul(this.domeGlowPulse)
            return vec4(warmColor, this.domeGlowPulse.mul(0.3))
        })()
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        glow.position.set(c.x, 0.4, c.z)
        this.game.scene.add(glow)
        this.objects.hideable.push(glow)

        // Dome rim LEDs
        this.domeLedPulse = uniform(1.0)
        const ledColor = uniform(color('#00ccff'))
        const ledEmissive = uniform(4.0)

        const ledMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false })
        ledMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()
            const fade = smoothstep(float(0.5), float(0.05), dist)
            const emissive = ledColor.mul(ledEmissive).mul(this.domeLedPulse)
            return vec4(emissive, fade)
        })()

        const ledGeometry = new THREE.PlaneGeometry(0.12, 0.12)
        for(let i = 0; i < 4; i++)
        {
            const angle = (i / 4) * Math.PI * 2
            const led = new THREE.Mesh(ledGeometry, ledMaterial)
            led.position.set(
                c.x + Math.cos(angle) * 2.25,
                0.7,
                c.z + Math.sin(angle) * 2.25
            )
            this.game.scene.add(led)
            this.objects.hideable.push(led)
        }
    }

    setSolarPanelsArray()
    {
        const c = this.stationCenter
        this.solarPanels = []

        // Panel surface material with glint
        const panelMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
        panelMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv()
            const baseColor = vec3(0.1, 0.1, 0.23)
            const sweep = sin(baseUv.y.mul(Math.PI * 4).add(this.game.ticker.elapsedScaledUniform.mul(0.3)))
            const glint = sweep.remapClamp(-0.95, 1.0, 0.0, 1.0).mul(0.15)
            const glintColor = vec3(0.3, 0.4, 0.8)
            const finalColor = mix(baseColor, glintColor, glint)
            return vec4(finalColor, float(1))
        })()

        const frameMaterial = new MeshDefaultMaterial({ colorNode: color('#5a5a5a'), hasWater: false })
        const mastMaterial = new MeshDefaultMaterial({ colorNode: color('#6a6a6a'), hasWater: false })
        const baseMaterial = new MeshDefaultMaterial({ colorNode: color('#4a4a4a'), hasWater: false })

        const panelPositions = [
            { x: -3.5, z: -1.5 },
            { x: -3.5, z: 1.5 },
            { x: 3.5, z: -1.5 },
            { x: 3.5, z: 1.5 },
        ]

        for(const pos of panelPositions)
        {
            const group = new THREE.Group()
            group.position.set(c.x + pos.x, 0, c.z + pos.z)

            // Mast
            const mastGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8)
            mastGeometry.translate(0, 0.75, 0)
            const mast = new THREE.Mesh(mastGeometry, mastMaterial)
            group.add(mast)

            // Base plate
            const baseGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.4)
            const base = new THREE.Mesh(baseGeometry, baseMaterial)
            base.position.y = 0.05
            group.add(base)

            // Panel pivot (tilts for sun tracking)
            const pivot = new THREE.Group()
            pivot.position.y = 1.5
            pivot.rotation.x = -0.3
            group.add(pivot)

            // Solar panel surface
            const panelGeom = new THREE.BoxGeometry(1.8, 0.05, 1.2)
            const panel = new THREE.Mesh(panelGeom, panelMaterial)
            pivot.add(panel)

            // Panel frame border
            const frameGeom = new THREE.BoxGeometry(1.9, 0.08, 1.3)
            const frame = new THREE.Mesh(frameGeom, frameMaterial)
            frame.position.y = -0.02
            pivot.add(frame)

            this.game.scene.add(group)
            this.objects.hideable.push(group)
            this.solarPanels.push(pivot)
        }
    }

    setAntennaMast()
    {
        const c = this.stationCenter

        // Mast on top of dome
        const mastGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8)
        mastGeometry.translate(0, 0.75, 0)
        const mastMaterial = new MeshDefaultMaterial({ colorNode: color('#7a7a7a'), hasWater: false })
        const mast = new THREE.Mesh(mastGeometry, mastMaterial)
        mast.position.set(c.x, 0.4 + 2.2, c.z)
        this.game.scene.add(mast)
        this.objects.hideable.push(mast)

        // Cross-bar
        const crossGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6)
        crossGeometry.rotateZ(Math.PI * 0.5)
        const crossMaterial = new MeshDefaultMaterial({ colorNode: color('#6a6a6a'), hasWater: false })
        const crossbar = new THREE.Mesh(crossGeometry, crossMaterial)
        crossbar.position.set(c.x, 0.4 + 2.2 + 1.3, c.z)
        this.game.scene.add(crossbar)
        this.objects.hideable.push(crossbar)

        // Beacon LED
        this.beaconPulse = uniform(1.0)
        const beaconMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false })
        beaconMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()
            const fade = smoothstep(float(0.5), float(0.05), dist)
            const emissive = vec3(1.0, 0.13, 0.0).mul(5.0).mul(this.beaconPulse)
            return vec4(emissive, fade)
        })()

        const beaconGeometry = new THREE.PlaneGeometry(0.15, 0.15)
        const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial)
        beacon.position.set(c.x, 0.4 + 2.2 + 1.5, c.z)
        this.game.scene.add(beacon)
        this.objects.hideable.push(beacon)
    }

    setStationGroundRing()
    {
        const c = this.stationCenter

        const ringGeometry = new THREE.RingGeometry(3.5, 4.0, 64)
        const ringMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        ringMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length().mul(2)
            const fade = smoothstep(float(0.0), float(1.0), dist.oneMinus()).mul(0.25)
            return vec4(vec3(0.3, 0.5, 0.6), fade)
        })()

        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.rotation.x = -Math.PI * 0.5
        ring.position.set(c.x, 0.02, c.z)
        this.game.scene.add(ring)
        this.objects.hideable.push(ring)
    }

    setDustMoteParticles()
    {
        const c = this.stationCenter
        const count = 20

        const dustGeometry = new THREE.PlaneGeometry(0.06, 0.06)
        const dustMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })
        dustMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()
            const fade = smoothstep(float(0.5), float(0.1), dist)
            return vec4(vec3(0.8, 0.53, 0.33).mul(2.0), fade.mul(0.6))
        })()

        this.dustMotes = []
        for(let i = 0; i < count; i++)
        {
            const mesh = new THREE.Mesh(dustGeometry, dustMaterial)

            const angle = Math.random() * Math.PI * 2
            const radius = 1.0 + Math.random() * 3.0
            mesh.position.set(
                c.x + Math.cos(angle) * radius,
                0.5 + Math.random() * 3.0,
                c.z + Math.sin(angle) * radius
            )

            mesh.userData.dustPhase = Math.random() * Math.PI * 2
            mesh.userData.dustSpeed = 0.2 + Math.random() * 0.5
            mesh.userData.dustRadius = radius
            mesh.userData.dustAngle = angle
            mesh.userData.dustBaseY = 0.5

            this.game.scene.add(mesh)
            this.objects.hideable.push(mesh)
            this.dustMotes.push(mesh)
        }
    }

    setStationCollider()
    {
        this.game.objects.add(
            null,
            {
                type: 'fixed',
                position: new THREE.Vector3(this.stationCenter.x, 1.5, this.stationCenter.z),
                friction: 0.5,
                sleeping: true,
                colliders: [{ shape: 'cylinder', parameters: [1.5, 2.5], category: 'object' }],
            }
        )
    }

    setBonfire()
    {
        const position = this.references.items.get('bonfireHashes')[0].position

        // Particles
        let particles = null
        {
            const emissiveMaterial = this.game.materials.getFromName('emissiveBlueRadialGradient')
    
            const count = 30
            const elevation = uniform(5)
            const positions = new Float32Array(count * 3)
            const scales = new Float32Array(count)
    
    
            for(let i = 0; i < count; i++)
            {
                const i3 = i * 3
    
                const angle = Math.PI * 2 * Math.random()
                const radius = Math.pow(Math.random(), 1.5) * 1
                positions[i3 + 0] = Math.cos(angle) * radius
                positions[i3 + 1] = Math.random()
                positions[i3 + 2] = Math.sin(angle) * radius
    
                scales[i] = 0.02 + Math.random() * 0.06
            }
            
            const positionAttribute = instancedArray(positions, 'vec3').toAttribute()
            const scaleAttribute = instancedArray(scales, 'float').toAttribute()
    
            const material = new THREE.SpriteNodeMaterial()
            material.outputNode = emissiveMaterial.outputNode
    
            const progress = float(0).toVar()
    
            material.positionNode = Fn(() =>
            {
                const newPosition = positionAttribute.toVar()
                progress.assign(newPosition.y.add(this.localTime.mul(newPosition.y)).fract())
    
                newPosition.y.assign(progress.mul(elevation))
                newPosition.xz.addAssign(this.game.wind.direction.mul(progress))
    
                const progressHide = step(0.8, progress).mul(100)
                newPosition.y.addAssign(progressHide)
                
                return newPosition
            })()
            material.scaleNode = Fn(() =>
            {
                const progressScale = progress.remapClamp(0.5, 1, 1, 0)
                return scaleAttribute.mul(progressScale)
            })()
    
            const geometry = new THREE.CircleGeometry(0.5, 8)
    
            particles = new THREE.Mesh(geometry, material)
            particles.visible = false
            particles.position.copy(position)
            particles.count = count
            this.game.scene.add(particles)
        }

        // Hashes
        {
            const alphaNode = Fn(() =>
            {
                const baseUv = uv(1)
                const distanceToCenter = baseUv.sub(0.5).length()
    
                const voronoi = texture(
                    this.game.noises.voronoi,
                    baseUv
                ).g
    
                voronoi.subAssign(distanceToCenter.remap(0, 0.5, 0.3, 0))
    
                return voronoi
            })()
    
            const material = new MeshDefaultMaterial({
                colorNode: color(0xA0522D),
                alphaNode: alphaNode,
                hasWater: false,
                hasLightBounce: false
            })
    
            const mesh = this.references.items.get('bonfireHashes')[0]
            mesh.material = material
        }

        // Burn
        const burn = this.references.items.get('bonfireBurn')[0]
        burn.visible = false

        // Interactive point
        this.game.interactivePoints.create(
            this.references.items.get('bonfireInteractivePoint')[0].position,
            'R(e)start',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.reset()

                gsap.delayedCall(2, () =>
                {
                    // Bonfire
                    particles.visible = true
                    burn.visible = true
                    this.game.ticker.wait(2, () =>
                    {
                        particles.geometry.boundingSphere.center.y = 2
                        particles.geometry.boundingSphere.radius = 2
                    })

                    // Sound
                    this.game.audio.groups.get('campfire').items[0].positions.push(position)
                })
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'landing')
        })
        this.events.on('boundingOut', () =>
        {
            this.game.achievements.setProgress('landingLeave', 1)
        })
    }

    update()
    {
        this.localTime.value += this.game.ticker.deltaScaled * 0.1

        const t = this.game.ticker.elapsedScaled

        // Solar panel sun tracking
        for(const pivot of this.solarPanels)
        {
            pivot.rotation.x = -0.3 + Math.sin(t * 0.15) * 0.15
        }

        // Dome interior glow pulse
        if(this.domeGlowPulse)
            this.domeGlowPulse.value = 0.4 + Math.sin(t * 0.8) * 0.15

        // Door strip pulse
        if(this.doorStripPulse)
            this.doorStripPulse.value = 0.7 + Math.sin(t * 1.5) * 0.3

        // Dome rim LED pulse
        if(this.domeLedPulse)
            this.domeLedPulse.value = 0.6 + Math.sin(t * 1.8) * 0.4

        // Beacon blink (sharp on/off)
        if(this.beaconPulse)
            this.beaconPulse.value = Math.sin(t * 3.0) > 0 ? 1.0 : 0.15

        // Dust motes drift
        for(const mote of this.dustMotes)
        {
            const phase = (t * mote.userData.dustSpeed + mote.userData.dustPhase) % 4
            mote.position.y = mote.userData.dustBaseY + phase
            const fade = phase < 0.5 ? phase * 2 : phase > 3.5 ? (4 - phase) * 2 : 1
            mote.scale.setScalar(fade)
        }
    }
}