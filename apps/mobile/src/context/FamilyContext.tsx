// src/context/FamilyContext.tsx
// Holds the family members and who the current booking is for.
// Mount <FamilyProvider> once in app/_layout.tsx, around your <Stack /> / <Slot />.
// PROTOTYPE: state lives in memory with bilingual (English & Hindi) helpers.
// Later, back it with a Supabase `family_members` table
// (user_id, name, relation, age, gender, phone, consent_at) protected by row-level security.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Relation = 'Self' | 'Spouse' | 'Father' | 'Mother' | 'Son' | 'Daughter' | 'Other';
export type Gender = 'Female' | 'Male' | 'Other';

export interface Member {
  id: string;
  name: string;
  nameHi?: string;
  relation: Relation;
  relationHi?: string;
  age: number;
  gender?: Gender;
  phone?: string;
  consentAt?: string; // when the user confirmed they have this person's permission
}

export const RELATION_LABELS: Record<Relation, { en: string; hi: string }> = {
  Self: { en: 'Self', hi: 'स्वयं' },
  Spouse: { en: 'Spouse', hi: 'जीवनसाथी' },
  Father: { en: 'Father', hi: 'पिताजी' },
  Mother: { en: 'Mother', hi: 'माताजी' },
  Son: { en: 'Son', hi: 'बेटा' },
  Daughter: { en: 'Daughter', hi: 'बेटी' },
  Other: { en: 'Other', hi: 'अन्य' },
};

export const GENDER_LABELS: Record<Gender, { en: string; hi: string }> = {
  Female: { en: 'Female', hi: 'महिला' },
  Male: { en: 'Male', hi: 'पुरुष' },
  Other: { en: 'Other', hi: 'अन्य' },
};

export function getRelationLabel(relation: Relation, isHi: boolean): string {
  return isHi ? RELATION_LABELS[relation]?.hi || relation : RELATION_LABELS[relation]?.en || relation;
}

export function getGenderLabel(gender: Gender | undefined, isHi: boolean): string {
  if (!gender) return '';
  return isHi ? GENDER_LABELS[gender]?.hi || gender : GENDER_LABELS[gender]?.en || gender;
}

export type FamilyContextType = {
  members: Member[];
  activeId: string;
  active: Member | undefined;
  setActive: (id: string) => void;
  add: (m: Omit<Member, 'id'>) => string;
  update: (id: string, patch: Partial<Omit<Member, 'id'>>) => void;
  remove: (id: string) => void;
};

const FamilyContext = createContext<FamilyContextType | null>(null);

// Invented sample people for the demo.
const SEED: Member[] = [
  {
    id: 'self',
    name: 'You',
    nameHi: 'स्वयं',
    relation: 'Self',
    relationHi: 'अकाउंट धारक',
    age: 34,
  },
  {
    id: 'm1',
    name: 'Asha Jain',
    nameHi: 'आशा जैन',
    relation: 'Mother',
    relationHi: 'माताजी',
    age: 58,
    gender: 'Female',
    consentAt: new Date().toISOString(),
  },
  {
    id: 'm2',
    name: 'Rohan Jain',
    nameHi: 'रोहन जैन',
    relation: 'Son',
    relationHi: 'बेटा',
    age: 8,
    gender: 'Male',
    consentAt: new Date().toISOString(),
  },
];

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(SEED);
  const [activeId, setActiveId] = useState('self');

  const add = useCallback((m: Omit<Member, 'id'>) => {
    const id = `m${Date.now()}`;
    setMembers((prev) => [...prev, { ...m, id }]);
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Member, 'id'>>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const remove = useCallback((id: string) => {
    if (id === 'self') return; // the account holder cannot be removed
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setActiveId((cur) => (cur === id ? 'self' : cur));
  }, []);

  const value = useMemo<FamilyContextType>(
    () => ({
      members,
      activeId,
      active: members.find((m) => m.id === activeId) || members[0],
      setActive: setActiveId,
      add,
      update,
      remove,
    }),
    [members, activeId, add, update, remove]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export const useFamily = (): FamilyContextType => {
  const c = useContext(FamilyContext);
  if (!c) throw new Error('Wrap your app in <FamilyProvider> (in app/_layout.tsx).');
  return c;
};

// For screens that should still work if the provider is not mounted.
export const useFamilyOptional = (): FamilyContextType | null => {
  const c = useContext(FamilyContext);
  if (c) return c;
  return {
    members: SEED,
    activeId: 'self',
    active: SEED[0],
    setActive: () => { },
    add: () => 'self',
    update: () => { },
    remove: () => { },
  };
};
