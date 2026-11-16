import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { PartnerAuthGate } from '../../components/partner/PartnerAuthGate';

export default function PartnerLayout() {
  const appMode = String(process.env.EXPO_PUBLIC_APP_MODE || '').toLowerCase();
  if (appMode === 'patient' || appMode === 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <PartnerAuthGate>
      <Slot />
    </PartnerAuthGate>
  );
}
