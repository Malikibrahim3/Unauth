import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { simulateRule } from '@/lib/rules/versioning';
import { validateSimulationSignals } from '@/lib/rules/simulation';
import type { RuleCondition } from '@/lib/rules-engine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const version = (await service.from(TABLES.MERCHANT_RULE_VERSIONS).select('*').eq('merchant_id', ctx.merchantId).eq('merchant_rule_id', id).in('status', ['draft', 'published']).order('version', { ascending: false }).limit(1).maybeSingle()).data;
  if (!version) return NextResponse.json({ error: 'Rule version not found' }, { status: 404 });
  const conditions = (Array.isArray(version.conditions) ? version.conditions : []) as RuleCondition[];
  const parsed = validateSimulationSignals(conditions, await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const rule = { id, merchant_id: ctx.merchantId, name: version.name, description: version.description, is_active: true, priority: version.priority, conditions, action: version.action, condition_operator: version.condition_operator };
  return NextResponse.json({ version: version.version, simulation: simulateRule(rule as never, parsed.signals), notice: 'Simulation is read-only and never writes a decision.' });
}
