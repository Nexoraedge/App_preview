import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { OpdAppointmentDetailView } from '../../../../components/partner/opd/OpdAppointmentDetailView';

export default function PartnerOpdAppointmentDetailRoute() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();

  return (
    <PartnerShell
      activeRoute="opd"
      title={`Appointment #${ref || ''}`}
      subtitle="Verify patient OTP, check in visit, upload Rx & manage consultation notes"
    >
      <OpdAppointmentDetailView
        bookingRef={String(ref || '')}
        onBack={() => router.replace('/partner/opd' as any)}
      />
    </PartnerShell>
  );
}
