import React from 'react';
import { PartnerShell } from '../../../components/partner/PartnerShell';
import { OpdPartnerModule } from '../../../components/partner/OpdPartnerModule';
import { usePartnerAuth } from '../../../components/partner/PartnerAuthGate';
import { usePartnerHospitalId } from '../../../src/hooks/usePartnerHospitalId';

export default function PartnerOpdQueueRoute() {
  const { partnerUser } = usePartnerAuth();
  const hospitalId = usePartnerHospitalId();

  return (
    <PartnerShell
      activeRoute="opd"
      title="OPD & Doctor Consultations"
      subtitle="Live appointments, QR/code verification, call logs & prescription upload"
    >
      <OpdPartnerModule
        hospitalId={hospitalId}
        actorId={partnerUser?.id}
        actorName={partnerUser?.fullName}
        actorRole={partnerUser?.role}
        soundEnabled={true}
      />
    </PartnerShell>
  );
}
