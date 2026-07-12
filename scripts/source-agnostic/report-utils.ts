import * as fs from 'fs';
import * as path from 'path';

function env() { const values = { ...process.env } as Record<string, string>; const file = path.join(process.cwd(), '.env.local'); if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !values[match[1]]) values[match[1]] = match[2].trim(); } return values; }
const values = env(); const url = values.SUPABASE_URL || values.NEXT_PUBLIC_SUPABASE_URL; const key = values.SUPABASE_SERVICE_ROLE_KEY;
export const merchantId = values.MERCHANT_ID || process.argv.find((arg) => arg.startsWith('--merchant='))?.slice(11);
export async function rows<T>(table: string, select: string, filters = ''): Promise<T[]> { if (!url || !key) throw new Error('Missing Supabase URL or service role key'); if (!merchantId) throw new Error('Set MERCHANT_ID or pass --merchant=<uuid>'); const query = `select=${encodeURIComponent(select)}&merchant_id=eq.${encodeURIComponent(merchantId)}${filters}`; const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: key, authorization: `Bearer ${key}` } }); if (!response.ok) throw new Error(`${table} read failed: ${response.status}`); return response.json() as Promise<T[]>; }
export function finish(name: string, counts: Record<string, number>, failures: number) { console.log(`${name}: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' ')}`); if (failures) process.exitCode = 2; }
