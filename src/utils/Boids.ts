import * as THREE from 'three'

interface BoidParams {
  alignment: number
  cohesion: number
  separation: number
  maxSpeed: number
  maxForce: number
  neighborRadius: number
}

export class Boid {
  position: THREE.Vector3
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  maxSpeed: number
  maxForce: number
  
  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    )
    this.acceleration = new THREE.Vector3()
    this.maxSpeed = 0.5
    this.maxForce = 0.03
  }
  
  applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force)
  }
  
  seek(target: THREE.Vector3): THREE.Vector3 {
    const desired = new THREE.Vector3().subVectors(target, this.position)
    desired.normalize()
    desired.multiplyScalar(this.maxSpeed)
    
    const steer = new THREE.Vector3().subVectors(desired, this.velocity)
    steer.clampLength(0, this.maxForce)
    
    return steer
  }
  
  flee(target: THREE.Vector3): THREE.Vector3 {
    const desired = new THREE.Vector3().subVectors(this.position, target)
    desired.normalize()
    desired.multiplyScalar(this.maxSpeed)
    
    const steer = new THREE.Vector3().subVectors(desired, this.velocity)
    steer.clampLength(0, this.maxForce)
    
    return steer
  }
  
  update(): void {
    this.velocity.add(this.acceleration)
    this.velocity.clampLength(0, this.maxSpeed)
    this.position.add(this.velocity)
    this.acceleration.multiplyScalar(0)
  }
}

export class BoidsSystem {
  boids: Boid[]
  params: BoidParams
  bounds: THREE.Box3
  
  constructor(count: number, bounds: THREE.Box3) {
    this.boids = []
    this.bounds = bounds
    this.params = {
      alignment: 1.0,
      cohesion: 0.8,
      separation: 1.5,
      maxSpeed: 0.5,
      maxForce: 0.03,
      neighborRadius: 2
    }
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < count; i++) {
      const x = center.x + (Math.random() - 0.5) * size.x * 0.8
      const y = center.y + (Math.random() - 0.5) * size.y * 0.8
      const z = center.z + (Math.random() - 0.5) * size.z * 0.8
      
      const boid = new Boid(x, y, z)
      boid.maxSpeed = this.params.maxSpeed
      boid.maxForce = this.params.maxForce
      this.boids.push(boid)
    }
  }
  
  private alignment(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const avgVelocity = new THREE.Vector3()
    
    if (neighbors.length === 0) return avgVelocity
    
    for (const neighbor of neighbors) {
      avgVelocity.add(neighbor.velocity)
    }
    
    avgVelocity.divideScalar(neighbors.length)
    avgVelocity.normalize()
    avgVelocity.multiplyScalar(boid.maxSpeed)
    
    const steer = new THREE.Vector3().subVectors(avgVelocity, boid.velocity)
    steer.clampLength(0, boid.maxForce)
    
    return steer
  }
  
  private cohesion(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const avgPosition = new THREE.Vector3()
    
    if (neighbors.length === 0) return avgPosition
    
    for (const neighbor of neighbors) {
      avgPosition.add(neighbor.position)
    }
    
    avgPosition.divideScalar(neighbors.length)
    
    return boid.seek(avgPosition)
  }
  
  private separation(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const steer = new THREE.Vector3()
    
    for (const neighbor of neighbors) {
      const distance = boid.position.distanceTo(neighbor.position)
      if (distance > 0 && distance < 1) {
        const diff = new THREE.Vector3().subVectors(boid.position, neighbor.position)
        diff.normalize()
        diff.divideScalar(distance)
        steer.add(diff)
      }
    }
    
    if (neighbors.length > 0) {
      steer.divideScalar(neighbors.length)
    }
    
    if (steer.length() > 0) {
      steer.normalize()
      steer.multiplyScalar(boid.maxSpeed)
      steer.sub(boid.velocity)
      steer.clampLength(0, boid.maxForce)
    }
    
    return steer
  }
  
  private boundaries(boid: Boid): THREE.Vector3 {
    const steer = new THREE.Vector3()
    const margin = 1
    
    if (boid.position.x < this.bounds.min.x + margin) {
      steer.x = boid.maxSpeed
    } else if (boid.position.x > this.bounds.max.x - margin) {
      steer.x = -boid.maxSpeed
    }
    
    if (boid.position.y < this.bounds.min.y + margin) {
      steer.y = boid.maxSpeed
    } else if (boid.position.y > this.bounds.max.y - margin) {
      steer.y = -boid.maxSpeed
    }
    
    if (boid.position.z < this.bounds.min.z + margin) {
      steer.z = boid.maxSpeed
    } else if (boid.position.z > this.bounds.max.z - margin) {
      steer.z = -boid.maxSpeed
    }
    
    return steer
  }
  
  private getNeighbors(boid: Boid): Boid[] {
    const neighbors: Boid[] = []
    
    for (const other of this.boids) {
      if (other !== boid) {
        const distance = boid.position.distanceTo(other.position)
        if (distance < this.params.neighborRadius) {
          neighbors.push(other)
        }
      }
    }
    
    return neighbors
  }
  
  update(): void {
    for (const boid of this.boids) {
      const neighbors = this.getNeighbors(boid)
      
      const alignmentForce = this.alignment(boid, neighbors)
      const cohesionForce = this.cohesion(boid, neighbors)
      const separationForce = this.separation(boid, neighbors)
      const boundaryForce = this.boundaries(boid)
      
      alignmentForce.multiplyScalar(this.params.alignment)
      cohesionForce.multiplyScalar(this.params.cohesion)
      separationForce.multiplyScalar(this.params.separation)
      boundaryForce.multiplyScalar(2)
      
      boid.applyForce(alignmentForce)
      boid.applyForce(cohesionForce)
      boid.applyForce(separationForce)
      boid.applyForce(boundaryForce)
      
      boid.update()
    }
  }
}