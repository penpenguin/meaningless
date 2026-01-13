# Repository Guidelines

## Serena Tooling Expectations
- Default to Serena's MCP integrations whenever you need context; it centralizes specs, saved memories, and helper scripts so agents stay in sync.
- Kick off each session by opening the Serena Instructions Manual (call `mcp__serena__initial_instructions`) and listing resources via `list_mcp_resources` to learn what's already documented before poking around the repo.
- Use `read_mcp_resource` (or the parameterized templates) instead of ad-hoc browsing when you need docs from `docs/` or historical decisions, and record new findings with `write_memory` so future agents inherit them.
- Favor Serena's memory + resource workflow during hand-offs (e.g., summarize outstanding bugs, feature flags, or test gaps) to minimize institutional knowledge loss.

## プロジェクト構成
- `src/main.ts`: Vite エントリ。シーン初期化と UI トグルを束ねる。
- `src/components/`: 水面・魚群・泡・サウンドなど主要クラス群（例: `AdvancedScene`, `Water`, `Fish`, `AudioManager`）。
- `src/shaders/`: GLSL 資産。`vite-plugin-glsl` 経由でインポート。
- `src/utils/`, `src/types/`: 共通処理と型定義。
- `public/`: 静的ファイルと `index.html`。`dist/` はビルド成果物なので直接編集しない。

## ビルド・テスト・開発コマンド
- `npm run dev` — 開発サーバー起動（デフォルト http://localhost:5173）。
- `npm run build` — TypeScript コンパイル後に Vite ビルドし、`dist/` へ出力。
- `npm run preview` — ビルド済み成果物をローカルで確認。
- `npm run lint` — ESLint（ts/tsx）を実行。警告ゼロが前提。
- `npm run typecheck` — `tsc --noEmit` による型検証。
- 単体テスト導入時は `npm run test` を追加し、CI でも同じコマンドを使う。

## コーディングスタイル・命名
- TypeScript ES Modules、2 スペースインデント、セミコロンなし（既存ファイルに合わせる）。
- クラス・コンポーネント名は PascalCase、関数・変数は camelCase。
- Shader は `.glsl` 拡張子で管理し、モジュールから直接 import する。
- Tailwind/DaisyUI はユーティリティを論理的にグループ化し、可読性を優先。

## テスト指針（t-wada TDD）
- すべて Red → Green → Refactor を最小ステップで実施。バグ修正前に必ず失敗するテストを追加。
- 推奨スタック: Vitest + jsdom。セットアップ例: `npm install -D vitest jsdom @testing-library/dom`.
- 配置: `src/__tests__/` もしくは対象モジュール横の `*.test.ts`。`describe` に対象名を明示。
- 目安カバレッジ: Boids 挙動・水面シェーダー・オーディオ制御で statement/branch 80% 以上を狙う。

## コミット & PR ガイド
- Conventional Commits を推奨（例: `feat: add quality selector`, `fix: resolve audio crackle`）。本文は日本語でも可。
- 1 コミット 1 意図。TDD の各ステップを分けられるなら `test:` → `fix:` の順で残す。
- PR には目的、主要変更点、テスト結果、UI 変更があればスクリーンショットまたは短尺動画を添付。関連 Issue をリンク。

## セキュリティ / 設定メモ
- Secrets は扱わない。鍵・トークンを `public/` 以下に置かない。
- `vite.config.ts` で alias や plugin を追加する際は開発・本番の両方で動作確認し、必要なら設定を README に追記。

## Active Technologies
- TypeScript 5.3.3 + Three.js 0.161, Vite 7.2, TailwindCSS 3.4, DaisyUI 4.6, Tweakpane 4.0, vite-plugin-glsl 1.5 (001-aquarium-editor)
- localStorage（保存スロット/オートセーブ）、インメモリ（カレント状態） (001-aquarium-editor)

## Recent Changes
- 001-aquarium-editor: Added TypeScript 5.3.3 + Three.js 0.161, Vite 7.2, TailwindCSS 3.4, DaisyUI 4.6, Tweakpane 4.0, vite-plugin-glsl 1.5
