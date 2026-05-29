import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { createMerchantApiKey } from '@/lib/api/apiKeys';
import { withRequestLogging } from '@/lib/log';
import { env } from '@/lib/utils/env';

export const dynamic = 'force-dynamic';

async function GETHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  // Mint a dedicated API key and bake it into the packaged app so the merchant
  // never has to copy-paste a secret during the Zendesk install. The key is
  // revocable from Settings → API & Integrations like any other.
  const created = await createMerchantApiKey(service, ctx.merchantId, 'Zendesk app');
  if (!created) {
    return NextResponse.json({ error: 'Failed to provision the Zendesk app key.' }, { status: 500 });
  }

  const extensionDir = path.join(process.cwd(), 'extensions', 'zendesk');
  const [manifest, indexHtmlRaw] = await Promise.all([
    readFile(path.join(extensionDir, 'manifest.json'), 'utf8'),
    readFile(path.join(extensionDir, 'index.html'), 'utf8'),
  ]);

  // The app calls back into this deployment; point it at the URL that served
  // the download so the packaged app always targets the right host.
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const indexHtml = indexHtmlRaw
    .replaceAll('__UNAUTH_APP_BASE__', appBase)
    .replaceAll('__UNAUTH_API_KEY__', created.secret);

  const zip = new JSZip();
  zip.file('manifest.json', manifest);
  zip.file('index.html', indexHtml);
  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="unauth-zendesk-app.zip"',
      'Cache-Control': 'private, no-store',
    },
  });
}

export const GET = withRequestLogging('/api/settings/zendesk/download', GETHandler);
