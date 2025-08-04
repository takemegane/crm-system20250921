import LoginForm from './login-form'
import { getSystemSettings } from '@/lib/system-settings'

export default async function LoginPage() {
  const settings = await getSystemSettings()
  return <LoginForm settings={settings} />
}