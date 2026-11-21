import React from 'react';
import { useRouter } from 'expo-router';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { PartnerHospitalOverview } from '../../../../components/partner/opd/PartnerHospitalOverview';
import { usePartnerAuth } from '../../../../components/partner/PartnerAuthGate';
import { usePartnerHospitalId } from '../../../../src/hooks/usePartnerHospitalId';

export default function PartnerOpdHospitalRoute() {
  const router = useRouter();
  const { partnerUser } = usePartnerAuth();
  const hospitalId = usePartnerHospitalId();

  return (
    <PartnerShell
      activeRoute="opd_hospital"
      title="Hospital & Branches"
      subtitle="Manage hospital profile, facilities, branches & ON/OFF availability"
    >
      <PartnerHospitalOverview
        hospitalId={hospitalId}
        submittedByUserId={partnerUser?.id}
        onAddNewHospital={() => router.push('/partner/opd/hospital/add-new' as any)}
        onEditHospital={(slug) => router.push(`/partner/opd/hospital/add-new?editSlug=${slug}` as any)}
        onEditPendingRequest={(reqId) => router.push(`/partner/opd/hospital/add-new?requestId=${reqId}` as any)}
        onAddDoctor={() => router.push('/partner/opd/doctors/add-new' as any)}
        onViewDoctors={() => router.push('/partner/opd/doctors' as any)}
      />
    </PartnerShell>
  );
}
