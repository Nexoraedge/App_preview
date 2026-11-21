import React from 'react';
import { PartnerAuthGate, usePartnerAuth } from '../../../components/partner/PartnerAuthGate';
import { PartnerShell } from '../../../components/partner/PartnerShell';
import { PartnerIpdDesk } from '../../../components/partner/ipd/PartnerIpdDesk';

function PartnerIpdContent() {
  const { partnerUser } = usePartnerAuth();
  const hospitalId =
    partnerUser?.partnerHospitalId ||
    (partnerUser?.partnerType === 'hospital' ? partnerUser?.partnerEntityId : null);

  return (
    <PartnerShell
      activeRoute="ipd"
      title="IPD & Surgery Desk"
      subtitle="Cashless TPA coordination, surgery estimates, bed capacity & admissions"
    >
      <PartnerIpdDesk hospitalId={hospitalId} />
    </PartnerShell>
  );
}

export default function PartnerIpdRoute() {
  return (
    <PartnerAuthGate>
      <PartnerIpdContent />
    </PartnerAuthGate>
  );
}
