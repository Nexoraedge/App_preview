import React from 'react';
import { Slot } from 'expo-router';
import { PartnerAuthGate } from '../../components/partner/PartnerAuthGate';

export default function PartnerLayout() {
  return (
    <PartnerAuthGate>
      <Slot />
    </PartnerAuthGate>
  );
}
