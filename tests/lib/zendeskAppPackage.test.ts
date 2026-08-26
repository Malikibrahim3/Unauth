import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const ZENDESK_ROOT = path.join(REPO_ROOT, 'extensions', 'zendesk');
const REQUIRED_IN_ZIP = [
  'manifest.json',
  'translations/en.json',
  'assets/iframe.html',
  'assets/logo.png',
  'assets/logo-small.png',
];

describe('Zendesk app package', () => {
  let tempDir: string;
  let zipPath: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unauth-zendesk-package-'));
    zipPath = path.join(tempDir, 'unauth-zendesk-app.zip');
    execSync('node scripts/package-zendesk-app.mjs', {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      env: { ...process.env, ZENDESK_OUTPUT_PATH: zipPath },
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('includes all required files at the zip root', () => {
    const listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
    for (const file of REQUIRED_IN_ZIP) {
      expect(listing).toContain(file);
    }
    expect(listing).not.toMatch(/\sindex\.html$/);
  });

  it('manifest points to assets/iframe.html over HTTPS-capable setup', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ZENDESK_ROOT, 'manifest.json'), 'utf8'),
    ) as {
      defaultLocale: string;
      domainWhitelist: string[];
      location: { support: { ticket_sidebar: { url: string } } };
    };
    expect(manifest.defaultLocale).toBe('en');
    expect(manifest.location.support.ticket_sidebar.url).toBe('assets/iframe.html');
    expect(manifest.domainWhitelist.length).toBeGreaterThan(0);
  });

  it('iframe loads ZAF SDK over HTTPS', () => {
    const html = fs.readFileSync(path.join(ZENDESK_ROOT, 'assets', 'iframe.html'), 'utf8');
    expect(html).toContain('https://static.zdassets.com/zendesk_app_framework_sdk/2.0/zaf_sdk.min.js');
  });
});
