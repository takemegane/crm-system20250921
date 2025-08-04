# CRMシステム - Vercel デプロイメントガイド

## 🚀 デプロイ手順

### 1. GitHub リポジトリ作成
1. GitHub にアクセス
2. 新しいリポジトリを作成
3. リポジトリ名: `crm-system` (または任意の名前)
4. Public または Private を選択

### 2. ローカルリポジトリをGitHubにプッシュ
```bash
# このディレクトリで実行
git add .
git commit -m "Initial commit: CRM system v2.3"
git branch -M main
git remote add origin https://github.com/[YOUR_USERNAME]/[REPOSITORY_NAME].git
git push -u origin main
```

### 3. PostgreSQL データベース準備
以下のいずれかを選択：

#### A. Neon (推奨) - 無料プラン有り
1. https://neon.tech にアクセス
2. アカウント作成
3. 新しいプロジェクト作成
4. Database URL をコピー

#### B. Supabase - 無料プラン有り
1. https://supabase.com にアクセス
2. 新しいプロジェクト作成
3. Settings → Database → Connection string をコピー

### 4. Vercel デプロイ
1. https://vercel.com にアクセス
2. GitHub アカウントでログイン
3. "Import Project" をクリック
4. GitHub リポジトリを選択
5. プロジェクト設定:
   - Framework Preset: Next.js
   - Build and Output Settings: デフォルト
   - Root Directory: `./`

### 5. 環境変数設定
Vercel ダッシュボードで以下を設定：

#### Environment Variables
```
DATABASE_URL=postgresql://[取得したURL]
NEXTAUTH_URL=https://[your-app-name].vercel.app
NEXTAUTH_SECRET=[強力なランダム文字列]
```

#### NEXTAUTH_SECRET 生成方法
```bash
# ターミナルで実行
openssl rand -base64 32
```

### 6. データベース初期化
Vercel デプロイ後、以下を実行：

```bash
# Vercel CLI インストール
npm install -g vercel

# Vercel プロジェクトにリンク
vercel link

# データベースマイグレーション
vercel env pull .env.local
npx prisma migrate deploy
npx prisma generate

# 初期データ投入（本番では手動で実行）
# node scripts/setup.js
```

### 7. 初期管理者アカウント作成
本番環境では手動で管理者を作成：

1. `/register` ページでアカウント作成
2. データベースで権限を OWNER に変更

## 🔧 修正・更新方法

### 通常の修正
```bash
# ローカルで修正
git add .
git commit -m "修正内容の説明"
git push origin main
# → 自動デプロイ
```

### 緊急修正
```bash
# 緊急ブランチ
git checkout -b hotfix/urgent-fix
# 修正...
git add .
git commit -m "緊急修正: [内容]"
git push origin hotfix/urgent-fix
# → Vercel でプレビューデプロイ確認後、main にマージ
```

## 📊 監視・メンテナンス

### Vercel ダッシュボードで確認
- デプロイ状況
- エラーログ
- パフォーマンス
- 使用量

### 定期メンテナンス
- データベースバックアップ
- ログ確認
- セキュリティアップデート

## 🔗 主要URL
- **本番サイト**: https://[your-app-name].vercel.app
- **管理者ログイン**: https://[your-app-name].vercel.app/login
- **Vercel ダッシュボード**: https://vercel.com/dashboard

## 🆘 トラブルシューティング

### デプロイエラー
1. Vercel ダッシュボードのログ確認
2. 環境変数設定確認
3. GitHub リポジトリの設定確認

### データベース接続エラー
1. DATABASE_URL の形式確認
2. PostgreSQL サービスの稼働確認
3. IP許可設定確認（Neon/Supabaseの場合）

## 📝 注意事項
- 本番環境では SQLite ではなく PostgreSQL を使用
- 環境変数は Vercel の Environment Variables に設定
- アップロードファイルは永続ストレージサービス（Cloudinary等）推奨
- 定期的なデータベースバックアップを実施