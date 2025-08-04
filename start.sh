#!/bin/bash

echo "=== CRM管理システム 起動スクリプト ==="
echo "作業ディレクトリ: $(pwd)"
echo ""

# プロセス確認
if pgrep -f "next dev" > /dev/null; then
    echo "⚠️  既にNext.jsサーバーが動作中です"
    echo "停止する場合は: pkill -f 'next dev'"
    echo ""
else
    echo "🚀 サーバーを起動中..."
    nohup npm run dev > server.log 2>&1 &
    sleep 3
    
    if pgrep -f "next dev" > /dev/null; then
        echo "✅ サーバーが正常に起動しました"
    else
        echo "❌ サーバーの起動に失敗しました"
        echo "ログを確認してください: tail server.log"
        exit 1
    fi
fi

echo ""
echo "📊 CRMシステム情報:"
echo "  URL: http://localhost:3000"
echo "  管理者ログイン:"
echo "    Email: admin@example.com"
echo "    Password: admin123"
echo ""
echo "🔧 開発用コマンド:"
echo "  サーバー停止: pkill -f 'next dev'"
echo "  ログ確認: tail -f server.log"
echo "  DB管理: npm run db:studio"
echo ""
echo "📁 主要ファイル:"
echo "  開発記録: CLAUDE.md"
echo "  設定: .env"
echo "  スキーマ: prisma/schema.prisma"
echo ""

# データベース確認
echo "💾 データベース状態:"
if [ -f "dev.db" ]; then
    USER_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    CUSTOMER_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM Customer;" 2>/dev/null || echo "0")
    echo "  ユーザー数: $USER_COUNT"
    echo "  顧客数: $CUSTOMER_COUNT"
    
    if [ "$USER_COUNT" = "0" ]; then
        echo "  ⚠️  管理者ユーザーが見つかりません"
        echo "  復旧コマンド: node scripts/setup.js"
    fi
else
    echo "  ❌ データベースファイルが見つかりません"
    echo "  初期化コマンド: npm run db:push && node scripts/setup.js"
fi

echo ""
echo "🎯 次回開発用チェックリスト:"
echo "  □ サーバーが起動していることを確認"
echo "  □ ログインが正常に動作することを確認" 
echo "  □ 顧客一覧が表示されることを確認"
echo "  □ 新機能の要件を整理"
echo ""