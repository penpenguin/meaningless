import { angelfish } from './angelfish'
import { butterflyfish } from './butterflyfish'
import { cardinalTetra } from './cardinalTetra'
import { clownfish } from './clownfish'
import { goldfish } from './goldfish'
import { neonTetra } from './neonTetra'
import type { FishContentDefinition } from '../types'

export const registerFishContent = (...definitions: FishContentDefinition[]): FishContentDefinition[] => definitions

export const fishContentDefinitions = registerFishContent(
  neonTetra,
  clownfish,
  cardinalTetra,
  angelfish,
  butterflyfish,
  goldfish
)
