import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PharmacyPartnerPortal } from '../../components/partner/PharmacyPartnerPortal';

export default function PartnerPortalScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const validTabs = ['dashboard', 'orders', 'opd', 'opd_doctors', 'opd_hospital', 'labs', 'ipd', 'scanner', 'payouts', 'settings'];
  const initialTab = tab && validTabs.includes(tab) ? (tab as any) : undefined;
  return <PharmacyPartnerPortal initialTab={initialTab} />;
}
