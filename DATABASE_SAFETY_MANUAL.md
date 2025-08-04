# CRM システム データベース安全作業マニュアル

## ⚠️ 重要な原則

**データベースの変更作業時は、必ずこのマニュアルに従って作業すること**

既存データの保護が最優先事項です。データ消失は絶対に避けなければなりません。

## 📋 作業前チェックリスト

### 1. 現状確認（必須）
```bash
# データベース接続確認
sqlite3 /Users/motoki/Desktop/claude\ code/crm-system/dev.db ".tables"

# 重要データの件数確認
sqlite3 dev.db "SELECT 'Customers: ' || COUNT(*) FROM Customer;"
sqlite3 dev.db "SELECT 'Tags: ' || COUNT(*) FROM Tag;"
sqlite3 dev.db "SELECT 'CustomerTags: ' || COUNT(*) FROM CustomerTag;"
sqlite3 dev.db "SELECT 'Enrollments: ' || COUNT(*) FROM Enrollment;"
sqlite3 dev.db "SELECT 'Users: ' || COUNT(*) FROM User;"
```

### 2. バックアップ作成（必須）
```bash
# タイムスタンプ付きバックアップ作成
cd /Users/motoki/Desktop/claude\ code/crm-system
cp dev.db "backups/dev_backup_$(date +%Y%m%d_%H%M%S).db"

# または SQLite形式でのバックアップ
sqlite3 dev.db ".backup backups/backup_$(date +%Y%m%d_%H%M%S).db"

# バックアップ確認
ls -la backups/
```

### 3. 作業内容の明確化
- [ ] 何を変更するか明確にする
- [ ] 既存データへの影響を評価する
- [ ] ロールバック方法を確認する

## 🚫 絶対禁止事項

### ❌ 使用厳禁コマンド
```bash
# これらのコマンドは既存データを完全に削除します
npx prisma db push --force-reset  # 絶対使用禁止
npx prisma migrate reset          # 絶対使用禁止
rm dev.db                         # 絶対使用禁止
```

## ✅ 安全な作業手順

### スキーマ変更時の正しい手順

#### 1. 新しいカラム追加の場合
```bash
# 1. バックアップ作成（上記参照）

# 2. 手動でカラム追加
sqlite3 dev.db "ALTER TABLE TableName ADD COLUMN new_column TEXT DEFAULT 'default_value';"

# 3. スキーマファイル更新
# prisma/schema.prisma を編集

# 4. Prismaクライアント再生成
npx prisma generate

# 5. 動作確認
npm run dev
```

#### 2. テーブル構造の大幅変更の場合
```bash
# 1. バックアップ作成

# 2. データエクスポート
sqlite3 dev.db ".mode csv" ".output data_export.csv" "SELECT * FROM TableName;"

# 3. 段階的な変更実施
# 必要に応じて一時テーブルを使用

# 4. データの整合性確認
sqlite3 dev.db "PRAGMA integrity_check;"

# 5. 動作テスト
```

### Prisma操作の安全な使用

#### ✅ 安全なコマンド
```bash
npx prisma generate    # クライアント生成のみ、データに影響なし
npx prisma db push     # 通常のスキーマ同期、既存データ保持
npx prisma studio      # データ閲覧のみ、読み取り専用での使用推奨
```

#### ⚠️ 注意が必要なコマンド
```bash
npx prisma db push     # 使用前に必ずバックアップ
npx prisma migrate dev # マイグレーション作成、慎重に使用
```

## 🔄 ロールバック手順

### データベース復元
```bash
# バックアップからの復元
cd /Users/motoki/Desktop/claude\ code/crm-system
cp backups/dev_backup_YYYYMMDD_HHMMSS.db dev.db

# または
sqlite3 dev.db ".restore backups/backup_YYYYMMDD_HHMMSS.db"

# 復元確認
sqlite3 dev.db "SELECT COUNT(*) FROM Customer;"
```

## 📊 定期的なデータ確認

### 日常点検項目
```bash
# 重要テーブルの整合性確認
sqlite3 dev.db "
SELECT 
  'Customers' as table_name, COUNT(*) as count FROM Customer
UNION ALL
SELECT 'Active Tags', COUNT(*) FROM CustomerTag
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM Enrollment;
"
```

## 🆘 緊急時の対応

### データ消失が発生した場合
1. **即座に作業を停止**
2. **現在のデータベース状態を保存**（さらなる悪化を防ぐため）
3. **最新のバックアップを確認**
4. **ユーザーに状況報告**
5. **バックアップからの復元実施**

### 連絡事項
- データに関わる作業前は必ず事前確認を行う
- 不明な点がある場合は作業を中断して確認する
- バックアップは複数世代保持する

## 📝 作業ログの記録

### 作業実施時の記録項目
```bash
# 作業開始時
echo "$(date): [作業者名] 作業開始 - [作業内容]" >> work_log.txt

# バックアップ作成時
echo "$(date): バックアップ作成 - backup_$(date +%Y%m%d_%H%M%S).db" >> work_log.txt

# 作業完了時
echo "$(date): 作業完了 - [結果]" >> work_log.txt
```

## 🔧 開発環境の管理

### 推奨されるディレクトリ構造
```
crm-system/
├── dev.db              # メインデータベース
├── backups/             # バックアップディレクトリ
│   ├── dev_backup_*.db
│   └── daily_backup_*.db
├── work_log.txt         # 作業ログ
└── DATABASE_SAFETY_MANUAL.md
```

### バックアップディレクトリの作成
```bash
mkdir -p backups
```

---

## ⚡ 緊急参照

**作業前必須チェック:**
1. ✅ 現状確認完了
2. ✅ バックアップ作成完了  
3. ✅ 作業内容明確化完了
4. ✅ ロールバック方法確認完了

**禁止事項確認:**
- ❌ `--force-reset` は使用しない
- ❌ `migrate reset` は使用しない
- ❌ バックアップなしでの変更は行わない

## 🔐 ログイン・認証システムの障害対策

### よくあるログイン機能の障害と対策

#### 1. ログイン後の画面遷移問題
**症状**: ログインできるがダッシュボードに遷移しない
**原因**: NextAuth.jsのリダイレクト設定の問題
**対策**:
```typescript
// ログインフォームでredirect: trueを使用する
const result = await signIn('credentials', {
  email,
  password,
  callbackUrl: '/dashboard',
  redirect: true,  // 自動リダイレクトを有効にする
})
```

#### 2. 認証設定のトラブルシューティング
```bash
# 環境変数の確認
grep -E "NEXTAUTH_URL|NEXTAUTH_SECRET" .env

# 認証APIの動作確認
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@example.com&password=admin123&csrfToken=test&callbackUrl=/dashboard&json=true"

# 管理者ユーザーの存在確認
sqlite3 dev.db "SELECT id, email, name, role FROM User WHERE email='admin@example.com';"
```

#### 3. セッション管理の確認
```bash
# セッション関連のミドルウェア動作確認
tail -f server.log | grep "Authorization"

# セッション情報の確認方法
# ブラウザのデベロッパーツールでコンソールログを確認
```

### UI変更時の必須チェック項目

#### 1. サイドバー表示の確認
- システム名の表示が正しいかチェック
- アイコンの表示が適切かチェック

#### 2. React Hooksの規則遵守
```typescript
// ❌ 間違い: 条件分岐後にuseEffectを配置
function Component() {
  if (condition) return <div>Loading...</div>
  useEffect(() => {}, []) // Hooks規則違反
}

// ✅ 正解: 全てのHooksを最上部に配置
function Component() {
  useEffect(() => {}, []) // Hooksを最初に
  if (condition) return <div>Loading...</div>
}
```

#### 3. TypeScript型定義の整合性
- SystemSettings型の定義がimport元と一致しているか確認
- 未使用のプロパティが型定義に含まれていないか確認

#### 4. ログイン機能修正時の検証手順
```bash
# 1. 開発サーバー再起動
pkill -f "next dev"
nohup npm run dev > server.log 2>&1 &

# 2. ビルドエラーの確認
npm run typecheck
npm run build

# 3. 実際のログインテスト
# ブラウザでhttp://localhost:3000/loginにアクセス
# admin@example.com / admin123 でログイン実行
# ダッシュボードへのリダイレクト確認

# 4. コンソールログの確認
# ブラウザのデベロッパーツール > Consoleタブでエラーをチェック
```

### 🚨 重要な注意事項

#### UI変更時の必須作業
1. **作業前**: このマニュアルを必ず参照
2. **React Hooks**: 条件分岐前に全てのHooksを配置
3. **TypeScript**: 型定義の整合性を確認
4. **ログイン機能**: 変更後は必ず実際にログインテストを実行
5. **開発サーバー**: 重要な変更後は再起動を実行

#### 緊急復旧手順
```bash
# ログイン機能が完全に動作しなくなった場合
# 1. バックアップから復元
cp app/login/login-form.tsx.backup app/login/login-form.tsx

# 2. 開発サーバー再起動
pkill -f "next dev"
npm run dev

# 3. 動作確認
curl -I http://localhost:3000/login
```

### 🐛 繰り返し発生する変数スコープエラーの対策

#### 問題の概要
顧客詳細ページや一括編集ページで、**変数が定義される前に使用される**ことによる実行時エラーが繰り返し発生している。

#### 典型的な症状
- ページが正常に表示されない
- コンソールで `ReferenceError: Cannot access 'variableName' before initialization` エラー
- 関数内で未定義変数を参照することによる予期しない動作

#### 発生した具体例

**1. 顧客詳細ページ（2025/07/24 前回）**
```typescript
// ❌ 間違い: useEffectより後に定義された変数をuseEffect内で使用
useEffect(() => {
  // この時点でfilteredDataは未定義
  if (filteredData.length > 0) { // ReferenceError発生
    // ...
  }
}, [])

const filteredData = data.filter(...) // useEffectより後に定義
```

**2. 一括編集ページ（2025/07/24 今回）**
```typescript
const handleSelectAll = () => {
  if (selectedCustomers.length === filteredCustomers.length) { // ReferenceError発生
    // filteredCustomersがまだ定義されていない
  }
}

// この時点でhandleSelectAllは既に定義済み
const filteredCustomers = customers.filter(...) // 後で定義される
```

#### 根本原因
- **JavaScript/TypeScriptの変数の巻き上げ（Hoisting）**: `const`/`let`は定義前にアクセスできない
- **関数定義と変数定義の順序**: 関数内で使用される変数は、その関数が定義される時点で**既に存在している必要がある**

#### 修正方法

**✅ 正しいパターン: 変数を関数の前に定義**
```typescript
// 1. 全てのuseStateを最初に
const [data, setData] = useState([])
const [searchQuery, setSearchQuery] = useState('')

// 2. データを使用する変数は関数の前に定義
const filteredData = data.filter(item => 
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
)

// 3. その後に関数を定義
const handleSelectAll = () => {
  if (selectedItems.length === filteredData.length) {
    // この時点でfilteredDataは既に定義済み
    setSelectedItems([])
  } else {
    setSelectedItems(filteredData.map(item => item.id))
  }
}

// 4. useEffectは最後
useEffect(() => {
  fetchData()
}, [])
```

#### 予防策と開発時のチェックポイント

**1. コード構造の標準化**
```typescript
function Component() {
  // ❶ useState/useCallback/useMemoを最初に
  const [state, setState] = useState()
  
  // ❷ 計算された値（derived state）
  const computedValue = useMemo(() => calculateValue(state), [state])
  
  // ❸ イベントハンドラー関数
  const handleClick = () => { /* computedValueを安全に使用可能 */ }
  
  // ❹ useEffectは最後
  useEffect(() => {}, [])
  
  // ❺ 早期リターンは全てのHooksの後
  if (loading) return <Loading />
  
  return <div>...</div>
}
```

**2. 必須チェック項目**
- [ ] すべての`useState`、`useEffect`、`useMemo`等のHooksが条件分岐の前に配置されているか
- [ ] 関数内で使用される変数が、その関数定義より前に宣言されているか
- [ ] `const filteredData = data.filter(...)`のような計算値が適切な位置にあるか

**3. デバッグ時の確認方法**
```bash
# 1. TypeScript型チェック（構文エラーをキャッチ）
npm run typecheck

# 2. 開発サーバーのコンソールログを確認
tail -f server.log

# 3. ブラウザのデベロッパーツールでReferenceErrorを確認
```

#### 🚨 重要な注意事項

**修正時の作業手順**
1. **バックアップ作成**: 必ずデータベースとコードのバックアップを取る
2. **React Hooksの順序確認**: 全てのHooksが最上部に配置されているか確認
3. **変数の依存関係確認**: 関数内で使用される変数の定義順序を確認
4. **段階的テスト**: TypeScript → ビルド → 実際の動作確認の順で検証

**再発防止のための開発習慣**
- 新しいコンポーネント作成時は、必ず標準的な構造に従う
- 変数を使用する関数を追加する際は、変数定義の位置を確認
- CODE REVIEWで変数スコープの問題をチェック項目に追加

---

**このマニュアルは CRM システムの貴重なデータを守るために作成されました。**
**必ず遵守して安全な開発を心がけてください。**