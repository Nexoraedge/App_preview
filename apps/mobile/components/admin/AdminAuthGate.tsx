import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Clock, KeyRound, Lock, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
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
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
  redText: '#B91C1C',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  amberText: '#9A5B13',
};

// Role-based access inside /admin (Founder Admin + Internal Call Center & Finance Staff)
const ALLOWED_ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'call_center_agent',
  'finance',
]);
const IDLE_LOCK_MS = 30 * 60 * 1000; // 30 minutes

export function getAllowedSectionsForRole(role?: string | null): string[] {
  const r = String(role || '').toLowerCase();
  if (r === 'call_center_agent') {
    return ['bookings', 'prescriptions', 'enquiries', 'labs'];
  }
  if (r === 'finance') {
    return ['finance', 'hospitals', 'solo-doctors', 'labs', 'pharmacies', 'bookings', 'audit'];
  }
  return [
    'dashboard',
    'bookings',
    'prescriptions',
    'hospitals',
    'solo-doctors',
    'enquiries',
    'verifications',
    'labs',
    'pharmacies',
    'patients',
    'finance',
    'audit',
  ];
}

export function getSourcePanelForRole(
  role?: string | null
): 'ADMIN' | 'STAFF_CALL_CENTER' | 'STAFF_FINANCE' {
  const r = String(role || '').toLowerCase();
  if (r === 'call_center_agent') return 'STAFF_CALL_CENTER';
  if (r === 'finance') return 'STAFF_FINANCE';
  return 'ADMIN';
}

export interface AdminProfile {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
  mfaEnabled: boolean;
}

interface AdminAuthContextValue {
  adminUser: AdminProfile | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  adminUser: null,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [unauthorizedRole, setUnauthorizedRole] = useState<string | null>(null);

  // MFA challenge state (when user has enrolled TOTP and needs AAL2)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Login form & server lockout state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  const lastLoginLoggedRef = useRef<string | null>(null);

  // Countdown timer when rate-limited
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockSeconds]);

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {}
    lastLoginLoggedRef.current = null;
    setAdminUser(null);
    setSessionUserId(null);
    setSessionEmail(null);
    setUnauthorizedRole(null);
    setMfaFactorId(null);
    setMfaCode('');
    setPassword('');
  }, []);

  // 30-minute idle auto-lock on web
  useEffect(() => {
    if (!adminUser || Platform.OS !== 'web' || typeof window === 'undefined') return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleSignOut();
      }, IDLE_LOCK_MS);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [adminUser, handleSignOut]);

  const resolveAdminRole = useCallback(
    async (uid: string, userEmail?: string | null, fallbackName?: string) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name, role')
          .eq('id', uid)
          .maybeSingle();

        if (error) {
          setAuthError(error.message);
          setAdminUser(null);
          setUnauthorizedRole('unknown');
          return;
        }

        const role = String(data?.role || 'patient').toLowerCase();
        if (!ALLOWED_ADMIN_ROLES.has(role)) {
          setAdminUser(null);
          setUnauthorizedRole(role);
          setMfaFactorId(null);
          return;
        }

        // Check if user has a verified TOTP factor requiring AAL2 (bounded by 3s timeout so Safari locks never hang)
        let mfaEnabled = false;
        try {
          const mfaCheck = Promise.all([
            supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
            supabase.auth.mfa.listFactors(),
          ]);
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('MFA check timeout')), 3000)
          );
          const [{ data: aal }, { data: factors }] = await Promise.race([mfaCheck, timeout]);
          const verifiedTotp = (factors?.totp || []).find((f) => f.status === 'verified');
          mfaEnabled = Boolean(verifiedTotp);
          if (verifiedTotp && aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
            setMfaFactorId(verifiedTotp.id);
            setAdminUser(null);
            setUnauthorizedRole(null);
            return;
          }
        } catch {}

        setMfaFactorId(null);
        const fullName = data?.full_name || fallbackName || userEmail || 'Admin';
        setAdminUser({
          id: uid,
          email: data?.email || userEmail || null,
          fullName,
          role,
          mfaEnabled,
        });
        setUnauthorizedRole(null);

        if (lastLoginLoggedRef.current !== uid) {
          lastLoginLoggedRef.current = uid;
          logAdminAudit({
            actorId: uid,
            actorName: fullName,
            actorRole: role,
            sourcePanel: 'ADMIN',
            action: 'ADMIN_LOGIN',
            entityType: 'session',
            entityId: uid,
            details: { email: data?.email || userEmail || null, mfaEnabled },
          });
        }
      } catch (err: any) {
        setAuthError(err?.message || 'Failed to verify admin permissions.');
        setAdminUser(null);
      }
    },
    []
  );

  const checkSession = useCallback(async () => {
    setIsChecking(true);
    const safetyTimer = setTimeout(() => {
      setIsChecking(false);
    }, 8000);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        setSessionUserId(null);
        setSessionEmail(null);
        setAdminUser(null);
        setUnauthorizedRole(null);
        setMfaFactorId(null);
      } else {
        setSessionUserId(session.user.id);
        setSessionEmail(session.user.email || null);
        const metaName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          undefined;
        await resolveAdminRole(session.user.id, session.user.email, metaName);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to connect to authentication service.');
    } finally {
      clearTimeout(safetyTimer);
      setIsChecking(false);
    }
  }, [resolveAdminRole]);

  useEffect(() => {
    checkSession();
    const supabase = getSupabaseClient();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer async Supabase calls outside onAuthStateChange to avoid Safari navigator.locks deadlock
      setTimeout(() => {
        if (!session?.user) {
          setSessionUserId(null);
          setSessionEmail(null);
          setAdminUser(null);
          setUnauthorizedRole(null);
          setMfaFactorId(null);
          setIsChecking(false);
        } else {
          setSessionUserId(session.user.id);
          setSessionEmail(session.user.email || null);
          const metaName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            undefined;
          resolveAdminRole(session.user.id, session.user.email, metaName).finally(() =>
            setIsChecking(false)
          );
        }
      }, 0);
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [checkSession, resolveAdminRole]);

  const handleEmailSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setAuthError('Please enter both your admin email and password.');
      return;
    }
    if (lockSeconds > 0) return;

    setIsSubmitting(true);
    setAuthError(null);
    try {
      const supabase = getSupabaseClient();

      // 1. Server-side brute-force lockout check
      try {
        const { data: allowData } = await supabase.rpc('check_admin_login_allowed', {
          p_email: cleanEmail,
        });
        const row = Array.isArray(allowData) ? allowData[0] : allowData;
        if (row && row.allowed === false) {
          const rem = Number(row.remaining_seconds || 900);
          setLockSeconds(rem);
          setAuthError('Too many failed attempts. Login is temporarily locked.');
          return;
        }
      } catch {
        // RPC not yet migrated; proceed gracefully
      }

      // 2. Authenticate
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        try {
          const { data: recData } = await supabase.rpc('record_admin_login_attempt', {
            p_email: cleanEmail,
            p_success: false,
          });
          const rec = Array.isArray(recData) ? recData[0] : recData;
          if (rec?.remaining_seconds > 0) {
            setLockSeconds(Number(rec.remaining_seconds));
          }
        } catch {}
        setAuthError('Invalid email or password.');
        return;
      }

      try {
        await supabase.rpc('record_admin_login_attempt', {
          p_email: cleanEmail,
          p_success: true,
        });
      } catch {}
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || mfaCode.trim().length < 6) {
      setAuthError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (chErr) throw chErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      });
      if (verErr) throw verErr;
      setMfaCode('');
      await checkSession();
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (isChecking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>
          Verifying Adityam Admin session...
        </Text>
      </View>
    );
  }

  if (adminUser) {
    return (
      <AdminAuthContext.Provider
        value={{ adminUser, signOut: handleSignOut, refreshAuth: checkSession }}
      >
        {children}
      </AdminAuthContext.Provider>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: THEME.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <View
          style={{
            backgroundColor: THEME.greenDark,
            paddingHorizontal: 24,
            paddingVertical: 22,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
                Adityam Admin
              </Text>
              <Text style={{ fontSize: 11.5, color: '#A7D7C0', fontWeight: '600' }}>
                Private Command Center · Founder Access Only
              </Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 24, gap: 14 }}>
          {mfaFactorId ? (
            /* Step 2: 2FA Authenticator Code */
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color={THEME.green} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Two-Factor Verification
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                Enter the 6-digit code from your authenticator app to unlock the Command Center.
              </Text>
              {authError ? (
                <View
                  style={{
                    backgroundColor: THEME.redBg,
                    borderWidth: 1,
                    borderColor: THEME.redBorder,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.redText }}>
                    {authError}
                  </Text>
                </View>
              ) : null}
              <TextInput
                value={mfaCode}
                onChangeText={setMfaCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleVerifyMfa}
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 20,
                  fontWeight: '800',
                  letterSpacing: 6,
                  textAlign: 'center',
                  color: THEME.ink,
                }}
              />
              <TouchableOpacity
                onPress={handleVerifyMfa}
                disabled={isSubmitting}
                style={{
                  backgroundColor: THEME.green,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {isSubmitting ? 'Verifying...' : 'Verify & Enter'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSignOut} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                  Cancel & Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          ) : sessionUserId && unauthorizedRole ? (
            /* Signed in, but lacks admin role */
            <View style={{ gap: 14 }}>
              <View
                style={{
                  backgroundColor: THEME.amberBg,
                  borderWidth: 1,
                  borderColor: THEME.amberBorder,
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} color={THEME.amberText} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.amberText }}>
                    Founder Admin Role Required
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, color: THEME.ink, lineHeight: 18 }}>
                  Signed in as <Text style={{ fontWeight: '800' }}>{sessionEmail || 'current account'}</Text>. Only authorized Adityam Admin Staff can access this private panel.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={checkSession}
                  style={{
                    flex: 1,
                    backgroundColor: THEME.green,
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={15} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    Re-check Access
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    backgroundColor: THEME.surfaceAlt,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <LogOut size={15} color={THEME.ink} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Sign-In Form */
            <>
              {lockSeconds > 0 ? (
                <View
                  style={{
                    backgroundColor: THEME.amberBg,
                    borderWidth: 1,
                    borderColor: THEME.amberBorder,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Clock size={18} color={THEME.amberText} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amberText }}>
                      Login Locked ({formatCountdown(lockSeconds)})
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.ink }}>
                      Too many failed attempts. Please wait before trying again.
                    </Text>
                  </View>
                </View>
              ) : authError ? (
                <View
                  style={{
                    backgroundColor: THEME.redBg,
                    borderWidth: 1,
                    borderColor: THEME.redBorder,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.redText }}>
                    {authError}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                  Admin / Staff Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="staff@adityamniramayaa.com"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={handleEmailSignIn}
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleEmailSignIn}
                disabled={isSubmitting || lockSeconds > 0}
                style={{
                  backgroundColor: lockSeconds > 0 ? '#9CA3AF' : THEME.green,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  {isSubmitting
                    ? 'Verifying...'
                    : lockSeconds > 0
                    ? `Locked (${formatCountdown(lockSeconds)})`
                    : 'Sign In to Command Center'}
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, color: THEME.muted, textAlign: 'center', lineHeight: 16 }}>
                Protected by server-side rate limiting & 30-min idle lock.
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
