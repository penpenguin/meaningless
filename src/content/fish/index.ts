import { abeniPuffer } from './abeniPuffer'
import { africanLampeye } from './africanLampeye'
import { angelfish } from './angelfish'
import { butterflyfish } from './butterflyfish'
import { cardinalTetra } from './cardinalTetra'
import { clownfish } from './clownfish'
import { corydoras } from './corydoras'
import { goldfish } from './goldfish'
import { neonTetra } from './neonTetra'
import { rasboraHeteromorpha } from './rasboraHeteromorpha'
import type { FishContentDefinition } from '../types'

export const registerFishContent = (...definitions: FishContentDefinition[]): FishContentDefinition[] => definitions

export const fishContentDefinitions = registerFishContent(
  neonTetra,
  clownfish,
  cardinalTetra,
  angelfish,
  butterflyfish,
  goldfish,
  abeniPuffer,
  corydoras,
  africanLampeye,
  rasboraHeteromorpha
)
