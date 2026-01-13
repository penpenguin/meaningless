# Aquarium Web App

リアルなアクアリウム風静的Webアプリケーション。ブラウザのみで動作し、ユーザに「癒し」を提供します。

## 🎣 機能

- **リアル水槽表現**: 六面体ガラス水槽とThree.jsによる物理的に正確な水面表現
- **魚群アニメーション**: Boidsアルゴリズムによる自然な魚の群れの動き（最大100匹）
- **水の物理表現**: 波紋ノーマルマップと屈折シェーダーによるリアルな水面
- **泡システム**: シェーダーベースの泡パーティクル
- **編集/鑑賞モード**: Edit/Viewの切替、半透明オーバーレイUI
- **テーマ/魚群編集**: 水色・フォグ・波・微粒子、群れ単位の追加/削除/匹数調整
- **保存/再現**: ローカル保存スロット、オートセーブ、JSONエクスポート/インポート
- **アクセシビリティ**: Motion ON/OFF切替、音声ON/OFF切替
- **パフォーマンス最適化**: モバイル対応、60FPS動作

## 🛠 技術スタック

- **フロントエンド**: Three.js (r161以降), TypeScript
- **スタイル**: TailwindCSS, DaisyUI
- **ビルド**: Vite + vite-plugin-glsl
- **CI/CD**: GitHub Actions
- **デプロイ**: GitHub Pages

## 🚀 セットアップ

### 前提条件
- Node.js 18以上
- npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/penpenguin/meaningless.git
cd meaningless

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### ビルド

```bash
# プロダクションビルド
npm run build

# プレビュー
npm run preview
```

### 開発コマンド

```bash
# 型チェック
npm run typecheck

# Lint
npm run lint
```

## 🎮 使い方

1. ブラウザでアプリケーションを開く
2. 右上のトグルでMotion ON/OFFを切り替え
3. 音声ON/OFFで環境音を制御
4. マウス/タッチで水槽を回転・ズーム

## ⚡ パフォーマンス

- Lighthouse Performance スコア: ≥90
- モバイルデバイス: 45FPS以上
- CPU 5×スロットル環境: 45FPS以上
- 魚の数：PC 100匹、モバイル 50匹以下に自動調整

## ♿ アクセシビリティ

- WCAG 2.3.3準拠
- `prefers-reduced-motion`に対応
- Motion OFF時は静止画表示

## 🎨 カラーパレット

- ベースカラー: `#0e3d4e`
- アクセント: `#6ac7d6`
- 背景グラデーション: 上部薄色→下部濃色

## 📄 ライセンス

MIT License

### 使用アセット

- 環境音: 自作の生成ループ音声 (`public/underwater-loop.wav`, `scripts/underwater-loop.js` で生成)

## 🔗 リンク

- [Live Demo](https://penpenguin.github.io/meaningless/)
- [GitHub Repository](https://github.com/penpenguin/meaningless)

## 🤝 貢献

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
