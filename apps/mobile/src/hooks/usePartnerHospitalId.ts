import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@adityam/supabase';
import { usePartnerAuth } from '../../components/partner/PartnerAuthGate';

/**
 * Resolves the partner's linked hospitalId, refreshing from `users.partner_hospital_id`
 * if it was approved after initial login so partners don't have to re-login.
 */
export function usePartnerHospitalId(): string | null {
  const { partnerUser } = usePartnerAuth();
  const initialId =
    partnerUser?.partnerHospitalId ||
    (partnerUser?.partnerType === 'hospital' ? partnerUser?.partnerEntityId : null) ||
    null;

  const [hospitalId, setHospitalId] = useState<string | null>(initialId);

  useEffect(() => {
    setHospitalId(initialId);
    if (initialId || !partnerUser?.id) return;

    let active = true;
    const supabase = getSupabaseClient();
    const fetchFresh = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('partner_hospital_id')
          .eq('id', partnerUser.id)
          .maybeSingle();
        if (active && data?.partner_hospital_id) {
          setHospitalId(data.partner_hospital_id);
        }
      } catch {
        // noop
      }
    };
    void fetchFresh();

    const channel = supabase
      .channel(`partner-user-hospital-${partnerUser.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${partnerUser.id}` },
        (payload) => {
          const nextId = (payload.new as any)?.partner_hospital_id;
          if (nextId && active) setHospitalId(nextId);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [initialId, partnerUser?.id]);

  return hospitalId;
}
