import { prisma } from './db'

export type SystemSettings = {
  id: string
  systemName: string
  logoUrl?: string | null
  faviconUrl?: string | null
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  description?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    let settings = await prisma.systemSettings.findFirst({
      where: {
        isActive: true
      }
    })

    // 設定が存在しない場合はデフォルト値を作成
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          systemName: "CRM管理システム",
          primaryColor: "#3B82F6",
          secondaryColor: "#1F2937",
          backgroundColor: "#F8FAFC",
          isActive: true
        }
      })
    }

    return settings
  } catch (error) {
    console.error('Error fetching system settings:', error)
    // エラーの場合はデフォルト値を返す
    return {
      id: 'default',
      systemName: 'CRM管理システム',
      logoUrl: null,
      faviconUrl: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      backgroundColor: '#F8FAFC',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

export function generateCSSVariables(settings: SystemSettings): string {
  return `
    :root {
      --primary-color: ${settings.primaryColor};
      --secondary-color: ${settings.secondaryColor};
      --primary-50: ${hexToHsl(settings.primaryColor, 0.05)};
      --primary-100: ${hexToHsl(settings.primaryColor, 0.1)};
      --primary-600: ${settings.primaryColor};
      --primary-700: ${darkenColor(settings.primaryColor, 10)};
      --primary-800: ${darkenColor(settings.primaryColor, 20)};
    }
  `
}

function hexToHsl(hex: string, alpha: number): string {
  // HEXからRGBに変換
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) - amt
  const G = (num >> 8 & 0x00FF) - amt
  const B = (num & 0x0000FF) - amt
  
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
}