import { NextResponse } from 'next/server'

/**
 * API統一レスポンス形式
 */

// 成功レスポンス
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Operation successful'
  })
}

// エラーレスポンス
export function errorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json({
    success: false,
    error: {
      message,
      code: code || `HTTP_${status}`,
      timestamp: new Date().toISOString()
    }
  }, { status })
}

// 認証エラー
export function unauthorizedResponse(message: string = '認証が必要です') {
  return errorResponse(message, 401, 'UNAUTHORIZED')
}

// 権限エラー
export function forbiddenResponse(message: string = 'アクセス権限がありません') {
  return errorResponse(message, 403, 'FORBIDDEN')
}

// 見つからないエラー
export function notFoundResponse(message: string = 'リソースが見つかりません') {
  return errorResponse(message, 404, 'NOT_FOUND')
}

// バリデーションエラー
export function validationErrorResponse(message: string, details?: any) {
  return NextResponse.json({
    success: false,
    error: {
      message,
      code: 'VALIDATION_ERROR',
      details,
      timestamp: new Date().toISOString()
    }
  }, { status: 400 })
}

// サーバーエラー
export function internalServerErrorResponse(message: string = 'サーバー内部エラーが発生しました') {
  return errorResponse(message, 500, 'INTERNAL_SERVER_ERROR')
}

// ページネーション付きレスポンス（フロントエンド互換性を保持）
export function paginatedResponse<T>(
  data: T[], 
  currentPage: number, 
  totalPages: number, 
  totalCount: number,
  dataKey: string = 'data'
) {
  const response: any = {
    success: true,
    currentPage,
    totalPages,
    totalCount,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  }
  response[dataKey] = data
  
  return NextResponse.json(response)
}