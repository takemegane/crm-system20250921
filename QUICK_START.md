# CRM システム クイックスタート

## 🚀 即座に開発再開

```bash
cd "/Users/motoki/Desktop/claude code/crm-system"
./start.sh
```

このコマンド一つで：
- サーバー起動
- 状態確認
- ログイン情報表示
- 次のステップガイド

## 📋 次回開発予定機能

### 優先度：高
- [ ] 顧客情報編集機能
  - 編集フォーム作成
  - バリデーション実装
  - API更新機能

### 優先度：中
- [ ] メール送信機能
  - 個別メール送信
  - 一括メール配信
  - テンプレート機能

### 優先度：低
- [ ] コース管理機能
- [ ] レポート機能
- [ ] 顧客向けマイページ

## 🛠️ 開発時の基本コマンド

```bash
# 開発開始
./start.sh

# サーバー停止
pkill -f "next dev"

# データベースリセット（必要時）
rm -f dev.db && npm run db:push && node scripts/setup.js

# 型チェック・リント
npm run typecheck && npm run lint
```

## 📁 重要ファイル

- `CLAUDE.md` - 詳細な開発記録
- `start.sh` - 起動スクリプト
- `app/dashboard/customers/` - 顧客管理機能
- `prisma/schema.prisma` - データベース設計
- `.env` - 環境設定

## 🔑 ログイン情報

- Email: admin@example.com
- Password: admin123
- URL: http://localhost:3000

## 🎯 開発フロー

1. `./start.sh` でシステム起動
2. ブラウザでログイン確認
3. 新機能の実装
4. `npm run typecheck` で型チェック
5. 動作確認
6. `CLAUDE.md` に記録更新