# CRM管理システム

顧客管理とコース運営のためのWebアプリケーションです。

## 機能

### 現在実装済み
- 管理者認証システム
- 顧客一覧表示
- 顧客詳細表示
- 顧客情報の管理
- コース情報の管理
- 申し込み状況の確認

### 将来実装予定
- 顧客向けマイページ
- オンライン申し込み機能
- 決済システム連携
- メール送信機能
- レポート機能

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite (開発用)、PostgreSQL (本番用対応済み)
- **認証**: NextAuth.js
- **ORM**: Prisma

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な値を設定します：

```bash
cp .env.example .env
```

### 3. データベースの初期化

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースの作成
npm run db:push

# 初期データの投入
node scripts/setup.js
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## ログイン情報

初期セットアップ後、以下の管理者アカウントでログインできます：

- **Email**: admin@example.com
- **Password**: admin123

## プロジェクト構成

```
crm-system/
├── app/                    # Next.js App Router
│   ├── api/               # API ルート
│   ├── dashboard/         # 管理画面
│   ├── login/            # ログインページ
│   └── layout.tsx        # ルートレイアウト
├── components/            # 再利用可能なコンポーネント
├── lib/                  # ユーティリティ関数
├── prisma/               # データベーススキーマ
└── scripts/              # セットアップスクリプト
```

## データベースモデル

### User (管理者)
- 管理者の認証情報

### Customer (顧客)
- 顧客の基本情報（名前、メール、電話番号、住所）

### Course (コース)
- コース情報（名前、説明、価格、期間）

### Enrollment (申し込み)
- 顧客とコースの関係（申し込み状況）

## 開発用コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint

# データベース管理
npm run db:studio    # Prisma Studio起動
npm run db:push      # スキーマ更新
npm run db:generate  # クライアント生成
```

## ライセンス

このプロジェクトはプライベート用途です。