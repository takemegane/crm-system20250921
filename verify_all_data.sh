#!/bin/bash
# 🔍 作業後データ保持確認スクリプト（必須実行）
# 使用方法: ./verify_all_data.sh

cd "/Users/motoki/Desktop/claude code/crm-system"
echo "🔍 作業後データ保持確認開始"

# 1. 顧客データ保持確認
CUSTOMER_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Customer;")
echo "👥 顧客データ: $CUSTOMER_COUNT 件"

# 2. 注文データ保持確認
ORDER_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM \`Order\`;")
echo "📦 注文データ: $ORDER_COUNT 件"

# 3. システム設定保持確認
SYSTEM_NAME=$(sqlite3 prisma/dev.db "SELECT systemName FROM SystemSettings WHERE isActive = 1;")
echo "⚙️  システム名: $SYSTEM_NAME"

# 4. 商品データ保持確認
PRODUCT_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Product;")
echo "🛍️  商品データ: $PRODUCT_COUNT 件"

# 5. ユーザーデータ保持確認
USER_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;")
echo "👤 ユーザーデータ: $USER_COUNT 件"

# 6. コースデータ保持確認
COURSE_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Course;")
echo "📚 コースデータ: $COURSE_COUNT 件"

# 7. タグデータ保持確認
TAG_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Tag;")
echo "🏷️  タグデータ: $TAG_COUNT 件"

# 8. システム動作確認
echo ""
echo "🔧 システム動作確認:"
SERVER_CHECK=$(curl -s http://localhost:3000/login | head -1)
if [[ $SERVER_CHECK == *"<!DOCTYPE html"* ]]; then
    echo "✅ サーバー: 正常稼働"
else
    echo "❌ サーバー: 異常あり"
fi

# 9. 重要設定確認
LOGO_URL=$(sqlite3 prisma/dev.db "SELECT logoUrl FROM SystemSettings WHERE isActive = 1;")
if [[ -n "$LOGO_URL" && "$LOGO_URL" != "" ]]; then
    echo "✅ ロゴ設定: $LOGO_URL"
else
    echo "⚠️  ロゴ設定: 未設定"
fi

echo ""
echo "✅ 全データ保持確認完了"
echo "📊 確認日時: $(date '+%Y/%m/%d %H:%M:%S')"