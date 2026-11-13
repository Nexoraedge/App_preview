// apps/mobile/src/context/FamilyContext.tsx
// Holds the family members and who the current booking is for.
// Live synced directly with Supabase Cloud `dependents` and `users` tables.

import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from './AuthContext';

const FAMILY_STORAGE_KEY = '@adityam_family_members_v3';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUuid(str?: string | null): boolean {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
}

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
  consentAt?: string;
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
  refreshFamily: () => Promise<void>;
  isLoading: boolean;
};

const FamilyContext = createContext<FamilyContextType | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const effectiveUserId = isUuid(user?.id) ? user!.id : (user ? user.id : '00000000-0000-0000-0000-000000000001');
  const userFamilyStorageKey = user?.id ? `@adityam_family_v2_${user.id}` : FAMILY_STORAGE_KEY;

  const selfMember: Member = useMemo(
    () => ({
      id: 'self',
      name: user?.full_name || 'You',
      nameHi: user?.full_name || 'स्वयं',
      relation: 'Self',
      relationHi: 'अकाउंट धारक',
      age: user?.age || 34,
      gender: (user?.gender as Gender) || 'Male',
      phone: user?.phone || undefined,
    }),
    [user?.full_name, user?.age, user?.gender, user?.phone]
  );

  const [members, setMembers] = useState<Member[]>([selfMember]);
  const [activeId, setActiveId] = useState('self');
  const [isLoading, setIsLoading] = useState(true);

  // Sync selfMember whenever user updates
  useEffect(() => {
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === 'self');
      if (idx === -1) return [selfMember, ...prev];
      const next = [...prev];
      next[idx] = selfMember;
      return next;
    });
  }, [selfMember]);

  // Load from Supabase dependents table directly
  const fetchDependentsFromDb = useCallback(async () => {
    if (!user) {
      setMembers([selfMember]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      
      // Strict filter: only load dependents belonging to this specific user or matching phone
      let query = supabase.from('dependents').select('*');
      if (user.phone) {
        query = query.or(`user_id.eq.${effectiveUserId},phone.eq.${user.phone}`);
      } else {
        query = query.eq('user_id', effectiveUserId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mappedDependents: Member[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || 'Family Member',
          nameHi: d.full_name || 'परिवार सदस्य',
          relation: (d.relation || 'Other') as Relation,
          age: Number(d.age) || 30,
          gender: (d.gender as Gender) || 'Other',
          phone: d.phone || undefined,
          consentAt: d.created_at || new Date().toISOString(),
        }));

        const unified = [selfMember, ...mappedDependents];
        setMembers(unified);
        await AsyncStorage.setItem(userFamilyStorageKey, JSON.stringify(unified));
        return;
      }
    } catch (err) {
      console.warn('[FamilyContext] Supabase dependents fetch error:', err);
    } finally {
      setIsLoading(false);
    }

    // Fallback to user-scoped local cache if offline
    try {
      const raw = await AsyncStorage.getItem(userFamilyStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
        }
      }
    } catch {}
  }, [effectiveUserId, selfMember, user, userFamilyStorageKey]);

  // On mount and user change, load dependents
  useEffect(() => {
    fetchDependentsFromDb();
  }, [fetchDependentsFromDb]);

  // Realtime subscription: whenever Supabase dependents table changes, refresh immediately
  useEffect(() => {
    let channel: any = null;
    try {
      const supabase = getSupabaseClient();
      channel = supabase
        .channel('realtime-dependents-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dependents' },
          (payload: any) => {
            console.log('[FamilyContext] Realtime dependent change detected:', payload.eventType);
            fetchDependentsFromDb();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[FamilyContext] Realtime subscription init error:', err);
    }

    return () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {}
      }
    };
  }, [fetchDependentsFromDb]);

  const add = useCallback(
    (m: Omit<Member, 'id'>) => {
      const id = generateUUID();
      const newMember: Member = { ...m, id };
      const rawDigits = m.phone ? m.phone.replace(/[^\d]/g, '').slice(-10) : '';
      const cleanPhone = rawDigits.length === 10 ? `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}` : (m.phone || null);

      // Optimistic state update
      setMembers((prev) => {
        const updated = [...prev, newMember];
        AsyncStorage.setItem(userFamilyStorageKey, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Direct write to Supabase Cloud dependents table
      try {
        const supabase = getSupabaseClient();
        const depPayload: any = {
          id,
          user_id: effectiveUserId,
          full_name: m.name,
          relation: m.relation,
          age: m.age,
          gender: m.gender || 'Other',
          consent_given: true,
          kyc_status: 'verified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (cleanPhone) depPayload.phone = cleanPhone;

        Promise.resolve(
          supabase.from('dependents').insert(depPayload)
        )
          .then(({ error }: any) => {
            if (error) {
              console.warn('[FamilyContext] Supabase insert dependent error:', error.message);
            } else {
              console.log('[FamilyContext] Successfully added dependent to Supabase:', m.name);
            }
          })
          .catch((err: any) => {
            console.warn('[FamilyContext] Supabase insert dependent exception:', err);
          });

        // If member is 18+ and has phone number, register in users table so they can log in via their phone
        if (m.age >= 18 && cleanPhone) {
          Promise.resolve(
            supabase.from('users').upsert({
              phone: cleanPhone,
              full_name: m.name,
              age: m.age,
              gender: m.gender || 'Other',
              role: 'patient',
              is_verified: true,
            }, { onConflict: 'phone' })
          ).catch(() => {});
        }
      } catch {}

      return id;
    },
    [effectiveUserId, userFamilyStorageKey]
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Member, 'id'>>) => {
      const rawDigits = patch.phone ? patch.phone.replace(/[^\d]/g, '').slice(-10) : '';
      const cleanPhone = rawDigits.length === 10 ? `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}` : patch.phone;

      // Optimistic state update
      setMembers((prev) => {
        const updated = prev.map((m) => (m.id === id ? { ...m, ...patch, phone: cleanPhone ?? m.phone } : m));
        AsyncStorage.setItem(userFamilyStorageKey, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Update in Supabase
      try {
        const supabase = getSupabaseClient();

        if (id === 'self') {
          // Account holder profile update
          const userUpdates: Record<string, any> = {};
          if (patch.name) userUpdates.full_name = patch.name;
          if (patch.age) userUpdates.age = patch.age;
          if (patch.gender) userUpdates.gender = patch.gender;
          if (cleanPhone) userUpdates.phone = cleanPhone;

          if (Object.keys(userUpdates).length > 0) {
            updateUser(userUpdates);
            Promise.resolve(
              supabase
                .from('users')
                .update(userUpdates)
                .eq('id', effectiveUserId)
            )
              .then(({ error }: any) => {
                if (error) console.warn('[FamilyContext] Supabase user profile update error:', error.message);
              })
              .catch(() => {});
          }
        } else {
          // Dependent profile update
          const depUpdates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          if (patch.name) depUpdates.full_name = patch.name;
          if (patch.relation) depUpdates.relation = patch.relation;
          if (patch.age) depUpdates.age = patch.age;
          if (patch.gender) depUpdates.gender = patch.gender;
          if (cleanPhone !== undefined) depUpdates.phone = cleanPhone;

          Promise.resolve(
            supabase
              .from('dependents')
              .update(depUpdates)
              .eq('id', id)
          )
            .then(({ error }: any) => {
              if (error) {
                console.warn('[FamilyContext] Supabase update dependent error:', error.message);
              } else {
                console.log('[FamilyContext] Successfully updated dependent in Supabase:', id);
              }
            })
            .catch((err: any) => {
              console.warn('[FamilyContext] Supabase update dependent exception:', err);
            });

          // If member is 18+ and has phone number, sync to users table
          if (patch.age && patch.age >= 18 && cleanPhone) {
            Promise.resolve(
              supabase.from('users').upsert({
                phone: cleanPhone,
                full_name: patch.name,
                age: patch.age,
                gender: patch.gender || 'Other',
                role: 'patient',
                is_verified: true,
              }, { onConflict: 'phone' })
            ).catch(() => {});
          }
        }
      } catch {}
    },
    [effectiveUserId, updateUser, userFamilyStorageKey]
  );

  const remove = useCallback(
    (id: string) => {
      if (id === 'self') return; // Account holder cannot be deleted
      // Optimistic update
      setMembers((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        AsyncStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      setActiveId((cur) => (cur === id ? 'self' : cur));

      // Delete from Supabase
      try {
        const supabase = getSupabaseClient();
        Promise.resolve(
          supabase
            .from('dependents')
            .delete()
            .eq('id', id)
        )
          .then(({ error }: any) => {
            if (error) {
              console.warn('[FamilyContext] Supabase delete dependent error:', error.message);
            } else {
              console.log('[FamilyContext] Successfully deleted dependent from Supabase:', id);
            }
          })
          .catch(() => {});
      } catch {}
    },
    []
  );

  const value = useMemo<FamilyContextType>(
    () => ({
      members,
      activeId,
      active: members.find((m) => m.id === activeId) || members[0],
      setActive: setActiveId,
      add,
      update,
      remove,
      refreshFamily: fetchDependentsFromDb,
      isLoading,
    }),
    [members, activeId, add, update, remove, fetchDependentsFromDb, isLoading]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export const useFamily = (): FamilyContextType => {
  const c = useContext(FamilyContext);
  if (!c) throw new Error('Wrap your app in <FamilyProvider> (in app/_layout.tsx).');
  return c;
};

export const useFamilyOptional = (): FamilyContextType | null => {
  const c = useContext(FamilyContext);
  if (c) return c;
  return null;
};
