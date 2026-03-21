import { decorContentDefinitions } from './decor'
import { fishContentDefinitions } from './fish'
import { isStarterUnlockRule } from './types'
import type {
  ContentDefinitionMap,
  ContentRegistryInput,
  ContentType,
  DecorContentDefinition,
  FishContentDefinition
} from './types'

type ContentRegistry = {
  listByType: <T extends ContentType>(type: T) => ContentDefinitionMap[T][]
  getById: <T extends ContentType>(type: T, id: string) => ContentDefinitionMap[T] | null
  getStarterIds: <T extends ContentType>(type: T) => string[]
}

const cloneFishContent = (definition: FishContentDefinition): FishContentDefinition => ({
  ...definition,
  colorVariants: [...definition.colorVariants],
  unlock: { ...definition.unlock },
  render: { ...definition.render },
  gameplay: { ...definition.gameplay }
})

const cloneDecorContent = (definition: DecorContentDefinition): DecorContentDefinition => ({
  ...definition,
  gameplay: { ...definition.gameplay },
  visual: { ...definition.visual }
})

const cloneContent = <T extends ContentType>(type: T, definition: ContentDefinitionMap[T]): ContentDefinitionMap[T] => {
  return (type === 'fish'
    ? cloneFishContent(definition as FishContentDefinition)
    : cloneDecorContent(definition as DecorContentDefinition)) as ContentDefinitionMap[T]
}

const createLookup = <T extends ContentType>(
  type: T,
  definitions: ContentDefinitionMap[T][],
  getId: (definition: ContentDefinitionMap[T]) => string
): Map<string, ContentDefinitionMap[T]> => {
  const lookup = new Map<string, ContentDefinitionMap[T]>()

  definitions.forEach((definition) => {
    const id = getId(definition)
    if (lookup.has(id)) {
      throw new Error(`Duplicate ${type} content id: ${id}`)
    }
    lookup.set(id, cloneContent(type, definition))
  })

  return lookup
}

export const createContentRegistry = (input: ContentRegistryInput): ContentRegistry => {
  const fishLookup = createLookup('fish', input.fish, (definition) => definition.speciesId)
  const decorLookup = createLookup('decor', input.decor, (definition) => definition.decorId)

  return {
    listByType: <T extends ContentType>(type: T): ContentDefinitionMap[T][] => {
      const entries = type === 'fish'
        ? Array.from(fishLookup.values())
        : Array.from(decorLookup.values())
      return entries.map((entry) => cloneContent(type, entry as ContentDefinitionMap[T]))
    },
    getById: <T extends ContentType>(type: T, id: string): ContentDefinitionMap[T] | null => {
      const entry = type === 'fish'
        ? fishLookup.get(id)
        : decorLookup.get(id)
      if (!entry) return null
      return cloneContent(type, entry as ContentDefinitionMap[T])
    },
    getStarterIds: <T extends ContentType>(type: T): string[] => {
      if (type === 'fish') {
        return Array.from(fishLookup.values())
          .filter((definition) => isStarterUnlockRule(definition.unlock))
          .map((definition) => definition.speciesId)
      }

      return Array.from(decorLookup.values())
        .filter((definition) => definition.gameplay.unlockCost === 0)
        .map((definition) => definition.decorId)
    }
  }
}

export const contentRegistry = createContentRegistry({
  fish: fishContentDefinitions,
  decor: decorContentDefinitions
})

export const getFishContentList = (): FishContentDefinition[] => contentRegistry.listByType('fish')
export const getDecorContentList = (): DecorContentDefinition[] => contentRegistry.listByType('decor')
export const getFishContent = (speciesId: string): FishContentDefinition | null => contentRegistry.getById('fish', speciesId)
export const getDecorContent = (decorId: string): DecorContentDefinition | null => contentRegistry.getById('decor', decorId)
export const getStarterFishContentIds = (): string[] => contentRegistry.getStarterIds('fish')
export const getStarterDecorContentIds = (): string[] => contentRegistry.getStarterIds('decor')
