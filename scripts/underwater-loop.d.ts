export type UnderwaterLoop = {
  left: Float32Array
  right: Float32Array
}

export const generateUnderwaterLoop: (options: {
  sampleRate: number
  durationSeconds: number
  seed?: number
}) => UnderwaterLoop

export const encodeWav: (options: {
  left: Float32Array
  right: Float32Array
  sampleRate: number
}) => Buffer
