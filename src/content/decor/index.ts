import { cave } from './cave'
import { coral } from './coral'
import { plant } from './plant'
import type { DecorContentDefinition } from '../types'

export const registerDecorContent = (...definitions: DecorContentDefinition[]): DecorContentDefinition[] => definitions

export const decorContentDefinitions = registerDecorContent(
  plant,
  coral,
  cave
)
