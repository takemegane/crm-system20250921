const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Creating sample products...')

  // サンプル商品を作成
  const products = [
    {
      name: 'プログラミング入門書',
      description: 'プログラミング初心者向けの入門書です。JavaScript、HTML、CSSの基礎から学べます。',
      price: 2980,
      stock: 50,
      category: '書籍',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'Web開発実践ガイド',
      description: 'モダンなWeb開発技術を実践的に学べるガイドブックです。React、Next.js、TypeScriptを使用した開発方法を解説しています。',
      price: 3980,
      stock: 30,
      category: '書籍',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'ワイヤレスマウス',
      description: '高精度なワイヤレスマウスです。エルゴノミクスデザインで長時間の使用でも疲れにくい設計です。',
      price: 4500,
      stock: 25,
      category: '電子機器',
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'プログラマー向けキーボード',
      description: 'メカニカルスイッチを採用したプログラマー向けキーボードです。タイピング感が良く、長時間の作業に最適です。',
      price: 12800,
      stock: 15,
      category: '電子機器',
      imageUrl: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'コーヒーマグカップ',
      description: 'プログラマー専用のコーヒーマグカップです。「Code & Coffee」のロゴ入りで、保温性に優れています。',
      price: 1800,
      stock: 40,
      category: '雑貨',
      imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'デスクライト LED',
      description: '目に優しいLEDデスクライトです。調光機能付きで、長時間の作業でも目の疲労を軽減します。',
      price: 6800,
      stock: 20,
      category: '電子機器',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'プログラミングステッカーセット',
      description: '人気のプログラミング言語やフレームワークのステッカーセットです。ノートPCのデコレーションに最適です。',
      price: 980,
      stock: 100,
      category: '雑貨',
      imageUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    },
    {
      name: 'アルゴリズム教科書',
      description: 'データ構造とアルゴリズムを体系的に学べる教科書です。競技プログラミングや技術面接対策にも役立ちます。',
      price: 4200,
      stock: 35,
      category: '書籍',
      imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      isActive: true
    }
  ]

  for (const productData of products) {
    try {
      const product = await prisma.product.create({
        data: productData
      })
      console.log(`✓ Created product: ${product.name}`)
    } catch (error) {
      console.error(`✗ Failed to create product: ${productData.name}`, error)
    }
  }

  console.log('Sample products created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })