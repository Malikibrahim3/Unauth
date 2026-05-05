import { type FullConfig } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const CREDENTIALS_PATH = path.join(__dirname, '.ux-audit-credentials.json')

async function globalTeardown(config: FullConfig) {
  void config
  loadEnvConfig(process.cwd())

  if (!fs.existsSync(CREDENTIALS_PATH)) return

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  try {
    await supabase.auth.admin.deleteUser(credentials.userId)
  } catch (err) {
    console.warn('[UX audit teardown] Could not delete test account:', err)
  }

  fs.unlinkSync(CREDENTIALS_PATH)
}

export default globalTeardown
