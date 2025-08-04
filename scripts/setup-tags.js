const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up sample tags...')

  // Create sample tags
  const tags = [
    {
      name: 'VIP顧客',
      color: '#FFD700',
      description: '特別待遇の顧客'
    },
    {
      name: '新規顧客',
      color: '#32CD32',
      description: '入会から3ヶ月以内の顧客'
    },
    {
      name: 'リピーター',
      color: '#4169E1',
      description: '複数コース受講済み'
    },
    {
      name: 'フォロー必要',
      color: '#FF6347',
      description: '特別なフォローが必要な顧客'
    }
  ]

  for (const tag of tags) {
    const existingTag = await prisma.tag.findUnique({
      where: { name: tag.name }
    })

    if (!existingTag) {
      await prisma.tag.create({ data: tag })
      console.log(`Created tag: ${tag.name}`)
    } else {
      console.log(`Tag already exists: ${tag.name}`)
    }
  }

  console.log('Sample tags setup completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })