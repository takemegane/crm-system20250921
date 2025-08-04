/**
 * セッション無効化スクリプト
 * Next.js起動時のログイン問題を解決するため、古いセッションを削除
 */

const fs = require('fs')
const path = require('path')

function clearSessions() {
  console.log('🧹 セッションクリア開始...')
  
  try {
    // 1. .next/cache内のセッション関連キャッシュを削除
    const nextCachePath = path.join(process.cwd(), '.next/cache')
    if (fs.existsSync(nextCachePath)) {
      console.log('📁 .next/cache削除中...')
      fs.rmSync(nextCachePath, { recursive: true, force: true })
      console.log('✅ .next/cache削除完了')
    }
    
    // 2. Next.js全体のキャッシュをクリア
    const nextPath = path.join(process.cwd(), '.next')
    if (fs.existsSync(nextPath)) {
      console.log('📁 .next削除中...')
      fs.rmSync(nextPath, { recursive: true, force: true })
      console.log('✅ .next削除完了')
    }
    
    console.log('✅ セッションクリア完了')
    console.log('💡 ブラウザでサイトにアクセスし、Ctrl+Shift+R (または Cmd+Shift+R) でハードリフレッシュしてください')
    
  } catch (error) {
    console.error('❌ セッションクリアエラー:', error.message)
  }
}

clearSessions()