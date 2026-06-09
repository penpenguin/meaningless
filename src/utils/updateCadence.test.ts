import { describe, expect, it } from 'vitest'
import { shouldRunQualityCadencedUpdate } from './updateCadence'

describe('shouldRunQualityCadencedUpdate', () => {
  it('runs simple quality updates every other frame', () => {
    expect(shouldRunQualityCadencedUpdate({ frame: 0, quality: 'simple' })).toBe(true)
    expect(shouldRunQualityCadencedUpdate({ frame: 1, quality: 'simple' })).toBe(false)
    expect(shouldRunQualityCadencedUpdate({ frame: 2, quality: 'simple' })).toBe(true)
  })

  it('keeps standard quality updates running every frame', () => {
    expect(shouldRunQualityCadencedUpdate({ frame: 0, quality: 'standard' })).toBe(true)
    expect(shouldRunQualityCadencedUpdate({ frame: 1, quality: 'standard' })).toBe(true)
  })
})
