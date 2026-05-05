import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const CREDENTIALS_PATH = path.join(__dirname, '.test-credentials.json')

async function globalTeardown(config: FullConfig) {
  void config

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log('[Teardown] No test credentials found — nothing to clean up')
    return
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  console.log('[Teardown] Cleaning up test account:', credentials.email)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    await supabase.auth.admin.deleteUser(credentials.userId)
    console.log('[Teardown] Test account deleted')
  } catch (err) {
    console.warn('[Teardown] Could not delete test account:', err)
  }

  fs.unlinkSync(CREDENTIALS_PATH)

  const pdfsDir = path.join(__dirname, 'reports/pdfs')
  if (fs.existsSync(pdfsDir)) {
    fs.rmSync(pdfsDir, { recursive: true })
  }

  console.log('[Teardown] Complete')
}

export default globalTeardown
