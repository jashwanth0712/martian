import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { mul, max, step, output, color, sin, smoothstep, mix, matcapUV, float, mod, texture, transformNormalToView, uniformArray, varying, vertexIndex, rotateUV, cameraPosition, vec4, atan, vec3, vec2, modelWorldMatrix, Fn, attribute, uniform, normalWorld } from 'three/tsl'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

export class Grass
{
    constructor()
    {
        this.game = Game.getInstance()

        this.subdivisions = 280
        const halfExtent = this.game.view.optimalArea.radius
        this.size = halfExtent * 2
        this.count = this.subdivisions * this.subdivisions
        this.fragmentSize = this.size / this.subdivisions

        this.surface = this.size * this.size
        this.surfaceIdeal = 2000
        this.surfaceOverflow = Math.max(0, this.surface - this.surfaceIdeal) / this.surfaceIdeal

        this.setGeometry()
        this.setMaterial()
        this.setMesh()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)

        // Resize
        this.game.viewport.events.on('throttleChange', () =>
        {
            const halfExtent = this.game.view.optimalArea.radius
            this.size = halfExtent * 2
            this.surface = this.size * this.size
            this.surfaceOverflow = Math.max(0, this.surface - this.surfaceIdeal) / this.surfaceIdeal
            
            this.sizeUniform.value = this.size
            this.bladeWidth.value = 0.15 * (1 + this.surfaceOverflow * 0.4)
            this.bladeHeight.value = 0.15 * (1 + this.surfaceOverflow * 0.4)

            this.geometry.dispose()
            this.setGeometry()
            this.mesh.geometry = this.geometry
        }, 2)
    }

    setGeometry()
    {
        // 6 vertices per pebble (2 triangles = 1 quad)
        const vertsPerPebble = 6
        const position = new Float32Array(this.count * vertsPerPebble * 2)
        const heightRandomness = new Float32Array(this.count * vertsPerPebble)

        for(let iX = 0; iX < this.subdivisions; iX++)
        {
            const fragmentX = (iX / this.subdivisions - 0.5) * this.size + this.fragmentSize * 0.5

            for(let iZ = 0; iZ < this.subdivisions; iZ++)
            {
                const fragmentZ = (iZ / this.subdivisions - 0.5) * this.size + this.fragmentSize * 0.5

                const i = (iX * this.subdivisions + iZ)
                const i6 = i * vertsPerPebble
                const i12 = i6 * 2

                // Center of the pebble
                const positionX = fragmentX + (Math.random() - 0.5) * this.fragmentSize
                const positionZ = fragmentZ + (Math.random() - 0.5) * this.fragmentSize

                // All 6 vertices share the same center position
                for(let v = 0; v < vertsPerPebble; v++)
                {
                    position[i12 + v * 2    ] = positionX
                    position[i12 + v * 2 + 1] = positionZ
                }

                // Randomness — same value for all vertices of one pebble
                const rand = Math.random()
                for(let v = 0; v < vertsPerPebble; v++)
                {
                    heightRandomness[i6 + v] = rand
                }
            }
        }

        this.geometry = new THREE.BufferGeometry()
        this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1)
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 2))
        this.geometry.setAttribute('heightRandomness', new THREE.Float32BufferAttribute(heightRandomness, 1))
    }

    setMaterial()
    {
        this.center = uniform(new THREE.Vector2())
        // this.tracksDelta = uniform(new THREE.Vector2())

        // 6 vertices per quad (2 triangles)
        const vertexLoopIndex = varying(vertexIndex.toFloat().mod(6))
        const pebbleUv = varying(vec2())
        const wind = varying(vec2())
        const bladePosition = varying(vec2())

        this.bladeWidth = uniform(0.15 * (1 + this.surfaceOverflow * 0.5))
        this.bladeHeight = uniform(0.15 * (1 + this.surfaceOverflow * 0.5))
        this.bladeHeightRandomness = uniform(0.8)
        this.sizeUniform = uniform(this.size)

        // Quad: two triangles (TL, BL, TR) + (TR, BL, BR)
        // x = horizontal offset, y = vertical offset
        const bladeShape = uniformArray([
                // Triangle 1
                - 1, 1,    // top-left
                - 1, 0,    // bottom-left
                  1, 1,    // top-right

                // Triangle 2
                  1, 1,    // top-right
                - 1, 0,    // bottom-left
                  1, 0,    // bottom-right
        ])

        const hiddenThreshold = 0.1
        // const terrainUv = this.game.terrain.worldPositionToUvNode(bladePosition)
        const terrainData = this.game.terrain.terrainNode(bladePosition)
        const terrainDataGrass = terrainData.g
        const hidden = step(terrainData.g.sub(0.4), hiddenThreshold)

        // Martian pebble colors — vary per instance using heightRandomness
        const pebbleRandom = attribute('heightRandomness')
        const pebbleColorA = color(0x8B4513) // saddle brown
        const pebbleColorB = color(0xA0522D) // sienna
        const pebbleColorC = color(0x6B3A2A) // dark rust
        const pebbleColor = mix(mix(pebbleColorA, pebbleColorB, pebbleRandom), pebbleColorC, sin(pebbleRandom.mul(6.28)).mul(0.5).add(0.5))

        // Circular SDF alpha — discard fragments outside a circle
        const centeredUv = vec2(pebbleUv.x, pebbleUv.y.mul(2).sub(1))
        const dist = centeredUv.length()
        const circleAlpha = smoothstep(1.0, 0.85, dist)

        this.material = new MeshDefaultMaterial({
            colorNode: pebbleColor,
            normalNode: vec3(0, 1, 0),
            hasWater: false,
            hasLightBounce: false,
            shadowNode: terrainDataGrass,
            alphaNode: circleAlpha,
            alphaTest: 0.5
        })

        this.material.positionNode = Fn(() =>
        {
            // Blade position
            const position = attribute('position')

            const loopPosition = position.sub(this.center)
            const halfSize = this.sizeUniform.mul(0.5)
            loopPosition.x.assign(mod(loopPosition.x.add(halfSize), this.sizeUniform).sub(halfSize))
            loopPosition.y.assign(mod(loopPosition.y.add(halfSize), this.sizeUniform).sub(halfSize))

            const position3 = vec3(loopPosition.x, 0, loopPosition.y).add(vec3(this.center.x, 0, this.center.y))
            const worldPosition = modelWorldMatrix.mul(position3)
            bladePosition.assign(worldPosition.xz)

            // Height
            const heightVariation = texture(this.game.noises.perlin, bladePosition.mul(0.0321)).r.add(0.5)
            const height = this.bladeHeight
                .mul(this.bladeHeightRandomness.mul(attribute('heightRandomness')).add(this.bladeHeightRandomness.oneMinus()))
                .mul(heightVariation)
                .mul(terrainDataGrass)

            // Shape — quad vertices
            const shapeX = bladeShape.element(vertexLoopIndex.mod(6).mul(2))
            const shapeY = bladeShape.element(vertexLoopIndex.mod(6).mul(2).add(1))

            // Pass UV to fragment for circular SDF
            pebbleUv.assign(vec2(shapeX, shapeY))

            const shape = vec3(
                shapeX.mul(this.bladeWidth).mul(terrainDataGrass),
                shapeY.mul(height),
                0
            )

            // Vertex positioning
            const vertexPosition = position3.add(shape)

            // Vertex rotation
            const angleToCamera = atan(worldPosition.z.sub(cameraPosition.z), worldPosition.x.sub(cameraPosition.x)).add(- Math.PI * 0.5)
            vertexPosition.xz.assign(rotateUV(vertexPosition.xz, angleToCamera, worldPosition.xz))

            // Pebbles don't move in wind
            wind.assign(vec2(0, 0))

            // Hide (far above)
            vertexPosition.y.addAssign(hidden.mul(100))

            return vertexPosition
        })()

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '🪨 Pebbles',
                expanded: false,
            })

            debugPanel.addBinding(this.bladeWidth, 'value', { label: 'bladeWidth', min: 0, max: 1, step: 0.001 })
            debugPanel.addBinding(this.bladeHeight, 'value', { label: 'bladeHeight', min: 0, max: 2, step: 0.001 })
            debugPanel.addBinding(this.bladeHeightRandomness, 'value', { label: 'bladeHeightRandomness', min: 0, max: 1, step: 0.001 })
        }
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.mesh.receiveShadow = true
        // this.mesh.visible = false
        this.game.scene.add(this.mesh)
    }

    update()
    {
        this.center.value.set(this.game.view.optimalArea.position.x, this.game.view.optimalArea.position.z)
    }
}