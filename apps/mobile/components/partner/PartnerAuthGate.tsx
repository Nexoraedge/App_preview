import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lock, LogOut, ShieldCheck, Store } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { logAdminAudit } from '../../src/services/adminAudit';
import { resolvePartnerModules, type PartnerModule } from '../../src/services/partnerModules';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
  redText: '#991B1B',
};

const ALLOWED_PARTNER_ROLES = new Set([
  'partner',
  'pharmacy_partner',
  'lab_partner',
  'hospital_partner',
  'doctor_partner',
  'admin',
  'super_admin',
]);

export interface PartnerUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  partnerEntityId: string | null;
  partnerType: string | null;
  enabledModules: PartnerModule[];
  partnerHospitalId?: string | null;
  partnerLabId?: string | null;
  partnerPharmacyId?: string | null;
}

interface PartnerAuthContextValue {
  partnerUser: PartnerUser | null;
  signOutPartner: () => Promise<void>;
}

const PartnerAuthContext = createContext<PartnerAuthContextValue>({
  partnerUser: null,
  signOutPartner: async () => {},
});

export function usePartnerAuth() {
  return useContext(PartnerAuthContext);
}

export function PartnerAuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setPartnerUser(null);
        return;
      }

      let row: any = null;
      const fullRes = await supabase
        .from('users')
        .select('id, email, full_name, role, partner_entity_id, partner_type, enabled_modules, partner_hospital_id, partner_lab_id, partner_pharmacy_id')
        .eq('id', user.id)
        .maybeSingle();

      if (fullRes.error) {
        const legacyRes = await supabase
          .from('users')
          .select('id, email, full_name, role, partner_entity_id, partner_type')
          .eq('id', user.id)
          .maybeSingle();
        row = legacyRes.data;
      } else {
        row = fullRes.data;
      }

      const role = String(row?.role || 'patient').toLowerCase();
      if (!ALLOWED_PARTNER_ROLES.has(role)) {
        setPartnerUser(null);
        return;
      }

      setPartnerUser({
        id: user.id,
        email: row?.email || user.email || '',
        fullName: row?.full_name || user.email?.split('@')[0] || 'Partner',
        role,
        partnerEntityId: row?.partner_entity_id || null,
        partnerType: row?.partner_type || null,
        enabledModules: resolvePartnerModules({
          role,
          partnerType: row?.partner_type,
          enabledModules: row?.enabled_modules,
        }),
        partnerHospitalId: row?.partner_hospital_id || null,
        partnerLabId: row?.partner_lab_id || null,
        partnerPharmacyId: row?.partner_pharmacy_id || null,
      });
    } catch {
      setPartnerUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Enter your partner email and password.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { data: lockRes } = await supabase.rpc('check_admin_login_allowed', {
        p_email: cleanEmail,
      });
      if (lockRes && lockRes.allowed === false) {
        setErrorMsg(
          `Too many failed attempts. Locked for ${lockRes.retry_after_minutes || 15} minutes.`
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data.user) {
        await supabase.rpc('record_admin_login_attempt', {
          p_email: cleanEmail,
          p_success: false,
        });
        setErrorMsg(error?.message || 'Invalid email or password.');
        return;
      }

      let row: any = null;
      const fullRes = await supabase
        .from('users')
        .select('id, email, full_name, role, partner_entity_id, partner_type, enabled_modules, partner_hospital_id, partner_lab_id, partner_pharmacy_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (fullRes.error) {
        const legacyRes = await supabase
          .from('users')
          .select('id, email, full_name, role, partner_entity_id, partner_type')
          .eq('id', data.user.id)
          .maybeSingle();
        row = legacyRes.data;
      } else {
        row = fullRes.data;
      }

      const role = String(row?.role || 'patient').toLowerCase();
      if (!ALLOWED_PARTNER_ROLES.has(role)) {
        await supabase.auth.signOut();
        setErrorMsg(
          'This account does not have Partner access. Ask Adityam Admin to assign your Partner role.'
        );
        return;
      }

      await supabase.rpc('record_admin_login_attempt', {
        p_email: cleanEmail,
        p_success: true,
      });

      const signedIn: PartnerUser = {
        id: data.user.id,
        email: row?.email || cleanEmail,
        fullName: row?.full_name || cleanEmail.split('@')[0],
        role,
        partnerEntityId: row?.partner_entity_id || null,
        partnerType: row?.partner_type || null,
        enabledModules: resolvePartnerModules({
          role,
          partnerType: row?.partner_type,
          enabledModules: row?.enabled_modules,
        }),
        partnerHospitalId: row?.partner_hospital_id || null,
        partnerLabId: row?.partner_lab_id || null,
        partnerPharmacyId: row?.partner_pharmacy_id || null,
      };
      setPartnerUser(signedIn);

      logAdminAudit({
        actorId: signedIn.id,
        actorName: signedIn.fullName,
        actorRole: signedIn.role,
        sourcePanel: 'PARTNER_PORTAL',
        action: 'PARTNER_LOGIN_SUCCESS',
        entityType: 'partner_session',
        entityId: signedIn.partnerEntityId || signedIn.email,
        details: { email: cleanEmail },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const signOutPartner = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {}
    setPartnerUser(null);
    setPassword('');
  }, []);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>
          Loading Adityam Partner Portal...
        </Text>
      </View>
    );
  }

  if (!partnerUser) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: THEME.greenDark }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: THEME.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={22} color={THEME.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.ink }}>
                  Adityam Partner Portal
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}>
                  Pharmacy Desk · QR Check-In & Orders
                </Text>
              </View>
            </View>

            {errorMsg && (
              <View
                style={{
                  backgroundColor: THEME.redBg,
                  borderWidth: 1,
                  borderColor: THEME.redBorder,
                  borderRadius: 10,
                  padding: 11,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                  {errorMsg}
                </Text>
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                Partner Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="pharmacy@adityamniramayaa.com"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  fontSize: 14,
                  color: THEME.ink,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleSignIn}
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  fontSize: 14,
                  color: THEME.ink,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={submitting}
              activeOpacity={0.85}
              style={{
                backgroundColor: THEME.green,
                borderRadius: 12,
                paddingVertical: 13,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              <Lock size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                {submitting ? 'Signing in...' : 'Sign In to Partner Desk'}
              </Text>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingTop: 4,
              }}
            >
              <ShieldCheck size={13} color={THEME.muted} />
              <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                Protected Partner Session · Installable PWA
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <PartnerAuthContext.Provider value={{ partnerUser, signOutPartner }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}
