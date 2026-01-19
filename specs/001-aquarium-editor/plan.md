# Implementation Plan: Aquarium Editor & View Mode

**Branch**: `001-aquarium-editor` | **Date**: 2026-01-13 | **Spec**: /home/user/repository/meaningless/specs/001-aquarium-editor/spec.md
**Input**: Feature specification from `/home/user/repository/meaningless/specs/001-aquarium-editor/spec.md`

**Note**: This template is filled in by the planning workflow (manual or automation).
Complete the Constitution Check before Phase 0 research.

## Summary

View/Editのシームレス切替、全画面Canvas上の半透明UI、テーマと魚群の群れ編集、
編集終了時オートセーブ、保存スロット管理、JSON入出力とマイグレーションを備えた
水槽エディタ機能を提供する。

## Technical Context

**Language/Version**: TypeScript 5.3.3
**Primary Dependencies**: Three.js 0.161, Vite 7.2, TailwindCSS 3.4, DaisyUI 4.6, Tweakpane 4.0, vite-plugin-glsl 1.5
**Storage**: localStorage（保存スロット/オートセーブ）、インメモリ（カレント状態）
**Testing**: Vitest + jsdom（TDD必須）
**Target Platform**: モダンWebブラウザ（デスクトップ/モバイル）
**Project Type**: 単一フロントエンドWebアプリ
**Performance Goals**: デスクトップ60fps目標、モバイル段階的劣化
**Constraints**: サーバ不要・オフライン可、UIは半透明オーバーレイ、
  View/Edit分離とシームレス切替、群れ単位編集、保存/JSON入出力、
  `schemaVersion`マイグレーション
**Scale/Scope**: 単一ユーザー/単一水槽セッション、魚数は端末性能に応じて調整

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] View/Edit分離とView最小UI、Editサイドパネルの方針を明記する
- [x] 全画面Canvas + DPR制御 + 半透明オーバーレイUIの要件を満たす
- [x] 状態スキーマ（schemaVersion/theme/fishGroups/settings）と
      保存/JSON入出力/マイグレーション計画を明記する
- [x] 魚は群れ単位（speciesId + count）で扱い、調整項目は最小セットに限定する
- [x] 60fps目標とモバイル段階的劣化の計画、素材共有方針を明記する
- [x] TDD計画（Red→Green→Refactor、Vitest + jsdom）を明記する

**Post-Design Re-check (2026-01-13)**: 上記すべて合格

## Project Structure

### Documentation (this feature)

```text
/home/user/repository/meaningless/specs/001-aquarium-editor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
/home/user/repository/meaningless/
├── src/
│   ├── main.ts
│   ├── components/
│   ├── shaders/
│   ├── utils/
│   └── types/
├── public/
└── src/__tests__/ or src/**/*.test.ts
```

**Structure Decision**: 既存の単一フロントエンド構成を維持し、
機能追加は`/home/user/repository/meaningless/src/`配下へ実装する。
テストは`src/__tests__/`または対象モジュール近傍に追加する。

## Complexity Tracking

No violations.
