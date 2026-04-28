import * as THREE from 'three/webgpu'
import { color, float, Fn, frontFacing, If, mix, sin, smoothstep, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import { Area } from './Area.js'

export class DishAntennaArea extends Area
{
    constructor(model)
    {
        super(model)

        this.hideGLBObjects()
        this.findCenter()

        this.setPedestal()
        this.setYokeAndDish()
        this.setLEDs()
        this.setEquipmentBox()
        this.setGroundRing()
        this.setCollider()
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
        this.center.y = 0
    }

    setPedestal()
    {
        const mastHeight = 2.25

        // Foundation pad
        const padGeometry = new THREE.CircleGeometry(1.75, 64)
        const padMaterial = new MeshDefaultMaterial({ colorNode: color('#2c2c2c'), hasWater: false })
        const pad = new THREE.Mesh(padGeometry, padMaterial)
        pad.rotation.x = -Math.PI * 0.5
        pad.position.copy(this.center)
        pad.position.y += 0.03
        this.game.scene.add(pad)
        this.objects.hideable.push(pad)

        // Mast
        const mastGeometry = new THREE.CylinderGeometry(0.09, 0.14, mastHeight, 16)
        mastGeometry.translate(0, mastHeight * 0.5, 0)
        const mastMaterial = new MeshDefaultMaterial({ colorNode: color('#7a7a7a'), hasWater: false })
        const mast = new THREE.Mesh(mastGeometry, mastMaterial)
        mast.position.copy(this.center)
        this.game.scene.add(mast)
        this.objects.hideable.push(mast)

        // Tripod anchor feet
        const footMaterial = new MeshDefaultMaterial({ colorNode: color('#6a6a6a'), hasWater: false })
        for(let i = 0; i < 3; i++)
        {
            const angle = (i / 3) * Math.PI * 2
            const footGeometry = new THREE.CylinderGeometry(0.03, 0.05, 1.1, 8)
            footGeometry.translate(0, 0.55, 0)

            const foot = new THREE.Mesh(footGeometry, footMaterial)
            foot.position.copy(this.center)
            foot.position.y += 0.05
            foot.rotation.z = -Math.PI * 0.28
            foot.rotation.y = angle

            this.game.scene.add(foot)
            this.objects.hideable.push(foot)
        }

        this.mastHeight = mastHeight
    }

    setYokeAndDish()
    {
        const yokeY = this.center.y + this.mastHeight

        // Yoke group — rotates around Y for azimuth scanning
        this.yokeGroup = new THREE.Group()
        this.yokeGroup.position.set(this.center.x, yokeY, this.center.z)
        this.game.scene.add(this.yokeGroup)
        this.objects.hideable.push(this.yokeGroup)

        const structMaterial = new MeshDefaultMaterial({ colorNode: color('#5a5a5a'), hasWater: false })

        // Azimuth ring
        const azRingGeometry = new THREE.TorusGeometry(0.3, 0.035, 16, 64)
        const azRing = new THREE.Mesh(azRingGeometry, structMaterial)
        azRing.rotation.x = Math.PI * 0.5
        this.yokeGroup.add(azRing)

        // Yoke uprights
        const yokeArmMaterial = new MeshDefaultMaterial({ colorNode: color('#6e6e6e'), hasWater: false })
        const armGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8)
        armGeometry.translate(0, 0.3, 0)

        const leftArm = new THREE.Mesh(armGeometry, yokeArmMaterial)
        leftArm.position.x = -0.35
        this.yokeGroup.add(leftArm)

        const rightArm = new THREE.Mesh(armGeometry, yokeArmMaterial)
        rightArm.position.x = 0.35
        this.yokeGroup.add(rightArm)

        // Crossbar
        const crossbarGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8)
        crossbarGeometry.rotateZ(Math.PI * 0.5)
        const crossbar = new THREE.Mesh(crossbarGeometry, structMaterial)
        crossbar.position.y = 0.6
        this.yokeGroup.add(crossbar)

        // Pivot bearings
        const bearingGeometry = new THREE.TorusGeometry(0.065, 0.02, 8, 24)
        const bearingMaterial = new MeshDefaultMaterial({ colorNode: color('#4a4a4a'), hasWater: false })

        for(const side of [-1, 1])
        {
            const bearing = new THREE.Mesh(bearingGeometry, bearingMaterial)
            bearing.position.set(side * 0.375, 0.6, 0)
            bearing.rotation.y = Math.PI * 0.5
            this.yokeGroup.add(bearing)
        }

        // Elevation pivot group — child of yoke, tilts the dish
        this.dishPivot = new THREE.Group()
        this.dishPivot.position.y = 0.6
        this.dishPivot.rotation.x = -Math.PI * 0.12
        this.yokeGroup.add(this.dishPivot)

        this.buildDish()
        this.buildFeedHorn()
        this.buildFeedStruts()
    }

    buildDish()
    {
        const dishRadius = 1.9
        const dishDepth = 0.6
        const k = dishDepth / (dishRadius * dishRadius)
        const segments = 28

        const points = []
        for(let i = 0; i <= segments; i++)
        {
            const r = (i / segments) * dishRadius
            const y = k * r * r
            points.push(new THREE.Vector2(r, y))
        }

        const dishGeometry = new THREE.LatheGeometry(points, 64)

        const dishMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
        dishMaterial.outputNode = Fn(() =>
        {
            const baseUv = uv()

            const frontColor = vec3(0.72, 0.74, 0.76)
            const backColor = vec3(0.42, 0.43, 0.45)

            const sweep = sin(baseUv.y.mul(Math.PI * 2).add(this.game.ticker.elapsedScaledUniform.mul(0.4)))
            const glint = sweep.remapClamp(-0.95, 1.0, 0.0, 1.0).mul(0.2)
            const glintColor = vec3(0.90, 0.95, 1.00)

            const baseColor = vec3(0, 0, 0).toVar()
            If(frontFacing, () =>
            {
                baseColor.assign(mix(frontColor, glintColor, glint))
            })
            If(frontFacing.not(), () =>
            {
                baseColor.assign(backColor)
            })

            return vec4(baseColor, float(1))
        })()

        const dish = new THREE.Mesh(dishGeometry, dishMaterial)
        this.dishPivot.add(dish)

        // Rim ring
        const rimGeometry = new THREE.TorusGeometry(dishRadius, 0.04, 12, 100)
        const rimMaterial = new MeshDefaultMaterial({ colorNode: color('#888888'), hasWater: false })
        const rim = new THREE.Mesh(rimGeometry, rimMaterial)
        rim.rotation.x = Math.PI * 0.5
        rim.position.y = dishDepth
        this.dishPivot.add(rim)

        this.dishRadius = dishRadius
        this.dishDepth = dishDepth
    }

    buildFeedHorn()
    {
        // Focal distance: f = R² / (4 * depth)
        const focalDist = (this.dishRadius * this.dishRadius) / (4 * this.dishDepth)

        // Feed mount tube
        const tubeGeometry = new THREE.CylinderGeometry(0.045, 0.045, focalDist, 8)
        tubeGeometry.translate(0, focalDist * 0.5, 0)
        const tubeMaterial = new MeshDefaultMaterial({ colorNode: color('#5a5a5a'), hasWater: false })
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial)
        this.dishPivot.add(tube)

        // Feed horn body (cone — wide end faces dish)
        const hornGeometry = new THREE.CylinderGeometry(0.04, 0.11, 0.225, 12)
        hornGeometry.translate(0, -0.1125, 0)
        const hornMaterial = new MeshDefaultMaterial({ colorNode: color('#3a3a3a'), hasWater: false })
        const horn = new THREE.Mesh(hornGeometry, hornMaterial)
        horn.position.y = focalDist
        this.dishPivot.add(horn)

        // Horn aperture ring
        const apertureGeometry = new THREE.TorusGeometry(0.11, 0.0125, 8, 32)
        const apertureMaterial = new MeshDefaultMaterial({ colorNode: color('#a0a0a0'), hasWater: false })
        const aperture = new THREE.Mesh(apertureGeometry, apertureMaterial)
        aperture.position.y = focalDist - 0.1125
        aperture.rotation.x = Math.PI * 0.5
        this.dishPivot.add(aperture)

        this.focalDist = focalDist
    }

    buildFeedStruts()
    {
        const strutMaterial = new MeshDefaultMaterial({ colorNode: color('#6a6a6a'), hasWater: false })
        const feedY = this.focalDist - 0.1
        const rimY = this.dishDepth

        for(let i = 0; i < 3; i++)
        {
            const angle = (i / 3) * Math.PI * 2
            const rimX = Math.cos(angle) * (this.dishRadius * 0.9)
            const rimZ = Math.sin(angle) * (this.dishRadius * 0.9)

            const rimPoint = new THREE.Vector3(rimX, rimY, rimZ)
            const feedPoint = new THREE.Vector3(0, feedY, 0)
            const length = rimPoint.distanceTo(feedPoint)
            const mid = rimPoint.clone().lerp(feedPoint, 0.5)

            const strutGeometry = new THREE.CylinderGeometry(0.015, 0.015, length, 6)
            const strut = new THREE.Mesh(strutGeometry, strutMaterial)

            strut.position.copy(mid)

            const direction = new THREE.Vector3().subVectors(feedPoint, rimPoint).normalize()
            const axis = new THREE.Vector3(0, 1, 0)
            const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction)
            strut.quaternion.copy(quaternion)

            this.dishPivot.add(strut)
        }
    }

    setLEDs()
    {
        this.ledPulseA = uniform(1.0)
        this.ledPulseB = uniform(1.0)
        const ledColor = uniform(color('#00ccff'))
        const ledEmissive = uniform(4.0)

        const createLEDMaterial = (pulseUniform) =>
        {
            const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false })
            material.outputNode = Fn(() =>
            {
                const dist = uv().sub(0.5).length()
                dist.greaterThan(0.5).discard()
                const fade = smoothstep(float(0.5), float(0.05), dist)
                const emissive = ledColor.mul(ledEmissive).mul(pulseUniform)
                return vec4(emissive, fade)
            })()
            return material
        }

        const ledGeometry = new THREE.PlaneGeometry(0.08, 0.08)

        // Mast LEDs
        const matA = createLEDMaterial(this.ledPulseA)
        for(const yOffset of [0.75, 1.5])
        {
            const led = new THREE.Mesh(ledGeometry, matA)
            led.position.copy(this.center)
            led.position.x += 0.15
            led.position.y += yOffset
            this.game.scene.add(led)
            this.objects.hideable.push(led)
        }

        // Equipment box LED
        const matB = createLEDMaterial(this.ledPulseB)
        this.equipmentLED = new THREE.Mesh(ledGeometry, matB)
        this.equipmentLED.position.copy(this.center)
        this.equipmentLED.position.x += 0.6
        this.equipmentLED.position.y += 0.35
        this.equipmentLED.position.z += 0.16
        this.game.scene.add(this.equipmentLED)
        this.objects.hideable.push(this.equipmentLED)

        // Feed horn LED (in dish pivot group)
        const feedLED = new THREE.Mesh(ledGeometry, matA)
        feedLED.position.y = this.focalDist + 0.05
        this.dishPivot.add(feedLED)
    }

    setEquipmentBox()
    {
        const boxMaterial = new MeshDefaultMaterial({ colorNode: color('#3a3a3a'), hasWater: false })

        // Main box
        const boxGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.3)
        const box = new THREE.Mesh(boxGeometry, boxMaterial)
        box.position.copy(this.center)
        box.position.x += 0.6
        box.position.y += 0.15
        this.game.scene.add(box)
        this.objects.hideable.push(box)

        // Dark panel face
        const panelGeometry = new THREE.PlaneGeometry(0.25, 0.175)
        const panelMaterial = new MeshDefaultMaterial({ colorNode: color('#1a1a1a'), hasWater: false })
        const panel = new THREE.Mesh(panelGeometry, panelMaterial)
        panel.position.copy(this.center)
        panel.position.x += 0.6
        panel.position.y += 0.175
        panel.position.z += 0.151
        this.game.scene.add(panel)
        this.objects.hideable.push(panel)

        // Cable conduit from box to mast
        const cableGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6)
        const cableMaterial = new MeshDefaultMaterial({ colorNode: color('#2a2a2a'), hasWater: false })
        const cable = new THREE.Mesh(cableGeometry, cableMaterial)
        cable.position.copy(this.center)
        cable.position.x += 0.3
        cable.position.y += 0.25
        cable.rotation.z = Math.PI * 0.35
        this.game.scene.add(cable)
        this.objects.hideable.push(cable)
    }

    setGroundRing()
    {
        const ringGeometry = new THREE.RingGeometry(1.6, 1.9, 64)
        const ringMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        ringMaterial.outputNode = Fn(() =>
        {
            const dist = uv().sub(0.5).length().mul(2)
            const fade = smoothstep(float(0.0), float(1.0), dist.oneMinus()).mul(0.3)
            return vec4(vec3(0.4, 0.5, 0.6), fade)
        })()

        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.rotation.x = -Math.PI * 0.5
        ring.position.copy(this.center)
        ring.position.y += 0.02
        this.game.scene.add(ring)
        this.objects.hideable.push(ring)
    }

    setCollider()
    {
        // Mast collider
        this.game.objects.add(
            null,
            {
                type: 'fixed',
                position: new THREE.Vector3(this.center.x, this.center.y + 1.125, this.center.z),
                friction: 0.4,
                sleeping: true,
                colliders: [{ shape: 'cylinder', parameters: [2.25, 0.2], category: 'object' }],
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'cookie')
            this.game.achievements.setProgress('dishAntenna', 1)
        })
    }

    update()
    {
        const t = this.game.ticker.elapsedScaled
        const dt = this.game.ticker.deltaScaled

        // Slow azimuth rotation
        this.yokeGroup.rotation.y += 0.052 * dt

        // Gentle elevation oscillation
        this.dishPivot.rotation.x = -Math.PI * 0.12 + Math.sin(t * 0.31) * 0.087

        // LED pulses
        this.ledPulseA.value = Math.sin(t * 1.8) * 0.3 + 0.7
        this.ledPulseB.value = Math.sin(t * 0.6 + 2.1) * 0.5 + 0.5
    }
}
