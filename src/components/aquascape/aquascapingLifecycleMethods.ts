/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function update(this: any, elapsedTime: number): void {
    const deltaTime = Math.max(0, elapsedTime - this.time)
    this.time = elapsedTime
    this.plantAnimationMixers.forEach((mixer) => mixer.update(deltaTime))
    
    // Animate plant swaying
    this.plants.forEach((plant) => {
      plant.children.forEach((segment, segmentIndex) => {
        if (segment.userData.originalRotation !== undefined) {
          const swayOffset = segment.userData.swayOffset || 0
          const swayAmplitude = segment.userData.swayAmplitude || 0.1
          
          const sway = Math.sin(this.time * 0.8 + swayOffset + segmentIndex * 0.3) * swayAmplitude
          segment.rotation.z = segment.userData.originalRotation + sway
          
          // Add slight x-axis movement
          segment.rotation.x = Math.sin(this.time * 0.5 + swayOffset) * 0.05
        }
      })
    })
  }

export function createSeaweedTexture(this: any, hue: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const baseColor = new THREE.Color().setHSL(hue, 0.5, 0.4)
    const shadowColor = baseColor.clone().lerp(new THREE.Color('#113826'), 0.28)
    const highlightColor = baseColor.clone().lerp(new THREE.Color('#d7ffd9'), 0.18)
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const leftBase = canvas.width * 0.18
    const rightBase = canvas.width * 0.82

    const gradient = ctx.createLinearGradient(0, tipY, 0, baseY)
    gradient.addColorStop(0, highlightColor.getStyle())
    gradient.addColorStop(0.42, baseColor.getStyle())
    gradient.addColorStop(1, shadowColor.getStyle())

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(leftBase, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(rightBase, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = shadowColor.clone().multiplyScalar(0.98).getStyle()
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.globalCompositeOperation = 'overlay'
    ctx.strokeStyle = 'rgba(223, 255, 214, 0.32)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < 5; i++) {
      const startY = canvas.height * (0.18 + i * 0.14)
      const offset = (i - 2) * 12
      ctx.strokeStyle = `rgba(16, 68, 39, ${0.12 + i * 0.015})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 34, midX + offset * 1.5, startY + 82)
      ctx.stroke()
    }
    
    ctx.globalCompositeOperation = 'source-over'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    
    return texture
  }

export function createSeaweedNormalMap(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = '#8080ff'
    ctx.fill()

    ctx.strokeStyle = '#6f6fff'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.strokeStyle = '#9494ff'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const startY = canvas.height * (0.22 + i * 0.16)
      const offset = (i - 1.5) * 16
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 28, midX + offset * 1.4, startY + 72)
      ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }

export function createSeaweedRoughnessMap(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const roughnessGradient = ctx.createLinearGradient(0, tipY, 0, baseY)

    roughnessGradient.addColorStop(0, '#666666')
    roughnessGradient.addColorStop(0.55, '#8d8d8d')
    roughnessGradient.addColorStop(1, '#b8b8b8')

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = roughnessGradient
    ctx.fill()

    ctx.strokeStyle = '#565656'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }

export function setMotionEnabled(this: any, enabled: boolean): void {
    // Plants can still sway slightly even when motion is reduced
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        if (!enabled && segment.userData.originalRotation !== undefined) {
          segment.rotation.z = segment.userData.originalRotation
          segment.rotation.x = 0
        }
      })
    })
  }
