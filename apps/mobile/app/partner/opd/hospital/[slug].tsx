import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { PartnerHospitalDetailView } from '../../../../components/partner/opd/PartnerHospitalDetailView';
import { usePartnerHospitalId } from '../../../../src/hooks/usePartnerHospitalId';

export default function PartnerHospitalSlugRoute() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const hospitalId = usePartnerHospitalId();

  return (
    <PartnerShell
      activeRoute="opd_hospital"
      title="Hospital & Branch Details"
      subtitle="Doctors, branch availability, bookings & payout summary"
    >
      <PartnerHospitalDetailView
        slug={String(slug || '')}
        hospitalId={hospitalId}
        onBack={() => router.replace('/partner/opd/hospital' as any)}
        onEditHospital={(hSlug) => router.push(`/partner/opd/hospital/add-new?editSlug=${hSlug}` as any)}
        onAddDoctor={() => router.push('/partner/opd/doctors/add-new' as any)}
      />
    </PartnerShell>
  );
}
