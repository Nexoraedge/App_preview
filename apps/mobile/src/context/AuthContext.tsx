import React, { createContext, useContext, useState } from 'react';
import type { User, Dependent } from '@adityam/types';

interface AuthContextType {
  user: User | null;
  dependents: Dependent[];
  isLoggedIn: boolean;
  loginAsTestUser: () => void;
  loginWithPhone: (phone: string, otp: string) => boolean;
  logout: () => void;
  addDependent: (dependent: Omit<Dependent, 'id' | 'user_id' | 'created_at'>) => void;
  deductWallet: (amount: number) => void;
}

const TEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  phone: '+91 99999 99999',
  full_name: 'Dr. Vikram Malhotra',
  age: 34,
  gender: 'Male',
  city: 'Delhi NCR',
  wallet_balance: 2500.00,
  is_verified: true,
  role: 'patient',
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(TEST_USER);
  const [dependents, setDependents] = useState<Dependent[]>(INITIAL_DEPENDENTS);

  const loginAsTestUser = () => {
    setUser(TEST_USER);
  };

  const loginWithPhone = (phone: string, otp: string) => {
    // App Store review bypass: phone 9999999999 or OTP 123456
    if (phone.includes('9999999999') || otp === '123456') {
      setUser(TEST_USER);
      return true;
    }
    // General login
    const newUser: User = {
      id: `user-${Date.now()}`,
      phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
      full_name: 'Patient User',
      age: 28,
      gender: 'Other',
      city: 'Delhi NCR',
      wallet_balance: 1250.00,
      is_verified: true,
      role: 'patient',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
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
    setUser((prev) => (prev ? { ...prev, wallet_balance: Math.max(0, prev.wallet_balance - amount) } : null));
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
