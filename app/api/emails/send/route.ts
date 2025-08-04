import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logEmailSend } from '@/lib/audit'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'SEND_INDIVIDUAL_EMAIL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, customerId, subject, content, recipientEmail, recipientName } = body

    if (!subject || !content || !recipientEmail) {
      return NextResponse.json(
        { error: 'Subject, content, and recipient email are required' },
        { status: 400 }
      )
    }

    // Send email using Gmail SMTP
    try {
      await sendEmail({
        to: recipientEmail,
        toName: recipientName,
        subject,
        html: content,
        customerId: customerId || undefined,
        templateId: templateId || undefined
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      return NextResponse.json(
        { error: emailError instanceof Error ? emailError.message : 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log the email sending action
    await logEmailSend(
      session.user.id,
      [{ email: recipientEmail, name: recipientName }],
      request
    )

    return NextResponse.json({ 
      message: 'Email sent successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}