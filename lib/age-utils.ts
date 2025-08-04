/**
 * 生年月日から現在の年齢を計算する
 * @param birthDate 生年月日（ISO文字列）
 * @returns 年齢（数値）
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

/**
 * 年齢を表示用文字列に変換する
 * @param birthDate 生年月日（ISO文字列）
 * @returns 表示用年齢文字列（例: "25歳"）
 */
export function formatAge(birthDate: string): string {
  try {
    const age = calculateAge(birthDate)
    return `${age}歳`
  } catch (error) {
    return ''
  }
}

/**
 * 性別を表示用文字列に変換する
 * @param gender 性別
 * @returns 表示用性別文字列
 */
export function formatGender(gender?: string): string {
  switch (gender) {
    case '男':
      return '男性'
    case '女':
      return '女性'
    case '未回答':
      return '未回答'
    default:
      return '未設定'
  }
}