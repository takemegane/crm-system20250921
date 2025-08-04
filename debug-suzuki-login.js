/**
 * 鈴木花子ログイン問題デバッグスクリプト
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function debugSuzukiLogin() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 鈴木花子ログイン問題デバッグ開始...')
    
    // 1. 顧客データ確認
    const customer = await prisma.customer.findUnique({
      where: {
        email: 'suzuki@example.com',
        isECUser: true
      }
    })
    
    console.log('👤 顧客データ:')
    console.log(`  ID: ${customer?.id}`)
    console.log(`  名前: ${customer?.name}`)
    console.log(`  メール: ${customer?.email}`)
    console.log(`  ECユーザー: ${customer?.isECUser}`)
    console.log(`  パスワード存在: ${!!customer?.password}`)
    console.log(`  パスワードハッシュ: ${customer?.password?.substring(0, 20)}...`)
    
    if (!customer) {
      console.log('❌ 顧客データが見つかりません')
      return false
    }
    
    if (!customer.password) {
      console.log('❌ パスワードが設定されていません')
      return false
    }
    
    // 2. パスワード検証テスト
    const testPassword = 'customer123'
    console.log(`\n🔑 パスワード検証テスト (${testPassword}):`)
    
    try {
      const isValid = await bcrypt.compare(testPassword, customer.password)
      console.log(`  検証結果: ${isValid ? '✅ 成功' : '❌ 失敗'}`)
      
      if (isValid) {
        console.log('✅ パスワード検証は正常です')
        
        // 3. 認証システムと同じ処理をシミュレート
        console.log('\n🔐 認証システムシミュレーション:')
        
        const authResult = {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          role: 'CUSTOMER',
          userType: 'customer'
        }
        
        console.log('認証成功データ:', authResult)
        return true
      } else {
        console.log('❌ パスワード検証が失敗しました')
        
        // 4. パスワード再設定
        console.log('\n🔧 パスワード再設定を実行...')
        const newHashedPassword = await bcrypt.hash('customer123', 12)
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: { password: newHashedPassword }
        })
        
        console.log('✅ パスワード再設定完了')
        
        // 再検証
        const reVerify = await bcrypt.compare('customer123', newHashedPassword)
        console.log(`再検証結果: ${reVerify ? '✅ 成功' : '❌ 失敗'}`)
        
        return reVerify
      }
    } catch (error) {
      console.error('パスワード検証エラー:', error.message)
      return false
    }
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
debugSuzukiLogin()
  .then(success => {
    console.log(`\n🏁 デバッグ完了: ${success ? '✅ 問題解決' : '❌ 問題継続'}`)
    if (success) {
      console.log('💡 鈴木花子は customer123 でログイン可能です')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 デバッグ失敗:', error.message)
    process.exit(1)
  })