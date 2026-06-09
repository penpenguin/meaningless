import { fishContentDefinitions } from './fish'
import { isStarterUnlockRule } from './types'
import type {
  ContentRegistryInput,
  FishContentDefinition
} from './types'

type ContentRegistry = {
  listByType: (type: 'fish') => FishContentDefinition[]
  getById: (type: 'fish', id: string) => FishContentDefinition | null
  getStarterIds: (type: 'fish') => string[]
}

const cloneFishContent = (definition: FishContentDefinition): FishContentDefinition => ({
  ...definition,
  colorVariants: [...definition.colorVariants],
  unlock: { ...definition.unlock },
  render: { ...definition.render },
  gameplay: { ...definition.gameplay }
})

const createLookup = (
  definitions: FishContentDefinition[]
): Map<string, FishContentDefinition> => {
  const lookup = new Map<string, FishContentDefinition>()

  definitions.forEach((definition) => {
    const id = definition.speciesId
    if (lookup.has(id)) {
      throw new Error(`Duplicate fish content id: ${id}`)
    }
    lookup.set(id, cloneFishContent(definition))
  })

  return lookup
}

export const createContentRegistry = (input: ContentRegistryInput): ContentRegistry => {
  const fishLookup = createLookup(input.fish)

  return {
    listByType: (_type: 'fish'): FishContentDefinition[] => {
      return Array.from(fishLookup.values()).map(cloneFishContent)
    },
    getById: (_type: 'fish', id: string): FishContentDefinition | null => {
      const entry = fishLookup.get(id)
      if (!entry) return null
      return cloneFishContent(entry)
    },
    getStarterIds: (_type: 'fish'): string[] => {
      return Array.from(fishLookup.values())
        .filter((definition) => isStarterUnlockRule(definition.unlock))
        .map((definition) => definition.speciesId)
    }
  }
}

export const contentRegistry = createContentRegistry({
  fish: fishContentDefinitions
})

export const getFishContentList = (): FishContentDefinition[] => contentRegistry.listByType('fish')
export const getFishContent = (speciesId: string): FishContentDefinition | null => contentRegistry.getById('fish', speciesId)
export const getStarterFishContentIds = (): string[] => contentRegistry.getStarterIds('fish')
