import fs from 'fs';
import path from 'path';

export const AUTH_DIR = path.join(__dirname, '.auth');
export const CREDENTIALS_PATH = path.join(AUTH_DIR, 'support-credentials.json');
export const VIEW_TOKEN_PATH = path.join(AUTH_DIR, 'profile-view-token.json');

export type LightAuthState = {
  email: string;
  userId: string;
  merchantId: string;
  profileId: string;
  tokenHash: string;
  runId: string;
};

export function readLightAuthState(): LightAuthState | null {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8')) as LightAuthState;
}

export async function cleanupLightAuthData(
  supabase: {
    from: (table: string) => any;
    auth: { admin: { deleteUser: (userId: string) => Promise<unknown> } };
  },
  state: LightAuthState,
): Promise<void> {
  await supabase
    .from('profile_view_tokens')
    .delete()
    .eq('token_hash', state.tokenHash)
    .eq('profile_id', state.profileId)
    .eq('merchant_id', state.merchantId);

  await supabase
    .from('customer_profiles')
    .delete()
    .eq('id', state.profileId);

  await supabase
    .from('merchants')
    .delete()
    .eq('id', state.merchantId)
    .eq('user_id', state.userId);

  await supabase.auth.admin.deleteUser(state.userId);
}

export function removeLightAuthFiles(): void {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}
