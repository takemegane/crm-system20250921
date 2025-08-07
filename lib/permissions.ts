export type UserRole = 'OPERATOR' | 'ADMIN' | 'OWNER'

export type Permission = 
  | 'VIEW_CUSTOMERS'
  | 'CREATE_CUSTOMERS' 
  | 'EDIT_CUSTOMERS'
  | 'DELETE_CUSTOMERS'
  | 'ARCHIVE_CUSTOMERS'
  | 'RESTORE_CUSTOMERS'
  | 'BULK_UPLOAD_CUSTOMERS'
  | 'EXPORT_CUSTOMERS'
  | 'CHANGE_CUSTOMER_PASSWORD'
  | 'VIEW_COURSES'
  | 'CREATE_COURSES'
  | 'EDIT_COURSES'
  | 'DELETE_COURSES'
  | 'EXPORT_COURSES'
  | 'VIEW_TAGS'
  | 'CREATE_TAGS'
  | 'EDIT_TAGS'
  | 'DELETE_TAGS'
  | 'EXPORT_TAGS'
  | 'VIEW_PRODUCTS'
  | 'CREATE_PRODUCTS'
  | 'EDIT_PRODUCTS'
  | 'DELETE_PRODUCTS'
  | 'MANAGE_PRODUCTS'
  | 'VIEW_ORDERS'
  | 'EDIT_ORDERS'
  | 'MANAGE_ORDERS'
  | 'VIEW_EMAIL_TEMPLATES'
  | 'CREATE_EMAIL_TEMPLATES'
  | 'EDIT_EMAIL_TEMPLATES'
  | 'DELETE_EMAIL_TEMPLATES'
  | 'SEND_INDIVIDUAL_EMAIL'
  | 'SEND_BULK_EMAIL'
  | 'VIEW_EMAIL_LOGS'
  | 'MANAGE_EMAIL_SETTINGS'
  | 'VIEW_ADMINS'
  | 'CREATE_ADMINS'
  | 'EDIT_ADMINS'
  | 'DELETE_ADMINS'
  | 'MANAGE_PERMISSIONS'
  | 'VIEW_AUDIT_LOGS'
  | 'EDIT_PROFILE'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OPERATOR: [
    'VIEW_CUSTOMERS',
    'CREATE_CUSTOMERS',
    'EDIT_CUSTOMERS',
    'EXPORT_CUSTOMERS',
    'VIEW_COURSES',
    'VIEW_TAGS',
    'VIEW_PRODUCTS',
    'VIEW_ORDERS',
    'EDIT_ORDERS',
    'VIEW_EMAIL_TEMPLATES',
    'CREATE_EMAIL_TEMPLATES',
    'EDIT_EMAIL_TEMPLATES',
    'SEND_INDIVIDUAL_EMAIL',
    'SEND_BULK_EMAIL',
    'VIEW_EMAIL_LOGS',
    'EDIT_PROFILE'
  ],
  ADMIN: [
    'VIEW_CUSTOMERS',
    'CREATE_CUSTOMERS',
    'EDIT_CUSTOMERS',
    'DELETE_CUSTOMERS',
    'ARCHIVE_CUSTOMERS',
    'RESTORE_CUSTOMERS',
    'BULK_UPLOAD_CUSTOMERS',
    'EXPORT_CUSTOMERS',
    'CHANGE_CUSTOMER_PASSWORD',
    'VIEW_COURSES',
    'CREATE_COURSES',
    'EDIT_COURSES',
    'DELETE_COURSES',
    'EXPORT_COURSES',
    'VIEW_TAGS',
    'CREATE_TAGS',
    'EDIT_TAGS',
    'DELETE_TAGS',
    'EXPORT_TAGS',
    'VIEW_PRODUCTS',
    'CREATE_PRODUCTS',
    'EDIT_PRODUCTS',
    'DELETE_PRODUCTS',
    'MANAGE_PRODUCTS',
    'VIEW_ORDERS',
    'EDIT_ORDERS',
    'VIEW_EMAIL_TEMPLATES',
    'CREATE_EMAIL_TEMPLATES',
    'EDIT_EMAIL_TEMPLATES',
    'DELETE_EMAIL_TEMPLATES',
    'SEND_INDIVIDUAL_EMAIL',
    'SEND_BULK_EMAIL',
    'VIEW_EMAIL_LOGS',
    'VIEW_ADMINS',
    'CREATE_ADMINS',
    'VIEW_AUDIT_LOGS',
    'EDIT_PROFILE'
  ],
  OWNER: [
    'VIEW_CUSTOMERS',
    'CREATE_CUSTOMERS',
    'EDIT_CUSTOMERS',
    'DELETE_CUSTOMERS',
    'ARCHIVE_CUSTOMERS',
    'RESTORE_CUSTOMERS',
    'BULK_UPLOAD_CUSTOMERS',
    'EXPORT_CUSTOMERS',
    'CHANGE_CUSTOMER_PASSWORD',
    'VIEW_COURSES',
    'CREATE_COURSES',
    'EDIT_COURSES',
    'DELETE_COURSES',
    'EXPORT_COURSES',
    'VIEW_TAGS',
    'CREATE_TAGS',
    'EDIT_TAGS',
    'DELETE_TAGS',
    'EXPORT_TAGS',
    'VIEW_PRODUCTS',
    'CREATE_PRODUCTS',
    'EDIT_PRODUCTS',
    'DELETE_PRODUCTS',
    'MANAGE_PRODUCTS',
    'VIEW_ORDERS',
    'EDIT_ORDERS',
    'MANAGE_ORDERS',
    'VIEW_EMAIL_TEMPLATES',
    'CREATE_EMAIL_TEMPLATES',
    'EDIT_EMAIL_TEMPLATES',
    'DELETE_EMAIL_TEMPLATES',
    'SEND_INDIVIDUAL_EMAIL',
    'SEND_BULK_EMAIL',
    'VIEW_EMAIL_LOGS',
    'MANAGE_EMAIL_SETTINGS',
    'VIEW_ADMINS',
    'CREATE_ADMINS',
    'EDIT_ADMINS',
    'DELETE_ADMINS',
    'MANAGE_PERMISSIONS',
    'VIEW_AUDIT_LOGS',
    'EDIT_PROFILE'
  ]
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

export function getUserPermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || []
}

export function canAccessAdminFeatures(userRole: UserRole): boolean {
  return hasPermission(userRole, 'VIEW_ADMINS')
}

export function canManageAdmins(userRole: UserRole): boolean {
  return hasPermission(userRole, 'CREATE_ADMINS') && 
         hasPermission(userRole, 'EDIT_ADMINS') && 
         hasPermission(userRole, 'DELETE_ADMINS')
}

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  OPERATOR: '運営者',
  ADMIN: '管理者',
  OWNER: 'オーナー権限'
}

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

export const ROLE_OPTIONS = [
  { value: 'OPERATOR' as UserRole, label: '運営者' },
  { value: 'ADMIN' as UserRole, label: '管理者' },
  { value: 'OWNER' as UserRole, label: 'オーナー権限' }
]