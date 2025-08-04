import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logEmailSend } from '@/lib/audit'
import { sendBulkEmails } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'SEND_BULK_EMAIL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      templateId, 
      subject, 
      content, 
      includeAll = false,
      selectedTagIds = [], 
      selectedCourseIds = [],
      selectedCustomerIds = []
    } = body

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      )
    }

    // Get recipients based on selection
    let recipients: Array<{ id: string; name: string; email: string }> = []

    if (includeAll) {
      // 全顧客を取得（アーカイブ済みを除く）
      recipients = await prisma.customer.findMany({
        where: {
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    } else {
      // 条件に基づいた顧客を取得
      const whereConditions: any[] = []

      // タグ条件
      if (selectedTagIds.length > 0) {
        whereConditions.push({
          customerTags: {
            some: {
              tagId: {
                in: selectedTagIds
              }
            }
          }
        })
      }

      // コース条件
      if (selectedCourseIds.length > 0) {
        whereConditions.push({
          enrollments: {
            some: {
              courseId: {
                in: selectedCourseIds
              },
              status: 'ACTIVE'
            }
          }
        })
      }

      // 個別選択条件
      if (selectedCustomerIds.length > 0) {
        whereConditions.push({
          id: {
            in: selectedCustomerIds
          }
        })
      }

      if (whereConditions.length > 0) {
        recipients = await prisma.customer.findMany({
          where: {
            isArchived: false,
            OR: whereConditions
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })

        // 重複を削除
        const uniqueRecipients = recipients.reduce((acc, current) => {
          const exists = acc.find(item => item.id === current.id)
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [] as typeof recipients)
        
        recipients = uniqueRecipients
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Prepare emails for bulk sending
    const emailsToSend = recipients.map(recipient => {
      // Replace placeholders in subject and content
      const personalizedSubject = replacePlaceholders(subject, recipient)
      const personalizedContent = replacePlaceholders(content, recipient)

      return {
        to: recipient.email,
        toName: recipient.name,
        subject: personalizedSubject,
        html: personalizedContent,
        customerId: recipient.id,
        templateId: templateId || undefined
      }
    })

    // Send emails using Gmail SMTP
    const sendResults = await sendBulkEmails(emailsToSend)

    // Log the bulk email sending action
    await logEmailSend(
      session.user.id,
      recipients.map(r => ({ email: r.email, name: r.name })),
      request
    )

    return NextResponse.json({ 
      message: 'Bulk emails processed',
      totalCount: recipients.length,
      successCount: sendResults.success,
      failedCount: sendResults.failed,
      details: sendResults.failed > 0 ? 
        `${sendResults.success}件成功、${sendResults.failed}件失敗` : 
        '全て正常に送信されました'
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending bulk emails:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function replacePlaceholders(text: string, customer: { name: string; email: string }): string {
  return text
    .replace(/\{\{customer_name\}\}/g, customer.name)
    .replace(/\{\{customer_email\}\}/g, customer.email)
}