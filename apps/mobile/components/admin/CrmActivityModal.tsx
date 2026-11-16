import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarClock, MessageSquare, Phone, X } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { getSourcePanelForRole, useAdminAuth } from './AdminAuthGate';
import { logAdminAudit } from '../../src/services/adminAudit';

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

export interface CrmLogItem {
  id: string;
  entity_type: 'BOOKING' | 'PARTNER_ENQUIRY';
  entity_id: string;
  actor_name: string;
  actor_role: string;
  channel: string;
  purpose: string | null;
  summary: string;
  next_follow_up_at: string | null;
  created_at: string;
}

interface CrmActivityModalProps {
  visible: boolean;
  entityType: 'BOOKING' | 'PARTNER_ENQUIRY';
  entityId: string;
  title: string;
  subtitle?: string;
  currentFollowUpAt?: string | null;
  onClose: () => void;
  onSaved: (patch: { follow_up_at: string | null; notesSummary: string }) => void;
}

const CHANNELS = ['CALL', 'WHATSAPP', 'NOTE', 'EMAIL'] as const;
const PURPOSES = [
  'Initial Triage',
  'Follow-Up',
  'Slot / Quote Sent',
  'Missed / No Answer',
  'Payment Follow-Up',
  'Onboarding Pitch',
] as const;

export function CrmActivityModal({
  visible,
  entityType,
  entityId,
  title,
  subtitle,
  currentFollowUpAt,
  onClose,
  onSaved,
}: CrmActivityModalProps) {
  const { adminUser } = useAdminAuth();
  const [logs, setLogs] = useState<CrmLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('CALL');
  const [purpose, setPurpose] = useState<string>('Follow-Up');
  const [summary, setSummary] = useState('');
  const [followUpIso, setFollowUpIso] = useState<string | null>(currentFollowUpAt || null);
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTime, setCustomTime] = useState('16:00');

  const applyCustomDateTime = (dStr: string, tStr: string) => {
    setCustomDate(dStr);
    setCustomTime(tStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr.trim()) && /^\d{2}:\d{2}$/.test(tStr.trim())) {
      const parsed = new Date(`${dStr.trim()}T${tStr.trim()}:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setFollowUpIso(parsed.toISOString());
      }
    }
  };

  const loadLogs = useCallback(async () => {
    if (!visible || !entityId) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('crm_activity_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data)) {
        setLogs(data as CrmLogItem[]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [visible, entityType, entityId]);

  useEffect(() => {
    if (visible) {
      setFollowUpIso(currentFollowUpAt || null);
      setSummary('');
      loadLogs();
    }
  }, [visible, currentFollowUpAt, loadLogs]);

  const setQuickFollowUp = (hoursFromNow: number | null) => {
    if (hoursFromNow === null) {
      setFollowUpIso(null);
      return;
    }
    const target = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    setFollowUpIso(target.toISOString());
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 30, 0, 0);
    setFollowUpIso(d.toISOString());
  };

  const handleSave = async () => {
    const cleanSummary = summary.trim();
    if (!cleanSummary && followUpIso === (currentFollowUpAt || null)) {
      if (Platform.OS === 'web') window.alert('Please enter a call/chat note or set a follow-up time.');
      else Alert.alert('Missing Details', 'Please enter a call/chat note or set a follow-up time.');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const noteText = cleanSummary || (followUpIso ? `Follow-up scheduled for ${new Date(followUpIso).toLocaleString('en-IN')}` : 'Follow-up cleared');

      await supabase.from('crm_activity_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        actor_id: adminUser?.id || null,
        actor_name: adminUser?.fullName || 'Coordinator',
        actor_role: adminUser?.role || 'admin',
        channel,
        purpose,
        summary: noteText,
        next_follow_up_at: followUpIso,
      });

      const table = entityType === 'BOOKING' ? 'bookings' : 'partner_enquiries';
      const idCol = entityType === 'BOOKING' ? 'booking_ref' : 'id';
      await supabase
        .from(table)
        .update({
          follow_up_at: followUpIso,
          last_contacted_at: nowIso,
          notes: `[${channel} · ${purpose}] ${noteText}`,
          updated_at: nowIso,
        })
        .eq(idCol, entityId);

      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'CRM_LOG_ADDED',
          entityType: entityType.toLowerCase(),
          entityId,
          details: { channel, purpose, followUpIso },
        });
      }

      onSaved({
        follow_up_at: followUpIso,
        notesSummary: `[${channel} · ${purpose}] ${noteText}`,
      });
      setSummary('');
      await loadLogs();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err?.message || 'Could not save CRM log.');
      else Alert.alert('Error', err?.message || 'Could not save CRM log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
            maxHeight: '90%',
            backgroundColor: THEME.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 20,
              paddingVertical: 15,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#A7D7C0', textTransform: 'uppercase' }}>
                CRM Call / Chat Log & Follow-Up
              </Text>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={{ fontSize: 11.5, color: '#C6E2D4', marginTop: 1 }} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
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

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            {/* Channel & Purpose */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>
                INTERACTION CHANNEL & PURPOSE
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {CHANNELS.map((ch) => {
                  const active = channel === ch;
                  return (
                    <TouchableOpacity
                      key={ch}
                      onPress={() => setChannel(ch)}
                      style={{
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: active ? THEME.greenDark : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.greenDark : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {PURPOSES.map((p) => {
                  const active = purpose === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPurpose(p)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 99,
                        backgroundColor: active ? THEME.greenSoft : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.green : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? THEME.greenDark : THEME.muted }}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Summary Note */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>
                WHAT HAPPENED IN THIS CALL / CHAT?
              </Text>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                numberOfLines={3}
                placeholder="e.g. Spoke with patient, confirmed fasting blood test for tomorrow 8 AM, asked for payment link on WhatsApp..."
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  padding: 11,
                  fontSize: 13,
                  color: THEME.ink,
                  minHeight: 74,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Quick Follow-Up Scheduler */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>
                  NEXT FOLLOW-UP REMINDER
                </Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: followUpIso ? THEME.green : THEME.muted }}>
                  {followUpIso
                    ? new Date(followUpIso).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No reminder set'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setQuickFollowUp(2)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.amberBg,
                    borderWidth: 1,
                    borderColor: THEME.amberBorder,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.amberText }}>In 2 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={setTomorrowMorning}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.amberBg,
                    borderWidth: 1,
                    borderColor: THEME.amberBorder,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.amberText }}>Tomorrow 10:30 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickFollowUp(72)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.amberBg,
                    borderWidth: 1,
                    borderColor: THEME.amberBorder,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.amberText }}>In 3 Days</Text>
                </TouchableOpacity>
                {followUpIso && (
                  <TouchableOpacity
                    onPress={() => setQuickFollowUp(null)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Custom Date & Time Picker */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ flex: 1.2, gap: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>
                    Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    value={customDate}
                    onChangeText={(txt) => applyCustomDateTime(txt, customTime)}
                    placeholder="2026-11-17"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>
                    Time (HH:MM)
                  </Text>
                  <TextInput
                    value={customTime}
                    onChangeText={(txt) => applyCustomDateTime(customDate, txt)}
                    placeholder="16:30"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: THEME.green,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                {saving ? 'Saving Log...' : 'Save CRM Log & Follow-Up'}
              </Text>
            </TouchableOpacity>

            {/* Activity Timeline */}
            <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.border }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                CONVERSATION HISTORY ({logs.length})
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color={THEME.green} />
              ) : logs.length === 0 ? (
                <Text style={{ fontSize: 12, color: THEME.muted, paddingVertical: 8 }}>
                  No call or chat logs recorded yet for this lead.
                </Text>
              ) : (
                logs.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 10,
                      padding: 11,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {item.channel === 'CALL' ? (
                          <Phone size={12} color={THEME.green} />
                        ) : (
                          <MessageSquare size={12} color={THEME.green} />
                        )}
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>
                          {item.channel} {item.purpose ? `· ${item.purpose}` : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10.5, color: THEME.muted }}>
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: THEME.ink, lineHeight: 18 }}>
                      {item.summary}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: THEME.muted }}>
                        Logged by {item.actor_name} ({item.actor_role})
                      </Text>
                      {item.next_follow_up_at ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CalendarClock size={11} color={THEME.amberText} />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.amberText }}>
                            Follow-up: {new Date(item.next_follow_up_at).toLocaleDateString('en-IN')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
