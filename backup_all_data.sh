#!/bin/bash
# 🛡️ 全データバックアップスクリプト（作業前必須）
# 使用方法: ./backup_all_data.sh

cd "/Users/motoki/Desktop/claude code/crm-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p backup

echo "🛡️ 全データバックアップ開始: $TIMESTAMP"

# 1. 顧客データ（最重要）
sqlite3 prisma/dev.db "SELECT * FROM Customer;" > backup/customers_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT COUNT(*) as total FROM Customer;" > backup/customer_count_$TIMESTAMP.txt

# 2. 注文データ（最重要）
sqlite3 prisma/dev.db "SELECT * FROM \`Order\`;" > backup/orders_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT * FROM OrderItem;" > backup/order_items_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT COUNT(*) as total FROM \`Order\`;" > backup/order_count_$TIMESTAMP.txt

# 3. システム設定（最重要）
sqlite3 prisma/dev.db "SELECT * FROM SystemSettings WHERE isActive = 1;" > backup/system_settings_$TIMESTAMP.txt
ls -la public/uploads/ > backup/uploads_$TIMESTAMP.txt

# 4. 商品・カテゴリデータ
sqlite3 prisma/dev.db "SELECT * FROM Product;" > backup/products_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT * FROM Category;" > backup/categories_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT * FROM ShippingRate;" > backup/shipping_rates_$TIMESTAMP.txt

# 5. ユーザー・権限データ
sqlite3 prisma/dev.db "SELECT * FROM User;" > backup/users_$TIMESTAMP.txt

# 6. コース・タグデータ
sqlite3 prisma/dev.db "SELECT * FROM Course;" > backup/courses_$TIMESTAMP.txt
sqlite3 prisma/dev.db "SELECT * FROM Tag;" > backup/tags_$TIMESTAMP.txt

# 7. メール関連データ
sqlite3 prisma/dev.db "SELECT * FROM EmailTemplate;" > backup/email_templates_$TIMESTAMP.txt

# 8. カート・関連データ
sqlite3 prisma/dev.db "SELECT * FROM CartItem;" > backup/cart_items_$TIMESTAMP.txt

# 9. 重要設定の詳細保存
sqlite3 prisma/dev.db "SELECT systemName, logoUrl, faviconUrl, primaryColor, secondaryColor, communityLinkText, communityLinkUrl FROM SystemSettings WHERE isActive = 1;" > backup/key_settings_$TIMESTAMP.txt

echo "✅ 全データバックアップ完了: backup/*_$TIMESTAMP.txt"
echo "📊 バックアップファイル数: $(ls backup/*_$TIMESTAMP.txt | wc -l)"

# バックアップ結果サマリー
echo ""
echo "📋 バックアップサマリー:"
echo "顧客データ: $(wc -l < backup/customer_count_$TIMESTAMP.txt | tr -d ' ') 件"
echo "注文データ: $(wc -l < backup/order_count_$TIMESTAMP.txt | tr -d ' ') 件"
echo "システム名: $(cat backup/key_settings_$TIMESTAMP.txt | cut -d'|' -f1)"
echo "作成時刻: $TIMESTAMP"