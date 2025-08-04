import nodemailer from 'nodemailer'
import { getPrismaClient } from '@/lib/db'

export interface EmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  customerId?: string
  templateId?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      throw new Error('Prisma client not initialized')
    }

    // Get email settings
    const settings = await prisma.emailSettings.findFirst()

    if (!settings || !settings.isActive) {
      throw new Error('メール送信が無効になっています')
    }

    if (!settings.smtpUser || !settings.smtpPass) {
      throw new Error('SMTPの設定が不完全です')
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    })

    // Prepare email content with signature
    let htmlContent = options.html
    if (settings.signature) {
      htmlContent += `<br><br>${settings.signature.replace(/\n/g, '<br>')}`
    }

    // Send email
    const info = await transporter.sendMail({
      from: {
        name: settings.fromName,
        address: settings.fromAddress || settings.smtpUser
      },
      to: options.toName ? `${options.toName} <${options.to}>` : options.to,
      subject: options.subject,
      html: htmlContent,
    })

    // Log successful send
    await prisma.emailLog.create({
      data: {
        templateId: options.templateId,
        customerId: options.customerId,
        subject: options.subject,
        content: options.html,
        recipientEmail: options.to,
        recipientName: options.toName,
        status: 'SENT',
        sentAt: new Date(),
      }
    })

    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Email send error:', error)

    // Log failed send
    try {
      const logPrisma = getPrismaClient()
      if (logPrisma) {
        await logPrisma.emailLog.create({
          data: {
            templateId: options.templateId,
            customerId: options.customerId,
            subject: options.subject,
            content: options.html,
            recipientEmail: options.to,
            recipientName: options.toName,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          }
        })
      }
    } catch (logError) {
      console.error('Failed to log email error:', logError)
    }

    throw error
  }
}

export async function sendBulkEmails(emails: EmailOptions[]): Promise<{ success: number, failed: number }> {
  let success = 0
  let failed = 0

  for (const emailOptions of emails) {
    try {
      await sendEmail(emailOptions)
      success++
    } catch (error) {
      console.error(`Failed to send email to ${emailOptions.to}:`, error)
      failed++
    }
    
    // Add small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed }
}