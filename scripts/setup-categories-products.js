/**
 * カテゴリ・商品・送料設定のセットアップスクリプト
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('カテゴリ・商品・送料設定のセットアップ開始...')
  
  try {
    // 1. カテゴリ作成
    const categories = [
      { name: 'サプリメント', description: '健康補助食品' },
      { name: '化粧品', description: 'スキンケア用品' },
      { name: '日用品', description: '日常生活用品' }
    ]
    
    const createdCategories = []
    for (const categoryData of categories) {
      const category = await prisma.category.upsert({
        where: { name: categoryData.name },
        update: categoryData,
        create: categoryData
      })
      createdCategories.push(category)
      console.log(`✅ カテゴリ作成: ${category.name}`)
    }
    
    // 2. 商品作成
    const products = [
      {
        name: 'ビタミンC サプリメント',
        description: '高品質なビタミンCサプリメント',
        price: 2500,
        stock: 100,
        categoryId: createdCategories[0].id, // サプリメント
        isActive: true
      },
      {
        name: 'プロテイン パウダー',
        description: 'ホエイプロテイン 1kg',
        price: 4800,
        stock: 50,
        categoryId: createdCategories[0].id, // サプリメント
        isActive: true
      },
      {
        name: 'フェイシャルクリーム',
        description: '保湿効果の高いフェイシャルクリーム',
        price: 3200,
        stock: 75,
        categoryId: createdCategories[1].id, // 化粧品
        isActive: true
      },
      {
        name: 'アイセラム',
        description: '目元ケア用美容液',
        price: 1000,
        stock: 60,
        categoryId: createdCategories[0].id, // サプリメント（テスト用）
        isActive: true
      },
      {
        name: 'オーガニック石鹸',
        description: '天然成分100%の石鹸',
        price: 800,
        stock: 200,
        categoryId: createdCategories[2].id, // 日用品
        isActive: true
      }
    ]
    
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData
      })
      console.log(`✅ 商品作成: ${product.name} - ¥${product.price}`)
    }
    
    // 3. 送料設定作成
    const shippingRates = [
      {
        categoryId: createdCategories[0].id, // サプリメント
        shippingFee: 300,
        freeShippingThreshold: 8000
      },
      {
        categoryId: createdCategories[1].id, // 化粧品
        shippingFee: 400,
        freeShippingThreshold: 12000
      },
      {
        categoryId: createdCategories[2].id, // 日用品
        shippingFee: 200,
        freeShippingThreshold: 5000
      },
      {
        // デフォルト送料（カテゴリなし）
        categoryId: null,
        shippingFee: 500,
        freeShippingThreshold: 10000
      }
    ]
    
    for (const rateData of shippingRates) {
      const rate = await prisma.shippingRate.create({
        data: rateData
      })
      const categoryName = rateData.categoryId 
        ? createdCategories.find(c => c.id === rateData.categoryId)?.name 
        : 'デフォルト'
      console.log(`✅ 送料設定作成: ${categoryName} - ¥${rate.shippingFee} (¥${rate.freeShippingThreshold}以上で無料)`)
    }
    
    // 4. 顧客ECユーザー設定
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('customer123', 12)
    
    await prisma.customer.updateMany({
      where: { email: 'suzuki@example.com' },
      data: {
        isECUser: true,
        password: hashedPassword
      }
    })
    console.log('✅ 鈴木花子をECユーザーに設定')
    
    console.log('\n🎉 カテゴリ・商品・送料設定のセットアップ完了!')
    console.log('\n📊 作成されたデータ:')
    console.log(`- カテゴリ: ${categories.length}件`)
    console.log(`- 商品: ${products.length}件`)
    console.log(`- 送料設定: ${shippingRates.length}件`)
    
  } catch (error) {
    console.error('❌ セットアップエラー:', error)
    throw error
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })