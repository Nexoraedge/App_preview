import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Dependent } from '@adityam/types';

const AUTH_USER_STORAGE_KEY = '@adityam_auth_user_v1';
const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1';

interface AuthContextType {
  user: User | null;
  dependents: Dependent[];
  isLoggedIn: boolean;
  loginAsTestUser: () => void;
  loginWithPhone: (phone: string, otp: string, fullName?: string, aadhaarLastFour?: string) => boolean;
  logout: () => void;
  addDependent: (dependent: Omit<Dependent, 'id' | 'user_id' | 'created_at'>) => void;
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

const INITIAL_DEPENDENTS: Dependent[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    user_id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Sunita Malhotra',
    relation: 'Mother',
    age: 62,
    gender: 'Female',
    aadhaar_last_four: '4592',
    kyc_status: 'verified',
    consent_given: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    user_id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Pooja Malhotra',
    relation: 'Spouse',
    age: 32,
    gender: 'Female',
    aadhaar_last_four: '8120',
    kyc_status: 'verified',
    consent_given: true,
    created_at: new Date().toISOString(),
  },
];

const getStoredInitialUser = (): User | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return TEST_USER;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredInitialUser);
  const [dependents, setDependents] = useState<Dependent[]>(INITIAL_DEPENDENTS);

  // Restore session from AsyncStorage asynchronously on all platforms
  useEffect(() => {
    AsyncStorage.getItem(AUTH_USER_STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            setUser(JSON.parse(data));
          } catch {}
        }
      })
      .catch(() => {});
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
    // App Store review bypass: phone 9999999999 or OTP 123456
    if (phone.includes('9999999999')) {
      const reviewerUser: User = {
        ...TEST_USER,
        full_name: cleanName !== 'Abhishek Jain' ? cleanName : TEST_USER.full_name,
        aadhaar_last_four: cleanAadhaar,
      };
      saveUserSession(reviewerUser);
      return true;
    }

    // General login with user's inputted full name
    const newUser: User = {
      id: `user-${Date.now()}`,
      phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
      full_name: cleanName,
      age: 29,
      gender: 'Male',
      city: 'Delhi NCR',
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
            phone: newUser.phone,
            full_name: newUser.full_name,
            city: newUser.city,
            wallet_balance: newUser.wallet_balance,
            is_verified: true,
          })
        ).catch(() => {});
      }).catch(() => {});
    } catch {}

    return true;
  };


  const logout = () => {
    saveUserSession(null);
  };

  const addDependent = (dep: Omit<Dependent, 'id' | 'user_id' | 'created_at'>) => {
    const newDep: Dependent = {
      ...dep,
      id: `dep-${Date.now()}`,
      user_id: user?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    setDependents((prev) => [newDep, ...prev]);
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
      return updated;
    });
  };

  const deleteAccount = async () => {
    try {
      await AsyncStorage.multiRemove([
        AUTH_USER_STORAGE_KEY,
        ONBOARDING_SEEN_KEY,
        '@adityam_appointments_v1',
        '@adityam_lab_cart_v1',
        '@adityam_family_v1',
        '@adityam_settings_v1',
      ]);
    } catch {}
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(ONBOARDING_SEEN_KEY);
        window.localStorage.removeItem('@adityam_lab_cart_v1');
        window.localStorage.removeItem('@adityam_appointments_v1');
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
        logout,
        addDependent,
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
