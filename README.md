# Aquarium Web App

Three.js ベースのブラウザ水槽ゲームです。3D の水槽表現に、魚の解放・配置・メンテナンス・オフライン進行を組み合わせた single-page app として動作します。

## 機能

- 立体水槽、魚群、装飾、ライティングを含むリアルタイム描画
- `Tank` / `Unlock` / `Layout` / `Progress` / `Settings` の HUD パネル
- 魚種と装飾の解放、配置、匹数調整、メンテナンス操作
- localStorage ベースの保存と、旧保存形式からの起動時マイグレーション
- 環境音、`prefers-reduced-motion`、描画 quality 切替への対応

## セットアップ

```bash
npm install
npm run dev
```

## コマンド

```bash
npm run build
npm run preview
npm run test
npm run lint
npm run typecheck
```

## 使い方

1. アプリを開く
2. 上部 HUD で `Tank` / `Unlock` / `Layout` / `Progress` / `Settings` を切り替える
3. `Unlock` で魚や装飾を解放する
4. `Layout` で魚数とレイアウトを調整する
5. `Settings` で音、モーション、品質を変更する

## アセット

- 環境音: `public/underwater-loop.wav`
- 生成スクリプト: `scripts/underwater-loop.js`

## ライセンス

MIT
