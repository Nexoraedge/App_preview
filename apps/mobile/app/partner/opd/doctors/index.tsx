import React from 'react';
import { useRouter } from 'expo-router';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { PartnerDoctorsList } from '../../../../components/partner/opd/PartnerDoctorsList';
import { usePartnerHospitalId } from '../../../../src/hooks/usePartnerHospitalId';

export default function PartnerOpdDoctorsRoute() {
  const router = useRouter();
  const hospitalId = usePartnerHospitalId();

  return (
    <PartnerShell
      activeRoute="opd_doctors"
      title="Doctors & Sitting Timings"
      subtitle="Add doctors, configure sitting hours, toggle ON/OFF & manage branches"
    >
      <PartnerDoctorsList
        hospitalId={hospitalId}
        onAddNew={() => router.push('/partner/opd/doctors/add-new' as any)}
        onViewDoctor={(slug) => router.push(`/partner/opd/doctors/${slug}` as any)}
        onEditDoctor={(slug) => router.push(`/partner/opd/doctors/${slug}?mode=edit` as any)}
        onSetupHospital={() => router.push('/partner/opd/hospital/add-new' as any)}
      />
    </PartnerShell>
  );
}
