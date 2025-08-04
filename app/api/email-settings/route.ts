import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_EMAIL_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current email settings (only one record should exist)
    let settings = await prisma.emailSettings.findFirst({
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        fromAddress: true,
        fromName: true,
        signature: true,
        isActive: true
        // Don't return smtpPass for security
      }
    })

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.emailSettings.create({
        data: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          fromName: 'CRM管理システム',
          isActive: false
        },
        select: {
          id: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          fromAddress: true,
          fromName: true,
          signature: true,
          isActive: true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_EMAIL_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromAddress, fromName, signature, isActive } = body

    if (!smtpHost || !smtpPort || !fromName) {
      return NextResponse.json(
        { error: 'SMTP Host, Port, and From Name are required' },
        { status: 400 }
      )
    }

    // Get or create settings
    const existingSettings = await prisma.emailSettings.findFirst()

    const updateData: any = {
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser: smtpUser || null,
      fromAddress: fromAddress || null,
      fromName,
      signature: signature || null,
      isActive: Boolean(isActive)
    }

    // Only update password if provided
    if (smtpPass) {
      updateData.smtpPass = smtpPass // In production, this should be encrypted
    }

    let responseSettings
    if (existingSettings) {
      // Update existing settings
      responseSettings = await prisma.emailSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
        select: {
          id: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          fromAddress: true,
          fromName: true,
          signature: true,
          isActive: true
        }
      })
    } else {
      // Create new settings
      responseSettings = await prisma.emailSettings.create({
        data: updateData,
        select: {
          id: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          fromAddress: true,
          fromName: true,
          signature: true,
          isActive: true
        }
      })
    }

    return NextResponse.json(responseSettings)
  } catch (error) {
    console.error('Error updating email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}