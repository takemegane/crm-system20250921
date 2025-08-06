const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🎓 Setting up course-specific categories...')

    // 既存のコースを取得
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true
      }
    })

    console.log(`📚 Found ${courses.length} active courses:`)
    courses.forEach(course => {
      console.log(`  - ${course.name} (¥${course.price})`)
    })

    // 既存のCOURSEカテゴリを確認
    const existingCourseCategories = await prisma.category.findMany({
      where: { categoryType: 'COURSE' }
    })

    console.log(`📂 Found ${existingCourseCategories.length} existing course categories`)

    const results = {
      created: [],
      skipped: []
    }

    // 各コースに対してカテゴリを作成
    for (const course of courses) {
      const categoryName = `${course.name}商品`
      
      // 既存チェック
      const existingCategory = await prisma.category.findFirst({
        where: { name: categoryName }
      })

      if (existingCategory) {
        console.log(`ℹ️ Category already exists: ${categoryName}`)
        results.skipped.push(categoryName)
        continue
      }

      // コース専用カテゴリ作成
      const newCategory = await prisma.category.create({
        data: {
          name: categoryName,
          description: `${course.name}に関連する商品カテゴリ（コース自動付与）`,
          categoryType: 'COURSE',
          sortOrder: 100 + results.created.length, // 他のカテゴリより後に表示
          isActive: true
        }
      })

      console.log(`✅ Created course category: ${newCategory.name}`)
      results.created.push({
        id: newCategory.id,
        name: newCategory.name,
        courseId: course.id,
        courseName: course.name
      })
    }

    // デフォルト送料設定があることを確認
    const defaultShippingRate = await prisma.shippingRate.findFirst({
      where: { categoryId: null }
    })

    if (!defaultShippingRate) {
      console.log('📦 Creating default shipping rate...')
      await prisma.shippingRate.create({
        data: {
          categoryId: null,
          shippingFee: 500,
          freeShippingThreshold: 10000,
          isActive: true
        }
      })
      console.log('✅ Default shipping rate created')
    } else {
      console.log('✅ Default shipping rate already exists')
    }

    console.log('🎉 Course category setup completed!')
    console.log(`Created: ${results.created.length} categories`)
    console.log(`Skipped: ${results.skipped.length} categories`)
    
    if (results.created.length > 0) {
      console.log('\n📋 Created categories:')
      results.created.forEach(cat => {
        console.log(`  - ${cat.name} (for ${cat.courseName})`)
      })
    }

    if (results.skipped.length > 0) {
      console.log('\n⏭️ Skipped categories:')
      results.skipped.forEach(name => {
        console.log(`  - ${name}`)
      })
    }

    // 最終確認
    const finalCourseCategories = await prisma.category.findMany({
      where: { categoryType: 'COURSE' }
    })

    console.log(`\n🔍 Final verification: ${finalCourseCategories.length} course categories exist`)
    finalCourseCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.isActive ? 'Active' : 'Inactive'})`)
    })

  } catch (error) {
    console.error('❌ Error setting up course categories:', error)
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