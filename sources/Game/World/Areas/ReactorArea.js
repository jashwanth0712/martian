import * as THREE from 'three/webgpu'
import { color, float, Fn, mix, sin, smoothstep, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import { Area } from './Area.js'

export class ReactorArea extends Area
{
    constructor(model)
    {
        super(model)

        this.hideGLBObjects()
        this.findCenter()

        this.setCore()
        this.setRings()
        this.setStruts()
        this.setSparks()
        this.setGroundGlow()
        this.setCoreCollider()
        this.setAchievement()
    }

    hideGLBObjects()
    {
        for(const object of this.objects.items)
        {
            if(object.visual)
                object.visual.object3D.visible = false

            if(object.physical)
                object.physical.body.setEnabled(false)
        }

        this.objects.hideable = []
    }

    findCenter()
    {
        const zoneRef = this.references.items.get('zoneFrustum')
        if(zoneRef)
        {
            this.center = zoneRef[0].position.clone()
        }
        else
        {
            const boundingRef = this.references.items.get('zoneBounding')
            this.center = boundingRef ? boundingRef[0].position.clone() : new THREE.Vector3()
        }
    }

    setCore()
    {
        const coreHeight = 4
        const coreRadius = 0.8

        this.corePulse = uniform(1.0)
        this.coreGlowColor = uniform(color('#ff4400'))
        this.coreEmissive = uniform(6.0)

        const outerGeometry = new THREE.CylinderGeometry(coreRadius, coreRadius, coreHeight, 32, 1, true)
        outerGeometry.translate(0, coreHeight * 0.5, 0)

        const outerMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true })
        outerMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv()
            const noiseUv = vec2(
                baseUv.x.mul(4).add(baseUv.y.mul(-1.5)),
                baseUv.y.mul(1.2).sub(this.game.ticker.elapsedScaledUniform.mul(0.3))
            )
            const noise = texture(this.game.noises.perlin, noiseUv).r.toVar()
            noise.addAssign(baseUv.y.mul(1.5))

            const emissiveColor = this.coreGlowColor.mul(this.coreEmissive).mul(this.corePulse)
            const mask = noise.smoothstep(0.4, 0.7)
            const finalColor = mix(emissiveColor, vec3(0.02, 0.0, 0.0), mask)

            noise.greaterThan(1.05).discard()

            return vec4(finalColor, float(1))
        })()

        this.coreMesh = new THREE.Mesh(outerGeometry, outerMaterial)
        this.coreMesh.position.copy(this.center)
        this.game.scene.add(this.coreMesh)
        this.objects.hideable.push(this.coreMesh)

        const innerGeometry = new THREE.CylinderGeometry(coreRadius * 0.5, coreRadius * 0.5, coreHeight * 1.05, 32)
        innerGeometry.translate(0, coreHeight * 0.5 * 1.05, 0)
        const innerMaterial = new MeshDefaultMaterial({
            colorNode: color('#2a2a2a'),
            hasWater: false,
        })
        this.innerMesh = new THREE.Mesh(innerGeometry, innerMaterial)
        this.innerMesh.position.copy(this.center)
        this.game.scene.add(this.innerMesh)
        this.objects.hideable.push(this.innerMesh)

        const capGeometry = new THREE.CylinderGeometry(coreRadius * 1.1, coreRadius * 1.1, 0.3, 32)
        const capMaterial = new MeshDefaultMaterial({
            colorNode: color('#3a3a3a'),
            hasWater: false,
        })

        const bottomCap = new THREE.Mesh(capGeometry, capMaterial)
        bottomCap.position.copy(this.center)
        bottomCap.position.y += 0.15
        this.game.scene.add(bottomCap)
        this.objects.hideable.push(bottomCap)

        const topCap = new THREE.Mesh(capGeometry, capMaterial)
        topCap.position.copy(this.center)
        topCap.position.y += coreHeight + 0.15
        this.game.scene.add(topCap)
        this.objects.hideable.push(topCap)
    }

    setRings()
    {
        this.rings = []

        const ringDefs = [
            { y: 1.2, outerR: 1.8, tubeR: 0.1,  colorHex: '#5a5a5a', emissive: false, speed: 0.4 },
            { y: 2.2, outerR: 2.2, tubeR: 0.14, colorHex: '#ff6622', emissive: true,  speed: -0.25 },
            { y: 3.2, outerR: 1.5, tubeR: 0.08, colorHex: '#4a4a4a', emissive: false, speed: 0.6 },
        ]

        for(const def of ringDefs)
        {
            const geometry = new THREE.TorusGeometry(def.outerR, def.tubeR, 16, 80)

            let material
            if(def.emissive)
            {
                const ringColor = uniform(color(def.colorHex))
                const ringEmissive = uniform(5.0)
                material = new THREE.MeshBasicNodeMaterial()
                material.outputNode = Fn(() =>
                {
                    return vec4(ringColor.mul(ringEmissive).mul(this.corePulse), float(1))
                })()
            }
            else
            {
                material = new MeshDefaultMaterial({
                    colorNode: color(def.colorHex),
                    hasWater: false,
                })
            }

            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(this.center)
            mesh.position.y += def.y
            mesh.rotation.x = Math.PI * 0.5
            mesh.userData.ringSpeed = def.speed

            this.game.scene.add(mesh)
            this.objects.hideable.push(mesh)
            this.rings.push(mesh)
        }
    }

    setStruts()
    {
        const count = 8
        const strutLength = 2.5
        const strutRadius = 0.06

        const material = new MeshDefaultMaterial({
            colorNode: color('#4d4d4d'),
            hasWater: false,
        })

        for(let i = 0; i < count; i++)
        {
            const angle = (i / count) * Math.PI * 2
            const geometry = new THREE.CylinderGeometry(strutRadius, strutRadius * 1.5, strutLength, 8)
            geometry.translate(0, strutLength * 0.5, 0)

            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(this.center)
            mesh.position.y += 0.3
            mesh.rotation.z = Math.PI * 0.5
            mesh.rotation.y = angle

            this.game.scene.add(mesh)
            this.objects.hideable.push(mesh)
        }
    }

    setSparks()
    {
        const count = 60

        const sparkGeometry = new THREE.PlaneGeometry(0.08, 0.08)
        const sparkMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })

        sparkMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length()
            dist.greaterThan(0.5).discard()

            const emissive = this.coreGlowColor.mul(this.coreEmissive).mul(this.corePulse).mul(0.8)
            const fade = smoothstep(float(0.5), float(0.1), dist)
            return vec4(emissive, fade)
        })()

        for(let i = 0; i < count; i++)
        {
            const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial)

            const angle = Math.random() * Math.PI * 2
            const radius = 0.3 + Math.random() * 1.2
            mesh.position.copy(this.center)
            mesh.position.x += Math.cos(angle) * radius
            mesh.position.z += Math.sin(angle) * radius
            mesh.position.y += Math.random() * 4

            mesh.userData.sparkPhase = Math.random() * Math.PI * 2
            mesh.userData.sparkSpeed = 0.3 + Math.random() * 0.8
            mesh.userData.sparkRadius = radius
            mesh.userData.sparkAngle = angle
            mesh.userData.sparkBaseY = this.center.y

            this.game.scene.add(mesh)
            this.objects.hideable.push(mesh)
        }

        this.sparks = this.objects.hideable.slice(-count)
    }

    setGroundGlow()
    {
        const radius = 3
        const geometry = new THREE.CircleGeometry(radius, 64)

        const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        material.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length().mul(2)
            const glow = dist.oneMinus().pow(2).mul(this.corePulse).mul(0.5)
            const emissive = this.coreGlowColor.mul(glow)
            return vec4(emissive, glow.clamp(0, 1))
        })()

        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI * 0.5
        mesh.position.copy(this.center)
        mesh.position.y += 0.05
        this.game.scene.add(mesh)
        this.objects.hideable.push(mesh)
    }

    setCoreCollider()
    {
        this.game.objects.add(
            null,
            {
                type: 'fixed',
                position: new THREE.Vector3(this.center.x, this.center.y + 2, this.center.z),
                friction: 0.5,
                sleeping: true,
                colliders: [{ shape: 'cylinder', parameters: [2, 1.0], category: 'object' }],
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'projects')
            this.game.achievements.setProgress('reactor', 1)
        })
    }

    update()
    {
        const t = this.game.ticker.elapsedScaled

        this.corePulse.value = Math.sin(t * 1.2) * 0.2 + 1.0

        for(const ring of this.rings)
        {
            ring.rotation.z += ring.userData.ringSpeed * this.game.ticker.deltaScaled
        }

        for(const spark of this.sparks)
        {
            const phase = (t * spark.userData.sparkSpeed + spark.userData.sparkPhase) % 5
            spark.position.y = spark.userData.sparkBaseY + phase
            const fade = phase < 0.5 ? phase * 2 : phase > 4 ? (5 - phase) * 2 : 1
            spark.scale.setScalar(fade)
        }
    }
}
