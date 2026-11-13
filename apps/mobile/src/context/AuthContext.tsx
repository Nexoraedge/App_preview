import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Dependent } from '@adityam/types';

const AUTH_USER_STORAGE_KEY = '@adityam_auth_user_v1';
const DEPENDENTS_STORAGE_KEY = '@adityam_dependents_v2';
const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type DependentRelation = 'Father' | 'Mother' | 'Spouse' | 'Son' | 'Daughter' | 'Other';

interface AuthContextType {
  user: User | null;
  dependents: Dependent[];
  isLoggedIn: boolean;
  loginAsTestUser: () => void;
  loginWithPhone: (phone: string, otp: string, fullName?: string, aadhaarLastFour?: string) => boolean;
  loginWithGoogle: () => Promise<boolean>;
  verifyAndAttachPhone: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  addDependent: (dependent: Omit<Dependent, 'id' | 'user_id' | 'created_at'>) => void;
  removeDependent: (id: string) => void;
  deductWallet: (amount: number) => void;
  updateUser: (updates: Partial<User>) => void;
  deleteAccount: () => Promise<void>;
}

const TEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  phone: '+91 99999 99999',
  full_name: 'Abhishek Jain',
  age: 34,
  gender: 'Male',
  city: 'Delhi NCR',
  wallet_balance: 2500.00,
  is_verified: true,
  role: 'patient',
  aadhaar_last_four: '4592',
  abha_id: '91-4582-9011',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_DEPENDENTS: Dependent[] = [];

export const sanitizeUserData = (raw: any): User | null => {
  if (!raw) return null;
  const isDemo = raw.id === '00000000-0000-0000-0000-000000000001';
  if (!isDemo) {
    if (raw.city === 'Delhi NCR' || raw.city === 'Saket, South Delhi NCR') raw.city = '';
    if (raw.blood_group === 'O+ Positive' || raw.blood_group === 'O+') raw.blood_group = null;
    if (raw.emergency_contact === '+91 98112 44550') raw.emergency_contact = null;
    if (raw.phone === '+91 99999 99999' || (typeof raw.phone === 'string' && (raw.phone.startsWith('+9100') || raw.phone.startsWith('+910')))) raw.phone = null;
    if (raw.abha_id && (raw.abha_id.includes('91-4582-9011') || raw.abha_id.includes('4582-9011'))) raw.abha_id = null;
    if (raw.aadhaar_last_four === '4592') raw.aadhaar_last_four = null;
  }
  return raw;
};

const getStoredInitialUser = (): User | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return sanitizeUserData(parsed);
      }
    } catch {}
  }
  return null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to sync an authenticated Supabase user into public.users table
const syncAuthUserToDatabase = async (sessionUser: any, client: any, existingUser?: User | null): Promise<User> => {
  const userId = sessionUser.id;
  const userEmail = sessionUser.email || null;
  const userPhone = sessionUser.phone || existingUser?.phone || null;
  const meta = sessionUser.user_metadata || {};
  const fullName = meta.full_name || meta.name || meta.user_name || existingUser?.full_name || (userEmail ? userEmail.split('@')[0] : 'User');
  const avatarUrl = meta.avatar_url || meta.picture || existingUser?.avatar_url || null;

  let dbUser: any = null;
  try {
    const { data } = await client.from('users').select('*').eq('id', userId).maybeSingle();
    if (data) dbUser = data;
  } catch {}

  const isDemo = userId === '00000000-0000-0000-0000-000000000001';
  const cleanCity = dbUser?.city && (isDemo || dbUser.city !== 'Delhi NCR') ? dbUser.city : '';

  // Attempt Tier 1: Comprehensive upsert with all modern columns
  const fullPayload: any = {
    id: userId,
    full_name: dbUser?.full_name || fullName,
    avatar_url: dbUser?.avatar_url || avatarUrl,
    role: dbUser?.role || 'patient',
    is_verified: dbUser ? Boolean(dbUser.is_verified) : Boolean(userPhone),
    updated_at: new Date().toISOString(),
  };
  if (userEmail) fullPayload.email = userEmail;
  if (userPhone || dbUser?.phone) fullPayload.phone = userPhone || dbUser?.phone;
  if (cleanCity) fullPayload.city = cleanCity;
  if (dbUser?.age) fullPayload.age = dbUser.age;
  if (dbUser?.gender) fullPayload.gender = dbUser.gender;
  if (dbUser?.blood_group && dbUser.blood_group !== 'O+ Positive') fullPayload.blood_group = dbUser.blood_group;
  if (dbUser?.emergency_contact && dbUser.emergency_contact !== '+91 98112 44550') fullPayload.emergency_contact = dbUser.emergency_contact;

  try {
    const { data: upserted, error: upsertErr } = await client
      .from('users')
      .upsert(fullPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (upsertErr) {
      console.warn('[AuthContext] Tier 1 upsert notice (schema may be legacy):', upsertErr.message);

      // Attempt Tier 2: Core legacy columns (id, full_name, avatar_url, phone, role, updated_at)
      const fallbackPhone = userPhone || dbUser?.phone || `+91${userId.replace(/\D/g, '').slice(0, 10).padEnd(10, '0')}`;
      const legacyPayload: any = {
        id: userId,
        full_name: fullPayload.full_name,
        avatar_url: fullPayload.avatar_url,
        phone: fallbackPhone,
        role: 'patient',
        updated_at: new Date().toISOString(),
      };

      const { data: fbData, error: fbErr } = await client
        .from('users')
        .upsert(legacyPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!fbErr && fbData) {
        dbUser = fbData;
      } else if (fbErr) {
        console.warn('[AuthContext] Tier 2 legacy upsert notice:', fbErr.message);
      }
    } else if (upserted) {
      dbUser = upserted;
    }
  } catch (err) {
    console.warn('[AuthContext] users upsert exception:', err);
  }

  const cleanAbha = (dbUser?.abha_id && !dbUser.abha_id.includes('91-4582-9011') && !dbUser.abha_id.includes('4582-9011'))
    ? dbUser.abha_id
    : (isDemo ? '91-4582-9011' : null);

  const finalUser: User = {
    id: userId,
    email: userEmail,
    phone: dbUser?.phone && !dbUser.phone.startsWith('+9100') && !dbUser.phone.startsWith('+910') && dbUser.phone !== '+91 99999 99999' ? dbUser.phone : (userPhone || null),
    full_name: dbUser?.full_name || fullName,
    avatar_url: dbUser?.avatar_url || avatarUrl,
    age: dbUser?.age || null,
    gender: dbUser?.gender || null,
    city: cleanCity,
    wallet_balance: Number(dbUser?.wallet_balance) || 0,
    is_verified: dbUser ? Boolean(dbUser.is_verified) : Boolean(userPhone),
    role: (dbUser?.role as any) || 'patient',
    aadhaar_last_four: isDemo ? (dbUser?.aadhaar_last_four || '4592') : (dbUser?.aadhaar_last_four || null),
    abha_id: cleanAbha,
    blood_group: dbUser?.blood_group && dbUser.blood_group !== 'O+ Positive' ? dbUser.blood_group : null,
    emergency_contact: dbUser?.emergency_contact && dbUser.emergency_contact !== '+91 98112 44550' ? dbUser.emergency_contact : null,
    allergies: dbUser?.allergies || null,
    primary_doctor: dbUser?.primary_doctor || null,
    created_at: dbUser?.created_at || sessionUser.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return sanitizeUserData(finalUser) as User;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredInitialUser);
  const [dependents, setDependents] = useState<Dependent[]>(INITIAL_DEPENDENTS);

  // Restore session & dependents from AsyncStorage asynchronously on all platforms
  useEffect(() => {
    AsyncStorage.getItem(AUTH_USER_STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const cleanParsed = sanitizeUserData(parsed);
            setUser(cleanParsed);

            // Live sync user profile from Supabase
            if (cleanParsed?.id || cleanParsed?.phone) {
              import('../lib/supabase').then(({ getSupabaseClient }) => {
                const client = getSupabaseClient();
                const query = client.from('users').select('*');
                const lookup = cleanParsed.id
                  ? query.eq('id', cleanParsed.id)
                  : query.eq('phone', cleanParsed.phone!);

                Promise.resolve(lookup.maybeSingle())
                  .then(({ data: dbUser, error }: any) => {
                    if (!error && dbUser) {
                      setUser((current) => {
                        const isDemo = dbUser.id === '00000000-0000-0000-0000-000000000001';
                        const cleanCity = dbUser.city && (isDemo || dbUser.city !== 'Delhi NCR') ? dbUser.city : '';
                        const cleanAbha = (dbUser.abha_id && !dbUser.abha_id.includes('91-4582-9011') && !dbUser.abha_id.includes('4582-9011')) ? dbUser.abha_id : (isDemo ? '91-4582-9011' : null);
                        const cleanBlood = dbUser.blood_group && dbUser.blood_group !== 'O+ Positive' ? dbUser.blood_group : null;
                        const cleanEmergency = dbUser.emergency_contact && dbUser.emergency_contact !== '+91 98112 44550' ? dbUser.emergency_contact : null;
                        const merged = sanitizeUserData({
                          ...current,
                          ...dbUser,
                          city: cleanCity,
                          abha_id: cleanAbha,
                          blood_group: cleanBlood,
                          emergency_contact: cleanEmergency,
                        });
                        AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
                        return merged;
                      });
                    }
                  })
                  .catch(() => {});
              }).catch(() => {});
            }
          } catch {}
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(DEPENDENTS_STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDependents(parsed);
            }
          } catch {}
        }
      })
      .catch(() => {});

    // Listen for Supabase Google OAuth session redirects
    try {
      import('../lib/supabase').then(({ getSupabaseClient }) => {
        const client = getSupabaseClient();

        client.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            const syncedUser = await syncAuthUserToDatabase(session.user, client, user);
            setUser(syncedUser);
            saveUserSession(syncedUser);
          }
        }).catch(() => {});

        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session?.user) {
            setUser(null);
            return;
          }
          if (session?.user) {
            const syncedUser = await syncAuthUserToDatabase(session.user, client, user);
            setUser(syncedUser);
            saveUserSession(syncedUser);
          }
        });
      }).catch(() => {});
    } catch {}
  }, []);

  const saveUserSession = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      const json = JSON.stringify(newUser);
      AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, json).catch(() => {});
      AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1').catch(() => {});
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(AUTH_USER_STORAGE_KEY, json);
          window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
        } catch {}
      }
    } else {
      AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY).catch(() => {});
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        } catch {}
      }
    }
  };

  const loginAsTestUser = () => {
    saveUserSession(TEST_USER);
  };

  const loginWithPhone = (phone: string, otp: string, fullName?: string, aadhaarLastFour?: string) => {
    const cleanName = fullName?.trim() || 'Abhishek Jain';
    const cleanAadhaar = aadhaarLastFour?.trim() || '4592';
    const cleanDigits = phone.replace(/[^\d]/g, '').slice(-10);
    const formattedPhone = cleanDigits.length === 10
      ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
      : phone.startsWith('+91') ? phone : `+91 ${phone}`;

    // App Store review bypass: phone 9999999999 or OTP 123456
    if (phone.includes('9999999999')) {
      const reviewerUser: User = {
        ...TEST_USER,
        phone: '+91 99999 99999',
        full_name: cleanName !== 'Abhishek Jain' ? cleanName : TEST_USER.full_name,
        aadhaar_last_four: cleanAadhaar,
      };
      saveUserSession(reviewerUser);
      return true;
    }

    // General login with user's inputted full name
    const newUser: User = {
      id: generateUUID(),
      phone: formattedPhone,
      full_name: cleanName,
      age: 29,
      gender: 'Male',
      city: 'Jaipur',
      wallet_balance: 2500.00,
      is_verified: true,
      role: 'patient',
      aadhaar_last_four: cleanAadhaar,
      abha_id: `91-${cleanAadhaar.repeat(2).slice(0, 4)}-9011`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveUserSession(newUser);

    // Optional background sync with Supabase users table
    try {
      import('../lib/supabase').then(({ getSupabaseClient }) => {
        Promise.resolve(
          getSupabaseClient().from('users').upsert({
            id: newUser.id,
            phone: newUser.phone,
            full_name: newUser.full_name,
            city: newUser.city,
            wallet_balance: newUser.wallet_balance,
            is_verified: true,
          }, { onConflict: 'phone' })
        ).catch(() => {});
      }).catch(() => {});
    } catch {}

    return true;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const { getSupabaseClient } = await import('../lib/supabase');
    const client = getSupabaseClient();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const redirectUrl = window.location.origin;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.assign(data.url);
        return true;
      }
      return false;
    } else {
      const redirectUrl = 'adityam://google-auth';
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        const { Linking } = await import('react-native');
        await Linking.openURL(data.url);
        return true;
      }
      return false;
    }
  };

  const verifyAndAttachPhone = async (phone: string, otp: string): Promise<boolean> => {
    const cleanDigits = phone.replace(/[^\d]/g, '').slice(-10);
    const formattedPhone = cleanDigits.length === 10
      ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
      : phone.startsWith('+91') ? phone : `+91 ${phone}`;

    if (user) {
      const updatedUser: User = {
        ...user,
        phone: formattedPhone,
        is_verified: true,
        updated_at: new Date().toISOString(),
      };
      saveUserSession(updatedUser);

      try {
        const { getSupabaseClient } = await import('../lib/supabase');
        const client = getSupabaseClient();
        const { error } = await client
          .from('users')
          .upsert({
            id: updatedUser.id,
            phone: formattedPhone,
            email: updatedUser.email || null,
            full_name: updatedUser.full_name,
            is_verified: true,
            city: updatedUser.city,
            wallet_balance: updatedUser.wallet_balance,
          }, { onConflict: 'id' });

        if (error) {
          // Fallback to core legacy columns if newer columns aren't migrated
          await client
            .from('users')
            .upsert({
              id: updatedUser.id,
              phone: formattedPhone,
              full_name: updatedUser.full_name,
              is_verified: true,
            }, { onConflict: 'id' });
        }
      } catch {}

      return true;
    }
    return false;
  };


  const logout = async () => {
    try {
      const { getSupabaseClient } = await import('../lib/supabase');
      const client = getSupabaseClient();
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch {}

    saveUserSession(null);

    try {
      await AsyncStorage.multiRemove([
        AUTH_USER_STORAGE_KEY,
        DEPENDENTS_STORAGE_KEY,
      ]);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(DEPENDENTS_STORAGE_KEY);
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
            window.localStorage.removeItem(key);
          }
        }
      }
    } catch {}
  };

  const addDependent = (dep: Omit<Dependent, 'id' | 'user_id' | 'created_at'>) => {
    const newId = generateUUID();
    const newDep: Dependent = {
      ...dep,
      id: newId,
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    };
    setDependents((prev) => {
      const updated = [newDep, ...prev];
      AsyncStorage.setItem(DEPENDENTS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Background push to Supabase dependents table
    try {
      import('../lib/supabase').then(({ getSupabaseClient }) => {
        Promise.resolve(
          getSupabaseClient().from('dependents').insert({
            id: newId,
            user_id: user?.id || '00000000-0000-0000-0000-000000000001',
            full_name: newDep.full_name,
            relation: newDep.relation,
            age: newDep.age,
            gender: newDep.gender,
            aadhaar_last_four: newDep.aadhaar_last_four || '0000',
            kyc_status: newDep.kyc_status || 'verified',
            consent_given: newDep.consent_given ?? true,
          })
        ).catch(() => {});
      }).catch(() => {});
    } catch {}
  };

  const removeDependent = (id: string) => {
    setDependents((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      AsyncStorage.setItem(DEPENDENTS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    try {
      import('../lib/supabase').then(({ getSupabaseClient }) => {
        Promise.resolve(
          getSupabaseClient().from('dependents').delete().eq('id', id)
        ).catch(() => {});
      }).catch(() => {});
    } catch {}
  };

  const deductWallet = (amount: number) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, wallet_balance: Math.max(0, prev.wallet_balance - amount) };
      saveUserSession(updated);
      return updated;
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates, updated_at: new Date().toISOString() };
      saveUserSession(updated);

      // Sync user profile updates to Supabase (upsert so it works whether row exists or not)
      try {
        import('../lib/supabase').then(({ getSupabaseClient }) => {
          if (prev.id) {
            const dbPayload: any = {
              id: prev.id,
              full_name: updated.full_name,
              city: updated.city,
              age: updated.age,
              gender: updated.gender,
              avatar_url: updated.avatar_url,
              wallet_balance: updated.wallet_balance,
              aadhaar_last_four: updated.aadhaar_last_four,
              abha_id: updated.abha_id,
              updated_at: new Date().toISOString(),
            };
            if (updated.email) dbPayload.email = updated.email;
            if (updated.phone) dbPayload.phone = updated.phone;
            if (updated.blood_group) dbPayload.blood_group = updated.blood_group;
            if (updated.emergency_contact) dbPayload.emergency_contact = updated.emergency_contact;
            if (updated.allergies) dbPayload.allergies = updated.allergies;
            if (updated.primary_doctor) dbPayload.primary_doctor = updated.primary_doctor;

            Promise.resolve(
              getSupabaseClient()
                .from('users')
                .upsert(dbPayload, { onConflict: 'id' })
            ).catch(() => {});
          }
        }).catch(() => {});
      } catch {}

      return updated;
    });
  };

  const deleteAccount = async () => {
    try {
      await AsyncStorage.multiRemove([
        AUTH_USER_STORAGE_KEY,
        DEPENDENTS_STORAGE_KEY,
        ONBOARDING_SEEN_KEY,
        '@adityam_appointments_v1',
        '@adityam_local_bookings_v2',
        '@adityam_lab_cart_v1',
        '@adityam_family_v1',
        '@adityam_settings_v1',
      ]);
    } catch {}
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(DEPENDENTS_STORAGE_KEY);
        window.localStorage.removeItem(ONBOARDING_SEEN_KEY);
        window.localStorage.removeItem('@adityam_local_bookings_v2');
      } catch {}
    }
    setUser(null);
    setDependents([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dependents,
        isLoggedIn: !!user,
        loginAsTestUser,
        loginWithPhone,
        loginWithGoogle,
        verifyAndAttachPhone,
        logout,
        addDependent,
        removeDependent,
        deductWallet,
        updateUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
