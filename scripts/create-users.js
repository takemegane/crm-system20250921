const bcrypt = require('bcryptjs')
const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('dev.db')

async function createUsers() {
  try {
    // ハッシュ化されたパスワードを生成
    const ownerPassword = await bcrypt.hash('admin123', 12)
    const adminPassword = await bcrypt.hash('admin456', 12) 
    const operatorPassword = await bcrypt.hash('operator789', 12)

    // 既存のユーザーを削除
    db.run('DELETE FROM User', (err) => {
      if (err) console.log('Delete error (ignore):', err.message)
    })

    // 新しいユーザーを作成
    db.serialize(() => {
      const stmt = db.prepare('INSERT INTO User (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)')
      
      stmt.run('owner001', 'admin@example.com', 'システム管理者', ownerPassword, 'OWNER')
      stmt.run('admin001', 'manager@example.com', '管理者', adminPassword, 'ADMIN') 
      stmt.run('operator001', 'operator@example.com', '運営者', operatorPassword, 'OPERATOR')
      
      stmt.finalize()
      
      console.log('ユーザーアカウントが作成されました:')
      console.log('オーナー - Email: admin@example.com, Password: admin123')
      console.log('管理者 - Email: manager@example.com, Password: admin456')
      console.log('運営者 - Email: operator@example.com, Password: operator789')
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
  }
}

createUsers()