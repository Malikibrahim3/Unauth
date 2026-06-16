import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  // Templates are global, but the route still requires an authenticated merchant.
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const { data, error } = await serviceClient
    .from(TABLES.DEFAULT_RULE_TEMPLATES)
    .select('id, name, description, conditions, action, condition_operator, sort_order')
    .order('sort_order', { ascending: true });
  if (error) {
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
