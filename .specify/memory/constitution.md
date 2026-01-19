<!--
Sync Impact Report
- Version change: N/A (template) → 1.0.0
- Modified principles: N/A (template placeholders replaced)
- Added sections: None (template filled)
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ updated
  - .specify/templates/spec-template.md ✅ updated
  - .specify/templates/tasks-template.md ✅ updated
  - .specify/templates/commands/*.md ⚠️ none found
- Follow-up TODOs: None
-->
# Aquarium Web App Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Core Principles

### I. View/Edit分離と没入優先
- ViewとEditは明確に分離する。Viewモードでは必要最低限のトグルのみを表示する。
- Editモードではサイドパネルを表示し、編集UIを有効化する。
- Canvasは全画面でレスポンシブに描画し、DPR制御を行う。
- UIは水槽の上に半透明オーバーレイとして重ねる。
- UI非表示時でもEsc/アイコンで必ず復帰できる導線を提供する。
理由: 没入感と操作性を同時に担保するため。

### II. 状態は可搬・再現可能（Versioned Aquarium State）
- 水槽の状態はJSONに直列化可能で、`schemaVersion`、`theme`、
  `fishGroups`、`settings`を必ず含む。
- ローカル保存はlocalStorageの複数スロットで行い、名前付き保存、
  上書き保存、削除をMUST提供する。
- JSONエクスポート/インポートをMUST提供する。
- `schemaVersion`によるマイグレーションを用意し、破損時は警告の上で
  デフォルト状態にリカバリする。
理由: “自分の水槽”の再現性と共有性を保証するため。

### III. 群れ単位編集とSpecies拡張性
- 水槽内の魚は「種類×群れ（匹数）」で管理し、UIは個体ではなく
  群れ単位で操作する。
- Species定義は`speciesId`、表示名、説明、見た目参照（スプライト/モデル）、
  サイズ、色バリエーションを含み、追加がデータ駆動で行えること。
- 失敗時はデフォルト魚へフォールバックする。
- 群れ単位でマテリアル共有し、テクスチャ数を制限する。
理由: UXの簡潔さとパフォーマンス/拡張性を両立するため。

### IV. パフォーマンス第一・段階的劣化
- デスクトップは60fpsを目標とし、モバイルは段階的劣化をMUST実装する
  （魚数上限/粒子削減など）。
- 追加機能はパフォーマンス予算に収まる設計であること。
- 1群れ=1マテリアルを基本とし、重い表現は段階的に削る。
理由: 没入体験を維持しつつ幅広い端末で動作させるため。

### V. Test-First（TDD）非交渉
- すべてのコード変更はRed → Green → Refactorで進める。
- バグ修正は必ず失敗するテストを先に追加してから修正する。
- 単体テストはVitest + jsdomを優先し、E2Eは重要フローのみ。
理由: 回帰防止と安全な拡張のため。

## 製品・UX制約
- **演出パラメータ**: ガラス縁/フレーム強度、水色(tint)、水中フォグ、
  微粒子密度、水面波（強さ/速度）を設定可能にする。
- **魚群編集**: Species一覧（サムネ/説明/重さ/推奨匹数）から群れを追加し、
  群れカードで追加/削除/匹数調整を行う。
- **挙動調整（最小セット）**: 速度、cohesion、separation、alignment、
  avoidWalls、好む深さ（surface↔bottom）に限定する。
- **保存/再現**: ローカル複数スロットの保存/読込/上書き/削除を提供する。
- **JSON入出力**: エクスポート/インポートで状態を移植可能にする。
- **既存設定統合**: 音やモーションなど既存設定は`settings`に統合する。

## 開発ワークフロー & 品質ゲート
- 仕様/計画/タスクにはConstitution Checkを必須化し、非準拠は理由を記録する。
- LintとTypecheckは警告ゼロで通過すること。
- パフォーマンス変更は手動計測または軽量計測で60fps目標への影響を確認する。
- `schemaVersion`変更時はマイグレーションと読み込み回復のテストを追加する。
- 失敗時のフォールバック（魚・アセット・保存データ）は必ず実装する。
- コーディング規約は`AGENTS.md`を優先する。

## Governance
- 本Constitutionは他のドキュメントより優先される。
- 変更時はConstitution本文、Sync Impact Report、関連テンプレートを更新し、
  破壊的変更がある場合は移行方針を明記する。
- バージョニングはSemVer準拠:
  MAJOR=後方互換のない原則/ガバナンス変更やデータ互換性破壊、
  MINOR=原則/セクション追加、PATCH=明確化や軽微な修正。
- すべてのPR/レビューでConstitution準拠を確認する。

**Version**: 1.0.0 | **Ratified**: 2026-01-13 | **Last Amended**: 2026-01-13
