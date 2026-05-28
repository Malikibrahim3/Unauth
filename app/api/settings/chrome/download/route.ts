import { access, readdir, readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string): Promise<void> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entryZipPath);
    } else {
      const content = await readFile(fullPath);
      zip.file(entryZipPath, content);
    }
  }
}

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
      { error: 'Create an API key in Settings → API & Integrations before downloading the extension.' },
      { status: 400 }
    );
  }

  const distDir = path.join(process.cwd(), 'extensions', 'chrome', 'dist');
  try {
    await access(distDir);
  } catch {
    return NextResponse.json(
      {
        error:
          'Extension build not found. Run npm run build:extension from the project root, then try again.',
      },
      { status: 503 }
    );
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  try {
    await access(manifestPath);
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid extension build (manifest.json missing). Run npm run build:extension and retry.',
      },
      { status: 503 }
    );
  }

  const zip = new JSZip();
  await addDirectoryToZip(zip, distDir, '');
  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="unauth-chrome-extension.zip"',
      'Cache-Control': 'private, no-store',
    },
  });
}

export const GET = withRequestLogging('/api/settings/chrome/download', GETHandler);
