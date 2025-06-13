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
  energy: number
  lastFeedTime: number
  isLeader: boolean
  size: number
  idleTimer: number
  
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
    this.energy = 1.0
    this.lastFeedTime = 0
    this.isLeader = false
    this.size = 1.0
    this.idleTimer = Math.random() * 10
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
  feedingPoints: THREE.Vector3[]
  currentTime: number
  
  constructor(count: number, bounds: THREE.Box3) {
    this.boids = []
    this.bounds = bounds
    this.feedingPoints = []
    this.currentTime = 0
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
      boid.maxSpeed = this.params.maxSpeed * (0.8 + Math.random() * 0.4)
      boid.maxForce = this.params.maxForce
      boid.size = 0.8 + Math.random() * 0.4
      boid.isLeader = i < 4 // First few fish are leaders
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
    const margin = 2.0
    const turnForce = 2.0
    
    // 壁への距離を計算
    const distToMinX = boid.position.x - this.bounds.min.x
    const distToMaxX = this.bounds.max.x - boid.position.x
    const distToMinY = boid.position.y - this.bounds.min.y
    const distToMaxY = this.bounds.max.y - boid.position.y
    const distToMinZ = boid.position.z - this.bounds.min.z
    const distToMaxZ = this.bounds.max.z - boid.position.z
    
    // 滑らかな回避行動
    if (distToMinX < margin) {
      const force = (margin - distToMinX) / margin
      steer.x += turnForce * force
    }
    if (distToMaxX < margin) {
      const force = (margin - distToMaxX) / margin
      steer.x -= turnForce * force
    }
    
    if (distToMinY < margin) {
      const force = (margin - distToMinY) / margin
      steer.y += turnForce * force
    }
    if (distToMaxY < margin) {
      const force = (margin - distToMaxY) / margin
      steer.y -= turnForce * force
    }
    
    if (distToMinZ < margin) {
      const force = (margin - distToMinZ) / margin
      steer.z += turnForce * force
    }
    if (distToMaxZ < margin) {
      const force = (margin - distToMaxZ) / margin
      steer.z -= turnForce * force
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
  
  update(deltaTime: number = 0.016): void {
    this.currentTime += deltaTime
    
    // Occasionally create feeding points
    if (Math.random() < 0.001 && this.feedingPoints.length < 3) {
      const center = new THREE.Vector3()
      this.bounds.getCenter(center)
      const size = new THREE.Vector3()
      this.bounds.getSize(size)
      
      this.feedingPoints.push(new THREE.Vector3(
        center.x + (Math.random() - 0.5) * size.x * 0.6,
        center.y + size.y * 0.4, // Near surface for feeding
        center.z + (Math.random() - 0.5) * size.z * 0.6
      ))
      
      // Remove old feeding points
      setTimeout(() => {
        this.feedingPoints.shift()
      }, 10000)
    }
    
    // Group fish by size for predator-prey dynamics
    // const smallFish = this.boids.filter(b => b.size < 0.9) // For future prey behavior
    const largeFish = this.boids.filter(b => b.size > 1.1)
    
    for (const boid of this.boids) {
      const neighbors = this.getNeighbors(boid)
      
      const alignmentForce = this.alignment(boid, neighbors)
      const cohesionForce = this.cohesion(boid, neighbors)
      const separationForce = this.separation(boid, neighbors)
      const boundaryForce = this.boundaries(boid)
      
      // New behaviors
      const feedingForce = this.feedingBehavior(boid)
      const predatorForce = this.predatorAvoidance(boid, largeFish)
      const formationForce = this.formationBehavior(boid, neighbors)
      
      // Apply idle behavior
      this.idleBehavior(boid)
      
      // Scale forces based on energy and state
      alignmentForce.multiplyScalar(this.params.alignment * boid.energy)
      cohesionForce.multiplyScalar(this.params.cohesion * boid.energy)
      separationForce.multiplyScalar(this.params.separation)
      boundaryForce.multiplyScalar(1.5)
      feedingForce.multiplyScalar(2.0 * (2.0 - boid.energy)) // Hungry fish seek food more
      predatorForce.multiplyScalar(3.0)
      formationForce.multiplyScalar(0.5)
      
      boid.applyForce(alignmentForce)
      boid.applyForce(cohesionForce)
      boid.applyForce(separationForce)
      boid.applyForce(boundaryForce)
      boid.applyForce(feedingForce)
      boid.applyForce(predatorForce)
      boid.applyForce(formationForce)
      
      // Update energy
      boid.energy = Math.max(0.3, boid.energy - deltaTime * 0.01)
      
      boid.update()
    }
  }
  
  private feedingBehavior(boid: Boid): THREE.Vector3 {
    const feedForce = new THREE.Vector3()
    
    for (const feedingPoint of this.feedingPoints) {
      const distance = boid.position.distanceTo(feedingPoint)
      
      if (distance < 5) {
        // Strong attraction to food
        const force = boid.seek(feedingPoint)
        force.multiplyScalar(3.0 / (distance + 1))
        feedForce.add(force)
        
        // Replenish energy when close to food
        if (distance < 0.5) {
          boid.energy = Math.min(1.0, boid.energy + 0.1)
          boid.lastFeedTime = this.currentTime
        }
      }
    }
    
    return feedForce
  }
  
  private predatorAvoidance(boid: Boid, predators: Boid[]): THREE.Vector3 {
    const avoidanceForce = new THREE.Vector3()
    const avoidanceRadius = 3.0 * boid.size
    
    // Small fish avoid large fish
    if (boid.size < 0.9) {
      for (const predator of predators) {
        const distance = boid.position.distanceTo(predator.position)
        
        if (distance < avoidanceRadius) {
          const flee = boid.flee(predator.position)
          const urgency = (avoidanceRadius - distance) / avoidanceRadius
          flee.multiplyScalar(urgency * 4.0)
          avoidanceForce.add(flee)
          
          // Panic speed boost
          boid.maxSpeed = this.params.maxSpeed * 1.5
        }
      }
    }
    
    // Gradually return to normal speed
    boid.maxSpeed = THREE.MathUtils.lerp(boid.maxSpeed, this.params.maxSpeed * (0.8 + boid.size * 0.4), 0.1)
    
    return avoidanceForce
  }
  
  private formationBehavior(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const formationForce = new THREE.Vector3()
    
    // Leaders guide the school
    if (boid.isLeader) {
      // Leaders explore more
      const wanderAngle = this.currentTime * 0.3 + boid.position.x
      const wanderForce = new THREE.Vector3(
        Math.sin(wanderAngle) * 0.1,
        Math.cos(wanderAngle * 0.7) * 0.05,
        Math.sin(wanderAngle * 1.3) * 0.1
      )
      formationForce.add(wanderForce)
    } else {
      // Followers form V-formation behind leaders
      const leaders = neighbors.filter(n => n.isLeader)
      if (leaders.length > 0) {
        const nearestLeader = leaders.reduce((nearest, leader) => {
          const d1 = boid.position.distanceTo(nearest.position)
          const d2 = boid.position.distanceTo(leader.position)
          return d2 < d1 ? leader : nearest
        })
        
        // Position behind and to the side of leader
        const offset = new THREE.Vector3()
        const leaderVel = nearestLeader.velocity.clone().normalize()
        const side = Math.sign(boid.position.x - nearestLeader.position.x) || 1
        
        offset.copy(leaderVel).multiplyScalar(-1.5) // Behind
        offset.x += side * 0.8 // To the side
        
        const targetPos = nearestLeader.position.clone().add(offset)
        formationForce.add(boid.seek(targetPos).multiplyScalar(0.5))
      }
    }
    
    return formationForce
  }
  
  private idleBehavior(boid: Boid): void {
    boid.idleTimer += 0.016
    
    // Occasionally pause to "rest"
    const idleChance = Math.sin(boid.idleTimer * 0.1 + boid.position.x) > 0.98
    
    if (idleChance && boid.energy < 0.5) {
      // Tired fish slow down
      boid.velocity.multiplyScalar(0.3)
      boid.maxSpeed = this.params.maxSpeed * 0.2
    }
    
    // Fish near feeding points slow down to feed
    for (const feedingPoint of this.feedingPoints) {
      const distance = boid.position.distanceTo(feedingPoint)
      if (distance < 2) {
        boid.velocity.multiplyScalar(0.7)
      }
    }
  }
  
  addFeedingPoint(point: THREE.Vector3): void {
    this.feedingPoints.push(point)
    
    // Remove after 15 seconds
    setTimeout(() => {
      const index = this.feedingPoints.indexOf(point)
      if (index > -1) {
        this.feedingPoints.splice(index, 1)
      }
    }, 15000)
  }
}