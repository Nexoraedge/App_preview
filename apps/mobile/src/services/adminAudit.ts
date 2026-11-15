import { getSupabaseClient } from '@adityam/supabase';

export interface AuditLogInput {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  sourcePanel?: 'ADMIN' | 'STAFF_CALL_CENTER' | 'STAFF_FINANCE' | 'PARTNER_PORTAL';
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logAdminAudit(input: AuditLogInput): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('admin_audit_logs').insert({
      actor_id: input.actorId || null,
      actor_name: input.actorName,
      actor_role: input.actorRole,
      source_panel: input.sourcePanel || 'ADMIN',
      action: input.action,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      details: input.details || {},
    });
  } catch (err) {
    console.warn('[AdminAudit] log skipped:', err);
  }
}
