import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  KeyRound,
} from 'lucide-react-native';
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { useAdminAuth } from '../AdminAuthGate';
import { AdminPagination } from '../AdminPagination';
import { AdminPageSkeleton } from '../AdminSkeleton';
import { logAdminAudit } from '../../../src/services/adminAudit';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2EA',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  amberText: '#9A5B13',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
};

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  source_panel: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function AuditLogsSection() {
  const { adminUser, refreshAuth } = useAdminAuth();
  const isAdmin = adminUser?.role === 'admin' || adminUser?.role === 'super_admin';
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [panelFilter, setPanelFilter] = useState<'ALL' | 'ADMIN' | 'STAFF_CALL_CENTER' | 'STAFF_FINANCE'>('ALL');
  const [teamRoleFilter, setTeamRoleFilter] = useState<'ALL' | 'call_center_agent' | 'finance' | 'admin'>('ALL');
  const [activeSubView, setActiveSubView] = useState<'team' | 'logs'>(isAdmin ? 'team' : 'logs');
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // 2FA TOTP enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrSvgDataUri, setQrSvgDataUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);

  // Team & Staff Access state
  const [staffList, setStaffList] = useState<{ id: string; full_name: string | null; email: string | null; role: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'call_center_agent' | 'finance' | 'admin'>('call_center_agent');
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [savingStaff, setSavingStaff] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [logsRes, staffRes] = await Promise.all([
        supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('users')
          .select('id, full_name, email, role')
          .in('role', ['admin', 'super_admin', 'call_center_agent', 'finance'])
          .order('created_at', { ascending: true }),
      ]);
      if (!logsRes.error && Array.isArray(logsRes.data)) {
        setLogs(logsRes.data as AuditLogRow[]);
      }
      if (!staffRes.error && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data as any[]);
      }
    } catch (err) {
      console.warn('[AuditLogs] load warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGrantStaffRole = async () => {
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setStaffMsg('Enter the staff member’s email address.');
      return;
    }
    setSavingStaff(true);
    setStaffMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { data: userRow, error: findErr } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (findErr) throw findErr;
      if (!userRow) {
        setStaffMsg(
          `No user found for ${cleanEmail}. First create their account in Supabase Dashboard → Authentication → Users (Add User with email + password), then click Grant Access here.`
        );
        return;
      }

      const { error: updErr } = await supabase
        .from('users')
        .update({ role: inviteRole, updated_at: new Date().toISOString() })
        .eq('id', userRow.id);
      if (updErr) throw updErr;

      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: 'ADMIN',
          action: 'STAFF_ROLE_GRANTED',
          entityType: 'user',
          entityId: cleanEmail,
          details: { prevRole: userRow.role, newRole: inviteRole },
        });
      }
      setInviteEmail('');
      setStaffMsg(`Granted ${inviteRole} access to ${cleanEmail}. They can now sign in at /admin.`);
      await loadLogs();
    } catch (err: any) {
      setStaffMsg(err?.message || 'Could not update staff role.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleChangeStaffRole = async (
    member: { id: string; full_name: string | null; email: string | null; role: string },
    nextRole: 'call_center_agent' | 'finance' | 'admin'
  ) => {
    if (member.id === adminUser?.id) {
      setStaffMsg('You cannot change your own active role.');
      return;
    }
    if (member.role === nextRole) return;
    setSavingStaff(true);
    setStaffMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('users')
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq('id', member.id);
      if (error) throw error;
      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: 'ADMIN',
          action: 'STAFF_ROLE_CHANGED',
          entityType: 'user',
          entityId: member.email || member.id,
          details: { prevRole: member.role, newRole: nextRole },
        });
      }
      setStaffMsg(`Switched ${member.full_name || member.email} to ${nextRole}.`);
      await loadLogs();
    } catch (err: any) {
      setStaffMsg(err?.message || 'Could not switch staff role.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleRevokeStaff = async (member: { id: string; email: string | null; role: string }) => {
    if (member.id === adminUser?.id) {
      setStaffMsg('You cannot revoke your own active admin session.');
      return;
    }
    setSavingStaff(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('users')
        .update({ role: 'patient', updated_at: new Date().toISOString() })
        .eq('id', member.id);
      if (error) throw error;
      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: 'ADMIN',
          action: 'STAFF_ACCESS_REVOKED',
          entityType: 'user',
          entityId: member.email || member.id,
          details: { prevRole: member.role },
        });
      }
      await loadLogs();
    } catch (err: any) {
      setStaffMsg(err?.message || 'Could not revoke access.');
    } finally {
      setSavingStaff(false);
    }
  };

  const staffActivityMap = useMemo(() => {
    const todayStr = new Date().toDateString();
    const nowMs = Date.now();
    const map: Record<
      string,
      {
        lastLoginAt: string | null;
        lastActiveAt: string | null;
        actionsToday: number;
        totalActions: number;
        isOnlineNow: boolean;
      }
    > = {};

    logs.forEach((log) => {
      const key = log.actor_id || '';
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          lastLoginAt: null,
          lastActiveAt: null,
          actionsToday: 0,
          totalActions: 0,
          isOnlineNow: false,
        };
      }
      const entry = map[key];
      entry.totalActions += 1;
      if (new Date(log.created_at).toDateString() === todayStr) {
        entry.actionsToday += 1;
      }
      if (!entry.lastActiveAt) {
        entry.lastActiveAt = log.created_at;
        const diffMs = nowMs - new Date(log.created_at).getTime();
        entry.isOnlineNow = !Number.isNaN(diffMs) && diffMs <= 30 * 60 * 1000;
      }
      if (
        !entry.lastLoginAt &&
        (log.action === 'ADMIN_LOGIN' ||
          log.action === 'ADMIN_LOGIN_SUCCESS' ||
          log.action === 'PARTNER_LOGIN_SUCCESS')
      ) {
        entry.lastLoginAt = log.created_at;
      }
    });
    return map;
  }, [logs]);

  const filteredStaffList = useMemo(() => {
    if (teamRoleFilter === 'ALL') return staffList;
    if (teamRoleFilter === 'admin') {
      return staffList.filter((m) => m.role === 'admin' || m.role === 'super_admin');
    }
    return staffList.filter((m) => m.role === teamRoleFilter);
  }, [staffList, teamRoleFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [panelFilter, searchQuery, pageSize]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((row) => {
      if (panelFilter !== 'ALL' && row.source_panel !== panelFilter) return false;
      if (!q) return true;
      return (
        row.actor_name.toLowerCase().includes(q) ||
        row.actor_role.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        (row.entity_id || '').toLowerCase().includes(q) ||
        (row.entity_type || '').toLowerCase().includes(q)
      );
    });
  }, [logs, panelFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const startTotpEnrollment = async () => {
    setEnrolling(true);
    setMfaMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Adityam Founder Authenticator',
      });
      if (error) throw error;
      setEnrollFactorId(data.id);
      setQrSvgDataUri(data.totp?.qr_code || null);
      setTotpSecret(data.totp?.secret || null);
    } catch (err: any) {
      setMfaMsg(err?.message || 'Could not start 2FA setup.');
    } finally {
      setEnrolling(false);
    }
  };

  const confirmTotpEnrollment = async () => {
    if (!enrollFactorId || verifyCode.trim().length < 6) {
      setMfaMsg('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setEnrolling(true);
    setMfaMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enrollFactorId,
      });
      if (chErr) throw chErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verErr) throw verErr;
      setEnrollFactorId(null);
      setQrSvgDataUri(null);
      setTotpSecret(null);
      setVerifyCode('');
      setMfaMsg('2FA Authenticator enabled successfully!');
      await refreshAuth();
    } catch (err: any) {
      setMfaMsg(err?.message || 'Verification failed. Check code and retry.');
    } finally {
      setEnrolling(false);
    }
  };

  if (isLoading && logs.length === 0) {
    return <AdminPageSkeleton />;
  }

  return (
    <View style={{ gap: 16 }}>
      {/* Clean 4-KPI Team Pulse Strip (for Admin) */}
      {isAdmin && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            {
              label: 'TOTAL TEAM',
              value: staffList.length,
              sub: 'Active staff & admins',
              dark: true,
            },
            {
              label: 'ACTIVE NOW (30M)',
              value: staffList.filter((m) => staffActivityMap[m.id]?.isOnlineNow).length,
              sub: 'Recently active online',
              dark: false,
            },
            {
              label: 'CALL CENTER',
              value: staffList.filter((m) => m.role === 'call_center_agent').length,
              sub: 'Booking & triage desk',
              dark: false,
            },
            {
              label: 'FINANCE DESK',
              value: staffList.filter((m) => m.role === 'finance').length,
              sub: 'Payouts & refunds',
              dark: false,
            },
          ].map((kpi) => (
            <View
              key={kpi.label}
              style={{
                flex: 1,
                minWidth: 160,
                backgroundColor: kpi.dark ? THEME.greenDark : THEME.surface,
                borderRadius: 14,
                padding: 15,
                borderWidth: kpi.dark ? 0 : 1,
                borderColor: THEME.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '700',
                  color: kpi.dark ? '#A7D7C0' : THEME.muted,
                  letterSpacing: 0.6,
                }}
              >
                {kpi.label}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: kpi.dark ? '#FFFFFF' : THEME.ink,
                  marginTop: 5,
                }}
              >
                {kpi.value}
              </Text>
              <Text
                style={{
                  fontSize: 11.5,
                  color: kpi.dark ? '#C6E2D4' : THEME.muted,
                  marginTop: 2,
                }}
              >
                {kpi.sub}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Sub-view Switcher for Admin: keep Team List clean by default, Audit Trail in its own tab */}
      {isAdmin && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              { id: 'team' as const, label: `Team Members (${staffList.length})` },
              { id: 'logs' as const, label: `All Audit & Login Logs (${logs.length})` },
            ]
          ).map((tab) => {
            const active = activeSubView === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveSubView(tab.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: active ? THEME.greenDark : THEME.surface,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Team & Role Management (Admin / Super Admin only) */}
      {isAdmin && activeSubView === 'team' && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: THEME.greenSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} color={THEME.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Team & Role Management ({staffList.length})
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}>
                  Track logins, last active time & action counts — switch roles or grant access anytime
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'ALL', label: `All (${staffList.length})` },
                  {
                    id: 'call_center_agent',
                    label: `Call Center (${staffList.filter((m) => m.role === 'call_center_agent').length})`,
                  },
                  {
                    id: 'finance',
                    label: `Finance (${staffList.filter((m) => m.role === 'finance').length})`,
                  },
                  {
                    id: 'admin',
                    label: `Admin (${staffList.filter((m) => m.role === 'admin' || m.role === 'super_admin').length})`,
                  },
                ] as const
              ).map((rf) => {
                const active = teamRoleFilter === rf.id;
                return (
                  <TouchableOpacity
                    key={rf.id}
                    onPress={() => setTeamRoleFilter(rf.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 99,
                      backgroundColor: active ? THEME.greenDark : THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                      {rf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="staff@adityamniramayaa.com"
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                minWidth: 220,
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 9,
                paddingHorizontal: 12,
                paddingVertical: 9,
                fontSize: 13,
                color: THEME.ink,
              }}
            />
            {(
              [
                { id: 'call_center_agent', label: 'Call Center' },
                { id: 'finance', label: 'Finance' },
                { id: 'admin', label: 'Admin' },
              ] as const
            ).map((r) => {
              const active = inviteRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setInviteRole(r.id)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 8,
                    borderRadius: 9,
                    backgroundColor: active ? THEME.greenDark : THEME.bg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={handleGrantStaffRole}
              disabled={savingStaff}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: THEME.green,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 9,
              }}
            >
              <UserPlus size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                {savingStaff ? 'Saving...' : 'Grant Access'}
              </Text>
            </TouchableOpacity>
          </View>

          {staffMsg ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.amberText }}>
              {staffMsg}
            </Text>
          ) : null}

          <View style={{ gap: 8 }}>
            {filteredStaffList.map((member) => {
              const act = staffActivityMap[member.id];
              const formatTime = (iso: string | null | undefined) => {
                if (!iso) return 'Never';
                const d = new Date(iso);
                if (Number.isNaN(d.getTime())) return 'Never';
                return d.toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              };

              return (
                <View
                  key={member.id}
                  style={{
                    backgroundColor: THEME.bg,
                    borderRadius: 11,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                    borderWidth: 1,
                    borderColor: act?.isOnlineNow ? THEME.greenBorder : THEME.border,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 200 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 99,
                            backgroundColor: act?.isOnlineNow ? '#16A34A' : '#9CA3AF',
                          }}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                          {member.full_name || 'Team Member'}
                        </Text>
                        <Text style={{ fontSize: 12, color: THEME.muted }}>
                          · {member.email || member.id.slice(0, 8)}
                        </Text>
                        {act?.isOnlineNow && (
                          <View
                            style={{
                              backgroundColor: THEME.greenSoft,
                              borderWidth: 1,
                              borderColor: THEME.greenBorder,
                              paddingHorizontal: 7,
                              paddingVertical: 1,
                              borderRadius: 99,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.green }}>
                              ACTIVE NOW
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color={THEME.muted} />
                          <Text style={{ fontSize: 11, color: THEME.muted }}>
                            Last login:{' '}
                            <Text style={{ fontWeight: '700', color: THEME.ink }}>
                              {formatTime(act?.lastLoginAt)}
                            </Text>
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: THEME.muted }}>
                          Last active:{' '}
                          <Text style={{ fontWeight: '700', color: THEME.ink }}>
                            {formatTime(act?.lastActiveAt)}
                          </Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.muted }}>
                          Actions:{' '}
                          <Text style={{ fontWeight: '800', color: THEME.greenDark }}>
                            {act?.actionsToday ?? 0} today · {act?.totalActions ?? 0} total
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {member.id !== adminUser?.id ? (
                        <>
                          {(
                            [
                              { id: 'call_center_agent', label: 'Call Center' },
                              { id: 'finance', label: 'Finance' },
                              { id: 'admin', label: 'Admin' },
                            ] as const
                          ).map((r) => {
                            const isCur = member.role === r.id;
                            return (
                              <TouchableOpacity
                                key={r.id}
                                disabled={savingStaff || isCur}
                                onPress={() => handleChangeStaffRole(member, r.id)}
                                style={{
                                  paddingHorizontal: 9,
                                  paddingVertical: 5,
                                  borderRadius: 7,
                                  backgroundColor: isCur ? THEME.greenDark : THEME.surface,
                                  borderWidth: 1,
                                  borderColor: isCur ? THEME.greenDark : THEME.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: isCur ? '#FFFFFF' : THEME.ink,
                                  }}
                                >
                                  {r.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          <TouchableOpacity
                            onPress={() => handleRevokeStaff(member)}
                            disabled={savingStaff}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 7,
                              backgroundColor: '#FDF2F2',
                              borderWidth: 1,
                              borderColor: '#F5C2C2',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#991B1B' }}>
                              Revoke
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 7,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>
                            YOU ({member.role.toUpperCase()})
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => setSelectedMember(member)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 7,
                          backgroundColor: THEME.surfaceAlt,
                          borderWidth: 1,
                          borderColor: THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.ink }}>
                          Activity & Logins
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Audit Log Viewer (Separate Tab for Admin, Direct View for Finance) */}
      {(!isAdmin || activeSubView === 'logs') && (
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
              Admin & Staff Audit Trail ({filteredLogs.length})
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Every login, payout, refund & staff action recorded with timestamp
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadLogs}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: THEME.surfaceAlt,
              borderWidth: 1,
              borderColor: THEME.border,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
            }}
          >
            <RefreshCw size={13} color={THEME.ink} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              minWidth: 220,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 9,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Search size={14} color={THEME.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search staff name, action, booking ref..."
              placeholderTextColor={THEME.muted}
              style={{ flex: 1, fontSize: 12.5, color: THEME.ink }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={THEME.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {(['ALL', 'ADMIN', 'STAFF_CALL_CENTER', 'STAFF_FINANCE'] as const).map((p) => {
            const active = panelFilter === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPanelFilter(p)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? THEME.greenDark : THEME.bg,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.muted }}>
                  {p === 'ALL' ? 'All Panels' : p.replace('STAFF_', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {pagedLogs.length === 0 ? (
          <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 18, textAlign: 'center' }}>
            No audit events recorded yet.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {pagedLogs.map((row) => (
              <View
                key={row.id}
                style={{
                  backgroundColor: THEME.bg,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                      {row.action}
                    </Text>
                    <View
                      style={{
                        backgroundColor: THEME.greenSoft,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 99,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.green }}>
                        {row.source_panel}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    {row.actor_name} ({row.actor_role})
                    {row.entity_type ? ` · ${row.entity_type}` : ''}
                    {row.entity_id ? ` #${row.entity_id}` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.muted }}>
                  {new Date(row.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
            <AdminPagination
              totalCount={filteredLogs.length}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
              itemLabel="events"
            />
          </View>
        )}
      </View>
      )}

      {/* Member Activity & Login History Modal (Slug Detail View) */}
      <Modal visible={Boolean(selectedMember)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '88%',
              backgroundColor: THEME.surface,
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View
              style={{
                backgroundColor: THEME.greenDark,
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#A7D7C0', textTransform: 'uppercase' }}>
                  Member Login & Activity Timeline
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                  {selectedMember?.full_name || 'Team Member'} · {selectedMember?.role}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMember(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {(() => {
                const memberLogs = selectedMember
                  ? logs.filter((l) => l.actor_id === selectedMember.id)
                  : [];
                if (memberLogs.length === 0) {
                  return (
                    <Text style={{ fontSize: 13, color: THEME.muted, textAlign: 'center', padding: 24 }}>
                      No login or activity logs recorded for this member yet.
                    </Text>
                  );
                }
                return memberLogs.slice(0, 60).map((row) => (
                  <View
                    key={row.id}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 10,
                      padding: 11,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                        {row.action}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        {row.source_panel}
                        {row.entity_type ? ` · ${row.entity_type}` : ''}
                        {row.entity_id ? ` #${row.entity_id}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                      {new Date(row.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
