import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SEND_EMAIL'

export interface AuditLogData {
  userId: string
  action: AuditAction
  entity?: string
  entityId?: string
  oldData?: any
  newData?: any
  request?: NextRequest
}

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldData,
  newData,
  request
}: AuditLogData) {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     request?.ip || 
                     'unknown'
    
    const userAgent = request?.headers.get('user-agent') || 'unknown'

    await prisma!.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

export async function logLogin(userId: string, request?: NextRequest) {
  await createAuditLog({
    userId,
    action: 'LOGIN',
    request
  })
}

export async function logLogout(userId: string, request?: NextRequest) {
  await createAuditLog({
    userId,
    action: 'LOGOUT',
    request
  })
}

export async function logCustomerUpdate(
  userId: string, 
  customerId: string, 
  oldData: any, 
  newData: any, 
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'CUSTOMER',
    entityId: customerId,
    oldData,
    newData,
    request
  })
}

export async function logCustomerCreate(
  userId: string, 
  customerId: string, 
  newData: any, 
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: 'CREATE',
    entity: 'CUSTOMER',
    entityId: customerId,
    newData,
    request
  })
}

export async function logEmailSend(
  userId: string, 
  recipients: any[], 
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: 'SEND_EMAIL',
    entity: 'Email',
    newData: { recipientCount: recipients.length, recipients },
    request
  })
}

export async function logCustomerTagUpdate(
  userId: string,
  customerId: string,
  oldTags: any[],
  newTags: any[],
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'CUSTOMER',
    entityId: customerId,
    oldData: { tags: oldTags },
    newData: { tags: newTags },
    request
  })
}

export async function logCustomerCourseUpdate(
  userId: string,
  customerId: string,
  oldCourses: any[],
  newCourses: any[],
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'CUSTOMER',
    entityId: customerId,
    oldData: { courses: oldCourses },
    newData: { courses: newCourses },
    request
  })
}