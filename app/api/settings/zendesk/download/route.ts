import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
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
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const { count, error: countError } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', ctx.merchantId)
    .is('revoked_at', null);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (!count || count < 1) {
    return NextResponse.json(
      { error: 'Create an API key in Settings → API & Integrations before downloading the Zendesk app.' },
      { status: 400 }
    );
  }

  const extensionDir = path.join(process.cwd(), 'extensions', 'zendesk');
  const [manifest, indexHtmlRaw] = await Promise.all([
    readFile(path.join(extensionDir, 'manifest.json')),
    readFile(path.join(extensionDir, 'index.html'), 'utf8'),
  ]);

  // The app calls back into this deployment; point it at the URL that served
  // the download so the packaged app always targets the right host.
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const indexHtml = indexHtmlRaw.replaceAll('__UNAUTH_APP_BASE__', appBase);

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
