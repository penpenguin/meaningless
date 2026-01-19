# Data Model: Aquarium Editor & View Mode

## Overview
水槽状態は`AquariumState`として保持し、保存スロット・オートセーブ・
JSON入出力の共通フォーマットとなる。

## Entities

### AquariumState
- **Fields**: `schemaVersion`, `theme`, `fishGroups`, `settings`
- **Relationships**: `theme`(1), `fishGroups`(N), `settings`(1)

### Theme
- **Fields**: `glassFrameStrength`, `waterTint`, `fogDensity`,
  `particleDensity`, `waveStrength`, `waveSpeed`
- **Notes**: UIスライダーで調整可能

### FishGroup
- **Fields**: `speciesId`, `count`, `tuning?`
- **Relationships**: `speciesId` → `Species`

### Tuning
- **Fields**: `speed`, `cohesion`, `separation`, `alignment`,
  `avoidWalls`, `preferredDepth`
- **Notes**: 最小セットのみ、個体ではなく群れ単位で保持

### Species
- **Fields**: `speciesId`, `displayName`, `description`,
  `visualRef`, `size`, `colorVariants`

### SaveSlot
- **Fields**: `id`, `name`, `savedAt`, `state`
- **Relationships**: `state` → `AquariumState`

### AutoSave
- **Fields**: `updatedAt`, `state`
- **Relationships**: `state` → `AquariumState`

### Settings
- **Fields**: `soundEnabled`, `motionEnabled`, `other?`

## Validation Rules
- `schemaVersion`は既知のバージョンであること
- `fishGroups[*].count`は1以上の整数
- `fishGroups[*].speciesId`は`Species`に存在する
- `theme`の全フィールドは必須
- 破損/欠損時はデフォルト値へフォールバック

## State Transitions
- **Edit → View**: 画面は継続描画し、Edit終了時にAutoSaveを更新
- **SaveSlot作成/更新**: 現在の`AquariumState`をスナップショット化
- **Import**: 受け取った`AquariumState`で現在状態を置換
- **Migration**: `schemaVersion`に応じて変換し、失敗時は初期状態
