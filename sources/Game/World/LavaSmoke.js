import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, float, Fn, hash, instancedArray, instanceIndex, smoothstep, step, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'

export class LavaSmoke
{
    constructor()
    {
        this.game = Game.getInstance()

        this.count = 300
        this.riseHeight = 3
        this.spreadRadius = 60

        this.setSparkles()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)
    }

    setSparkles()
    {
        const count = this.count

        const posXArray = new Float32Array(count)
        const posZArray = new Float32Array(count)
        const phaseArray = new Float32Array(count)
        const speedArray = new Float32Array(count)

        for(let i = 0; i < count; i++)
        {
            const angle = Math.random() * Math.PI * 2
            const radius = Math.sqrt(Math.random()) * this.spreadRadius
            posXArray[i] = Math.cos(angle) * radius
            posZArray[i] = Math.sin(angle) * radius
            phaseArray[i] = Math.random() * Math.PI * 2
            speedArray[i] = 0.3 + Math.random() * 0.7
        }

        const posXBuffer = instancedArray(posXArray, 'float').toAttribute()
        const posZBuffer = instancedArray(posZArray, 'float').toAttribute()
        const phaseBuffer = instancedArray(phaseArray, 'float').toAttribute()
        const speedBuffer = instancedArray(speedArray, 'float').toAttribute()

        const material = new THREE.SpriteNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })

        const lavaY = float(this.game.water.surfaceElevation + 0.05)
        const riseHeight = float(this.riseHeight)
        const cycleLength = float(5)
        const shoreThreshold = float(0.17)

        material.positionNode = Fn(() =>
        {
            const worldX = posXBuffer
            const worldZ = posZBuffer

            const terrainData = this.game.terrain.terrainNode(vec2(worldX, worldZ))
            const isLava = step(shoreThreshold, terrainData.b)

            const phase = this.game.ticker.elapsedScaledUniform
                .mul(speedBuffer)
                .add(phaseBuffer)
                .mod(cycleLength)

            const y = phase.mul(riseHeight.div(cycleLength)).add(lavaY)

            return vec3(worldX, isLava.mix(float(-100), y), worldZ)
        })()

        material.scaleNode = Fn(() =>
        {
            const worldX = posXBuffer
            const worldZ = posZBuffer

            const terrainData = this.game.terrain.terrainNode(vec2(worldX, worldZ))
            const isLava = step(shoreThreshold, terrainData.b)

            const phase = this.game.ticker.elapsedScaledUniform
                .mul(speedBuffer)
                .add(phaseBuffer)
                .mod(cycleLength)

            const fadeIn = phase.smoothstep(0, float(0.5))
            const fadeOut = phase.smoothstep(float(4), cycleLength).oneMinus()
            return fadeIn.mul(fadeOut).mul(0.06).mul(isLava)
        })()

        material.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()

            const sparkColor = color(0xff4400).mul(6.0)
            const fade = smoothstep(float(0.5), float(0.1), dist)
            return vec4(sparkColor, fade)
        })()

        const geometry = new THREE.PlaneGeometry(1, 1)

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.count = this.count
        this.mesh.frustumCulled = false
        this.mesh.renderOrder = 3
        this.game.scene.add(this.mesh)
    }

    update()
    {
    }
}
