# Research: Aquarium Editor & View Mode

## Decision: 既存フロントエンド構成を継続
**Rationale**: 既存アプリがThree.js + Vite + TypeScriptで構築されており、
水槽描画やUIは同一基盤で拡張できるため。
**Alternatives considered**: 新規フレームワーク導入（却下: 移行コストと学習コストが高い）。

## Decision: 状態保存はlocalStorage + JSON
**Rationale**: 仕様でローカル保存/JSON入出力が明示され、
サーバ不要でオフライン利用可能にできるため。
**Alternatives considered**: IndexedDB（却下: 仕様上必須ではなく複雑性が増す）。

## Decision: テストはVitest + jsdom（TDD）
**Rationale**: 既存ツールチェーンに含まれており、
高速な単体テストでTDDを満たせるため。
**Alternatives considered**: E2E中心（却下: 実行時間と保守負担が増える）。

## Decision: パフォーマンス目標は60fps/段階的劣化
**Rationale**: Constitutionと仕様に一致し、
デスクトップ没入体験とモバイル対応を両立できるため。
**Alternatives considered**: 端末別に同一品質固定（却下: 低性能端末で破綻する）。

## Decision: シームレスなView/Edit切替
**Rationale**: ユーザー要望に基づき、描画を途切れさせない切替が
UXの核心であるため。
**Alternatives considered**: 切替時に一時停止（却下: 没入が損なわれる）。

## Decision: 編集終了時のオートセーブ
**Rationale**: カレント水槽の再現性を高め、
ユーザーの手間を減らすため。
**Alternatives considered**: 手動保存のみ（却下: 体験が煩雑）。
