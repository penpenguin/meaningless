# Feature Specification: Aquarium Editor & View Mode

**Feature Branch**: `001-aquarium-editor`  
**Created**: 2026-01-13  
**Status**: Draft  
**Input**: User description: "View/Edit分離の水槽体験、テーマ/魚群編集、保存/再現、JSON入出力、段階的劣化"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 編集して鑑賞に戻る (Priority: P1)

ユーザーはEditモードで水槽の見た目と魚群を調整し、ViewモードでUIを最小化して鑑賞する。
切替はシームレスで、水槽表示が途切れない。

**Why this priority**: 主要価値は「自分の水槽を作り、没入して鑑賞できること」だから。

**Independent Test**: 1回のセッションでEdit→Viewの切替と、変更が反映されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** 初期水槽を表示中、**When** Editモードに切替、**Then** サイドパネルが表示され編集UIが有効になる
2. **Given** Editモードでテーマや魚群を変更、**When** Viewモードに戻る、**Then** 変更内容が反映されたまま最小UIで鑑賞できる
3. **Given** Editモードで調整中、**When** Viewモードへ切替、**Then** 水槽表示が途切れずに切替が完了する

---

### User Story 2 - 保存して再現する (Priority: P2)

ユーザーは水槽を名前付きで保存し、後で同じ状態を再現できる。

**Why this priority**: 「自分の水槽」を保持し、繰り返し楽しむ体験が必要だから。

**Independent Test**: 保存→別状態に変更→読込で元の状態が再現されることを確認できる。

**Acceptance Scenarios**:

1. **Given** 編集済みの水槽、**When** 名前を付けて保存、**Then** 保存一覧に追加される
2. **Given** 別の状態へ変更済み、**When** 保存一覧から読込、**Then** 保存時のテーマ/魚群/設定が復元される

---

### User Story 3 - JSONで移植する (Priority: P3)

ユーザーは水槽をJSONでエクスポート/インポートし、別環境でも再現できる。

**Why this priority**: 共有・バックアップの要望に応えるため。

**Independent Test**: エクスポート→インポートで同一状態が再現されることを確認できる。

**Acceptance Scenarios**:

1. **Given** 任意の水槽状態、**When** JSONをエクスポート、**Then** 復元可能なJSONが取得できる
2. **Given** 有効なJSON、**When** インポート、**Then** 現在の水槽がインポート内容に置き換わる

---

### Edge Cases

- 破損したJSONをインポートした場合、現在の水槽は維持され、エラーが通知される
- 未知の`schemaVersion`または欠損フィールドがある場合、互換変換または安全な初期化が行われる
- 未知の`speciesId`やアセット欠損がある場合、デフォルト魚に置き換える
- 保存領域が不足している場合、保存失敗を明確に通知し既存データを破壊しない
- オートセーブに失敗した場合、現在の水槽は維持され、失敗が通知される
- 低性能端末では魚数/粒子が制限されても体験が破綻しない

## Clarifications

### Session 2026-01-13

- Q: 編集と鑑賞はシームレスにしたい → A: Edit/View切替はシームレスで水槽表示が途切れない
- Q: カレントの水槽は、編集終了時にオートセーブとしたい → A: Editモード終了時にカレント水槽を自動保存する

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムはViewモードとEditモードを明確に分離し提供する
- **FR-002**: Viewモードでは最小UI（モード切替・必要最低限のトグル）のみを表示する
- **FR-003**: Editモードではサイドパネルで編集UIを提供する
- **FR-004**: 画面は全画面の水槽表示とし、UIは半透明オーバーレイで重ねる
- **FR-005**: ユーザーは種別一覧から群れを追加し、群れ単位で追加/削除/匹数調整できる
- **FR-006**: 群れの挙動調整は速度、cohesion、separation、alignment、avoidWalls、好む深さに限定する
- **FR-007**: テーマ編集でガラス縁/フレーム強度、水色、フォグ、微粒子密度、波（強さ/速度）を調整できる
- **FR-008**: 水槽状態は`schemaVersion`、`theme`、`fishGroups`、`settings`を含む形で保存される
- **FR-009**: 名前付き保存、上書き保存、削除ができる保存管理を提供する
- **FR-010**: 保存一覧から読込を行い、保存時の状態を再現できる
- **FR-011**: JSONエクスポート/インポートを提供し、インポート時は現在の水槽を置き換える
- **FR-012**: 不正データやアセット欠損時は安全にフォールバックし、ユーザーへ通知する
- **FR-013**: View/Edit切替はシームレスで、水槽表示が途切れない
- **FR-014**: Editモード終了時にカレントの水槽を自動保存する

### Non-Functional Requirements

- **NFR-001**: デスクトップでは滑らかな鑑賞体験（目標60fps）を維持する
- **NFR-002**: モバイルでは段階的劣化（魚数/粒子の削減など）を提供する
- **NFR-003**: 追加される魚種が増えても、群れ単位の管理で極端に重くならない

### Data & Persistence *(include if feature involves state)*

- **DP-001**: `fishGroups`は`{ speciesId, count, tuning? }`の配列である
- **DP-002**: `theme`は水色・フォグ・微粒子・波・ガラス縁/フレーム強度を含む
- **DP-003**: スキーマ変更時はマイグレーション方針とリカバリ方針を定義する
- **DP-004**: オートセーブは最新のカレント水槽を保持し、編集終了時に更新される

### Key Entities *(include if feature involves data)*

- **AquariumState**: `schemaVersion`と`theme`、`fishGroups`、`settings`を持つ水槽状態
- **FishGroup**: 同一種の群れ（`speciesId`と`count`と挙動調整）
- **Species**: 種別情報（表示名、説明、見た目参照、サイズ、色バリエーション）
- **Theme**: 水槽の見た目パラメータ一式
- **SaveSlot**: 保存名と保存日時、保存された`AquariumState`
- **AutoSave**: 編集終了時に自動保存されるカレント水槽
- **Settings**: 音・モーションなどユーザー設定

## Constitution Alignment *(mandatory)*

- [ ] View/Editの分離とView最小UI、Editサイドパネルの要件を満たしている
- [ ] 状態スキーマ/保存/JSON入出力/マイグレーション方針が明確
- [ ] 魚は群れ単位で編集し、調整項目は最小セットに限定
- [ ] パフォーマンス目標と段階的劣化の方針が明確
- [ ] テスト戦略がTDD前提（Red→Green→Refactor）になっている

## Assumptions

- 保存は同一端末・同一ブラウザ内で完結し、ログインやクラウド同期は対象外
- 保存スロット数に固定上限は設けず、端末の保存可能範囲で管理する
- インポートは現在の水槽に即時反映し、必要に応じて新規保存できる
- Species一覧はアプリに同梱されたカタログを用いる

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ユーザーの80%以上が5分以内にEdit→Viewの切替と鑑賞に到達できる
- **SC-002**: 保存→読込の往復で、テーマと魚群の一致が95%以上再現される
- **SC-003**: 有効なJSONのインポート成功率が95%以上、無効JSONは100%拒否される
- **SC-004**: デスクトップでは既定条件で滑らかな鑑賞体験（目標60fps）が維持される
