import * as THREE from 'three/webgpu'
import { cos, float, atan, uniform, PI, color, positionLocal, sin, texture, Fn, uv, vec2, vec3, vec4, mix, max, smoothstep, remap } from 'three/tsl'
import { Game } from '../Game.js'
import { remapClamp } from '../utilities/maths.js'

const skewedUv = Fn(([ uv, skew ]) =>
{
    return vec2(
        uv.x.add(uv.y.mul(skew.x)),
        uv.y.add(uv.x.mul(skew.y))
    )
})

const twistedCylinder = Fn(([ position, parabolStrength, parabolOffset, parabolAmplitude, time ]) =>
{
    const angle = atan(position.z, position.x)
    const elevation = position.y

    const radius = parabolStrength.mul(position.y.sub(parabolOffset)).pow(2).add(parabolAmplitude)
    radius.addAssign(sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05))

    const twistedPosition = vec3(
        cos(angle).mul(radius),
        elevation,
        sin(angle).mul(radius)
    )

    return twistedPosition
})

export class FireTornadoes
{
    constructor()
    {
        this.game = Game.getInstance()

        this.count = 10
        this.tornadoScale = 5
        this.moveDuration = 5
        this.waitDuration = 10
        this.cycleDuration = (this.moveDuration + this.waitDuration) * 2
        this.sparksPerTornado = 20

        this.items = []

        this.generatePlacements()
        this.setMeshes()
        this.setSparks()
        this.setColliders()
        this.setSounds()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)
    }

    generatePlacements()
    {
        const mapRadius = 80
        const minDistFromCenter = 15
        const minDistBetween = 20
        const pathLength = { min: 15, max: 25 }

        const pointAs = []

        for(let i = 0; i < this.count; i++)
        {
            let pointA = null
            let attempts = 0

            while(attempts < 100)
            {
                const angle = Math.random() * Math.PI * 2
                const dist = minDistFromCenter + Math.random() * (mapRadius - minDistFromCenter)
                const candidate = new THREE.Vector3(
                    Math.cos(angle) * dist,
                    0,
                    Math.sin(angle) * dist
                )

                let tooClose = false
                for(const existing of pointAs)
                {
                    if(candidate.distanceTo(existing) < minDistBetween)
                    {
                        tooClose = true
                        break
                    }
                }

                if(!tooClose)
                {
                    pointA = candidate
                    break
                }

                attempts++
            }

            if(!pointA)
                continue

            const pathAngle = Math.random() * Math.PI * 2
            const pathDist = pathLength.min + Math.random() * (pathLength.max - pathLength.min)
            const pointB = new THREE.Vector3(
                pointA.x + Math.cos(pathAngle) * pathDist,
                0,
                pointA.z + Math.sin(pathAngle) * pathDist
            )

            const bDist = Math.sqrt(pointB.x * pointB.x + pointB.z * pointB.z)
            if(bDist > mapRadius)
            {
                pointB.multiplyScalar(mapRadius / bDist)
                pointB.y = 0
            }

            pointAs.push(pointA)

            this.items.push({
                pointA: pointA,
                pointB: pointB,
                position: pointA.clone(),
                timeOffset: Math.random() * this.cycleDuration,
                mesh: null,
                sparks: [],
                colliderObject: null,
                blastCooldown: 0
            })
        }
    }

    setMeshes()
    {
        const baseColor = uniform(color('#ff544d'))
        const emissive = uniform(8)
        const timeScale = uniform(0.15)
        const parabolStrength = uniform(1.7)
        const parabolOffset = uniform(0.4)
        const parabolAmplitude = uniform(0.27)

        const geometry = new THREE.CylinderGeometry(1, 1, 1, 32, 16, true)
        geometry.translate(0, 0.5, 0)

        const material = new THREE.MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: true, depthTest: true })

        material.positionNode = twistedCylinder(positionLocal, parabolStrength, parabolOffset, parabolAmplitude.sub(0.05), this.game.ticker.elapsedScaledUniform.mul(timeScale).mul(2))

        material.outputNode = Fn(() =>
        {
            const scaledTime = this.game.ticker.elapsedScaledUniform.mul(timeScale).negate()

            const y = uv().y.sub(1).pow(2).oneMinus()
            const heightModifier = cos(y.mul(2).add(1).mul(PI))
            heightModifier.assign(remap(heightModifier, -1, 1, -1, 1))

            const emissiveNoise1Uv = uv().add(vec2(scaledTime.mul(1.1), scaledTime.mul(1.1)))
            emissiveNoise1Uv.assign(skewedUv(emissiveNoise1Uv, vec2(-1, 0)).mul(vec2(4, 0.5)))
            const emissiveNoise1 = texture(this.game.noises.perlin, emissiveNoise1Uv, 1).r.remap(0.45, 0.7)

            const emissiveNoise2Uv = uv().add(vec2(scaledTime.mul(0.7), scaledTime.mul(0.7)))
            emissiveNoise2Uv.assign(skewedUv(emissiveNoise2Uv, vec2(-1, 0)).mul(vec2(10, 2)))
            const emissiveNoise2 = texture(this.game.noises.perlin, emissiveNoise2Uv, 1).r.remap(0.45, 0.7)

            const emissiveNoise = emissiveNoise1.mul(emissiveNoise2).add(heightModifier)
            emissiveNoise.assign(smoothstep(0, 0.4, emissiveNoise))

            const emissiveColor = baseColor.mul(emissive)

            const gooNoise1Uv = uv().add(vec2(scaledTime.mul(0.88), scaledTime.mul(0.88))).add(vec2(0.5))
            gooNoise1Uv.assign(skewedUv(gooNoise1Uv, vec2(-1, 0)).mul(vec2(3, 0.4)))
            const gooNoise1 = texture(this.game.noises.perlin, gooNoise1Uv, 1).r.remap(0.45, 0.7)

            const gooNoise2Uv = uv().add(vec2(scaledTime.mul(0.66), scaledTime.mul(0.66))).add(vec2(0.5))
            gooNoise2Uv.assign(skewedUv(gooNoise2Uv, vec2(-1, 0)).mul(vec2(8, 2)))
            const gooNoise2 = texture(this.game.noises.perlin, gooNoise2Uv, 1).r.remap(0.45, 0.7)

            const gooNoise = gooNoise1.mul(gooNoise2).add(heightModifier)
            const gooMix = gooNoise.step(0.2).oneMinus()

            const gooColor = this.game.fog.strength.mix(vec3(0), this.game.fog.color)

            const alpha = max(emissiveNoise, gooMix)
            alpha.lessThan(0.001).discard()

            const finalColor = mix(emissiveColor, gooColor, gooMix)
            return vec4(vec3(finalColor), alpha)
        })()

        for(const item of this.items)
        {
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(item.position)
            mesh.position.y = 0.5
            mesh.scale.set(this.tornadoScale, this.tornadoScale, this.tornadoScale)
            this.game.scene.add(mesh)
            item.mesh = mesh
        }
    }

    setSparks()
    {
        const glowColor = uniform(color('#ff4400'))
        const glowEmissive = uniform(6.0)

        const sparkGeometry = new THREE.PlaneGeometry(0.12, 0.12)
        const sparkMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })

        sparkMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()

            const emissiveOut = glowColor.mul(glowEmissive).mul(0.8)
            const fade = smoothstep(float(0.5), float(0.1), dist)
            return vec4(emissiveOut, fade)
        })()

        for(const item of this.items)
        {
            for(let i = 0; i < this.sparksPerTornado; i++)
            {
                const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial)

                const angle = Math.random() * Math.PI * 2
                const radius = 0.3 + Math.random() * 1.5

                mesh.userData.sparkPhase = Math.random() * Math.PI * 2
                mesh.userData.sparkSpeed = 0.3 + Math.random() * 0.8
                mesh.userData.sparkRadius = radius
                mesh.userData.sparkAngle = angle
                mesh.userData.sparkHeight = Math.random() * this.tornadoScale

                this.game.scene.add(mesh)
                item.sparks.push(mesh)
            }
        }
    }

    setColliders()
    {
        for(const item of this.items)
        {
            item.colliderObject = this.game.objects.add(
                null,
                {
                    type: 'kinematicPositionBased',
                    position: new THREE.Vector3(item.position.x, 2, item.position.z),
                    friction: 0.5,
                    colliders: [{ shape: 'cylinder', parameters: [3, 1.5], category: 'object' }],
                    contactThreshold: 0,
                    onCollision: () =>
                    {
                        this.onTornadoHit(item)
                    }
                }
            )
        }
    }

    setSounds()
    {
        this.sounds = {}

        const paths = [
            'sounds/explosions/SmallImpactMediumE PE281202.mp3',
            'sounds/explosions/SmallImpactMediumE PE281203.mp3'
        ]

        this.sounds.explosions = []

        for(const path of paths)
        {
            this.sounds.explosions.push(
                this.game.audio.register({
                    path: path,
                    autoplay: false,
                    loop: false,
                    volume: 1,
                    antiSpam: 0.5,
                    positions: new THREE.Vector3(),
                    distanceFade: 40,
                    onPlay: (item, coordinates) =>
                    {
                        item.positions[0].copy(coordinates)
                        item.volume = 1
                        item.rate = 0.6 + Math.random() * 0.2
                    }
                })
            )
        }
    }

    onTornadoHit(item)
    {
        if(item.blastCooldown > 0)
            return

        item.blastCooldown = 2.0

        const blastPosition = new THREE.Vector3(
            item.position.x,
            1,
            item.position.z
        )
        this.game.world.fireballs.create(blastPosition, 10, 10)

        this.sounds.explosions[Math.floor(Math.random() * this.sounds.explosions.length)].play(blastPosition)
    }

    getOscillationPosition(item, time)
    {
        const t = (time + item.timeOffset) % this.cycleDuration

        let position

        if(t < this.moveDuration)
        {
            const raw = t / this.moveDuration
            const eased = raw * raw * (3 - 2 * raw)
            position = new THREE.Vector3().lerpVectors(item.pointA, item.pointB, eased)
        }
        else if(t < this.moveDuration + this.waitDuration)
        {
            position = item.pointB.clone()
        }
        else if(t < this.moveDuration * 2 + this.waitDuration)
        {
            const raw = (t - this.moveDuration - this.waitDuration) / this.moveDuration
            const eased = raw * raw * (3 - 2 * raw)
            position = new THREE.Vector3().lerpVectors(item.pointB, item.pointA, eased)
        }
        else
        {
            position = item.pointA.clone()
        }

        return position
    }

    update()
    {
        const time = this.game.ticker.elapsedScaled
        const deltaScaled = this.game.ticker.deltaScaled

        for(const item of this.items)
        {
            const target = this.getOscillationPosition(item, time)
            item.position.copy(target)

            // Update tornado mesh
            item.mesh.position.copy(target)
            item.mesh.position.y = 0.5

            // Update collider (kinematic body)
            if(item.colliderObject && item.colliderObject.physical)
            {
                item.colliderObject.physical.body.setNextKinematicTranslation({ x: target.x, y: 2, z: target.z })
            }

            // Update sparks
            for(const spark of item.sparks)
            {
                const phase = (time * spark.userData.sparkSpeed + spark.userData.sparkPhase) % 5
                const orbitAngle = spark.userData.sparkAngle + time * spark.userData.sparkSpeed * 0.5
                const r = spark.userData.sparkRadius

                spark.position.x = target.x + Math.cos(orbitAngle) * r
                spark.position.z = target.z + Math.sin(orbitAngle) * r
                spark.position.y = target.y + phase

                const fade = phase < 0.5 ? phase * 2 : phase > 4 ? (5 - phase) * 2 : 1
                spark.scale.setScalar(fade)
            }

            // Blast cooldown
            if(item.blastCooldown > 0)
                item.blastCooldown -= deltaScaled

            // Physics push on player vehicle
            const toTornado = item.position.clone().sub(this.game.physicalVehicle.position)
            const distance = toTornado.length()

            const strength = remapClamp(distance, 12, 2, 0, 1)
            if(strength <= 0)
                continue

            const force = toTornado.clone().normalize()

            const sideAngleStrength = remapClamp(distance, 8, 2, 0, Math.PI * 0.25)
            force.applyAxisAngle(new THREE.Vector3(0, 1, 0), -sideAngleStrength)

            const flyForce = remapClamp(distance, 6, 2, 0, 1)
            force.y = flyForce * 1.5

            force.setLength(strength * deltaScaled * 15)
            this.game.physicalVehicle.chassis.physical.body.applyImpulse(force)
        }
    }
}
