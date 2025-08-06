const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up database...')

  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'システム管理者',
      password: hashedPassword,
      role: 'OWNER',
    },
  })

  console.log('Admin user created:', admin.email)

  const course1 = await prisma.course.upsert({
    where: { id: 'course1' },
    update: {},
    create: {
      id: 'course1',
      name: 'ベーシックコース',
      description: '初心者向けの基本コース',
      price: 10000,
      duration: 90, // 3ヶ月（90日）
    },
  })

  const course2 = await prisma.course.upsert({
    where: { id: 'course2' },
    update: {},
    create: {
      id: 'course2',
      name: 'アドバンスコース',
      description: '上級者向けの応用コース',
      price: 20000,
      duration: 180, // 6ヶ月（180日）
    },
  })

  console.log('Sample courses created')

  const customer1 = await prisma.customer.upsert({
    where: { email: 'tanaka@example.com' },
    update: {},
    create: {
      name: '田中太郎',
      email: 'tanaka@example.com',
      phone: '090-1234-5678',
      address: '東京都渋谷区1-1-1',
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { email: 'suzuki@example.com' },
    update: {},
    create: {
      name: '鈴木花子',
      email: 'suzuki@example.com',
      phone: '090-8765-4321',
      address: '大阪府大阪市2-2-2',
    },
  })

  console.log('Sample customers created')

  await prisma.enrollment.upsert({
    where: {
      customerId_courseId: {
        customerId: customer1.id,
        courseId: course1.id,
      },
    },
    update: {},
    create: {
      customerId: customer1.id,
      courseId: course1.id,
      status: 'ACTIVE',
    },
  })

  await prisma.enrollment.upsert({
    where: {
      customerId_courseId: {
        customerId: customer2.id,
        courseId: course2.id,
      },
    },
    update: {},
    create: {
      customerId: customer2.id,
      courseId: course2.id,
      status: 'ACTIVE',
    },
  })

  console.log('Sample enrollments created')

  // サンプルタグの作成
  const tag1 = await prisma.tag.upsert({
    where: { id: 'tag001' },
    update: {},
    create: {
      id: 'tag001',
      name: 'VIP顧客',
      color: '#ff6b6b',
    },
  })

  const tag2 = await prisma.tag.upsert({
    where: { id: 'tag002' },
    update: {},
    create: {
      id: 'tag002',
      name: '新規顧客',
      color: '#4ecdc4',
    },
  })

  const tag3 = await prisma.tag.upsert({
    where: { id: 'tag003' },
    update: {},
    create: {
      id: 'tag003',
      name: '継続顧客',
      color: '#45b7d1',
    },
  })

  const tag4 = await prisma.tag.upsert({
    where: { id: 'tag004' },
    update: {},
    create: {
      id: 'tag004',
      name: '要注意',
      color: '#feca57',
    },
  })

  const tag5 = await prisma.tag.upsert({
    where: { id: 'tag005' },
    update: {},
    create: {
      id: 'tag005',
      name: '優良顧客',
      color: '#48dbfb',
    },
  })

  console.log('Sample tags created')

  // 管理者ユーザーの作成
  const adminPassword = await bcrypt.hash('admin456', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      name: '管理者',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log('Admin user created:', adminUser.email)

  // 運営者ユーザーの作成
  const operatorPassword = await bcrypt.hash('operator789', 12)
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      name: '運営者',
      password: operatorPassword,
      role: 'OPERATOR',
    },
  })

  console.log('Operator user created:', operatorUser.email)

  // システム設定の初期化
  const systemSettings = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      systemName: 'CRM管理システム',
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      description: '顧客管理システム',
      isActive: true,
    },
  })

  console.log('System settings created')

  // メールテンプレートの初期化
  const emailTemplate = await prisma.emailTemplate.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'デフォルトテンプレート',
      subject: 'お知らせ',
      content: `
        <p>{{customer_name}} 様</p>
        <p>いつもお世話になっております。</p>
        <p>こちらはテンプレートメールです。</p>
        <p>よろしくお願いいたします。</p>
      `,
      isDefault: true,
    },
  })

  console.log('Email template created')

  console.log('Setup completed!')
  console.log('')
  console.log('ログイン情報:')
  console.log('オーナー - Email: admin@example.com, Password: admin123')
  console.log('管理者 - Email: manager@example.com, Password: admin456')
  console.log('運営者 - Email: operator@example.com, Password: operator789')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })