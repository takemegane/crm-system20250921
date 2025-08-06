const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🛍️ Setting up course products...')

    // コースとコース専用カテゴリを取得
    const [courses, courseCategories] = await Promise.all([
      prisma.course.findMany({
        where: { isActive: true },
        select: { id: true, name: true, description: true, price: true }
      }),
      prisma.category.findMany({
        where: { categoryType: 'COURSE' }
      })
    ])

    console.log(`📚 Found ${courses.length} courses`)
    console.log(`📂 Found ${courseCategories.length} course categories`)

    if (courses.length === 0) {
      throw new Error('No active courses found. Please run setup.js first.')
    }

    if (courseCategories.length === 0) {
      throw new Error('No course categories found. Please run setup-course-categories.js first.')
    }

    const results = {
      created: [],
      skipped: []
    }

    // 各コースに対して商品を作成
    for (const course of courses) {
      // 対応するカテゴリを検索
      const categoryName = `${course.name}商品`
      const category = courseCategories.find(cat => cat.name === categoryName)

      if (!category) {
        console.log(`⚠️ No category found for course: ${course.name}`)
        continue
      }

      const productName = `${course.name}受講権`
      
      // 既存商品チェック
      const existingProduct = await prisma.product.findFirst({
        where: { 
          name: productName,
          categoryId: category.id
        }
      })

      if (existingProduct) {
        console.log(`ℹ️ Product already exists: ${productName}`)
        results.skipped.push(productName)
        continue
      }

      // コース商品作成
      const newProduct = await prisma.product.create({
        data: {
          name: productName,
          description: `${course.description}\n\n※この商品を購入すると自動的に${course.name}に登録されます。`,
          price: course.price,
          stock: 999, // デジタル商品なので大きな在庫数
          categoryId: category.id,
          sortOrder: results.created.length + 1,
          isActive: true,
          courseMapping: {
            courseId: course.id,
            courseName: course.name,
            autoEnroll: true,
            description: `購入時に${course.name}へ自動登録`
          }
        },
        include: {
          category: true
        }
      })

      console.log(`✅ Created course product: ${newProduct.name}`)
      console.log(`   💰 Price: ¥${newProduct.price}`)
      console.log(`   📂 Category: ${newProduct.category?.name}`)
      console.log(`   🎓 Course Mapping: ${course.name}`)

      results.created.push({
        id: newProduct.id,
        name: newProduct.name,
        courseId: course.id,
        courseName: course.name,
        categoryId: category.id,
        categoryName: category.name,
        price: newProduct.price
      })
    }

    console.log('🎉 Course products setup completed!')
    console.log(`Created: ${results.created.length} products`)
    console.log(`Skipped: ${results.skipped.length} products`)
    
    if (results.created.length > 0) {
      console.log('\n📋 Created products:')
      results.created.forEach(prod => {
        console.log(`  - ${prod.name} (¥${prod.price}) → ${prod.courseName}`)
      })
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️ Skipped products:')
      results.skipped.forEach(name => {
        console.log(`  - ${name}`)
      })
    }

    // 最終確認
    const finalCourseProducts = await prisma.product.findMany({
      where: {
        category: {
          categoryType: 'COURSE'
        }
      },
      include: {
        category: true
      }
    })

    console.log(`\n🔍 Final verification: ${finalCourseProducts.length} course products exist`)
    finalCourseProducts.forEach(prod => {
      const courseMapping = prod.courseMapping
      console.log(`  - ${prod.name} (${prod.category?.name})`)
      if (courseMapping) {
        console.log(`    🎓 Maps to: ${courseMapping.courseName}`)
      }
    })

  } catch (error) {
    console.error('❌ Error setting up course products:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })