const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up default email templates...')

  // Check if default template already exists
  const existingDefault = await prisma.emailTemplate.findFirst({
    where: { isDefault: true }
  })

  if (existingDefault) {
    console.log('Default email template already exists')
    return
  }

  // Create default welcome email template
  const welcomeTemplate = await prisma.emailTemplate.create({
    data: {
      name: 'ウェルカムメール',
      subject: '{{customer_name}}様、ご入会ありがとうございます',
      content: `{{customer_name}}様

この度はご入会いただき、誠にありがとうございます。

■ お客様の登録情報
・お名前: {{customer_name}}
・メールアドレス: {{customer_email}}
・ご入会日: {{customer_joined_date}}

今後、コースやイベントに関する最新情報をお送りさせていただきます。
ご不明な点やご質問がございましたら、お気軽にお問い合わせください。

これからもどうぞよろしくお願いいたします。

──────────────────────
CRM管理システム
お問い合わせ: info@example.com
──────────────────────`,
      isDefault: true,
      isActive: true
    }
  })

  // Create course notification template
  const courseTemplate = await prisma.emailTemplate.create({
    data: {
      name: 'コース案内メール',
      subject: '新しいコースのご案内',
      content: `{{customer_name}}様

いつもお世話になっております。

新しいコースのご案内をお送りします。
ご興味がございましたら、ぜひお申し込みください。

■ コース詳細
・コース名: [コース名を記載]
・開催日時: [日時を記載]
・料金: [料金を記載]
・定員: [定員を記載]

お申し込みやご質問は、お気軽にお問い合わせください。

よろしくお願いいたします。

──────────────────────
CRM管理システム
お問い合わせ: info@example.com
──────────────────────`,
      isDefault: false,
      isActive: true
    }
  })

  console.log('Created default email templates:')
  console.log('- Welcome email template:', welcomeTemplate.name)
  console.log('- Course notification template:', courseTemplate.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })