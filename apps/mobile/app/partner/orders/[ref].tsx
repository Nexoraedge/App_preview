import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PharmacyPartnerPortal } from '../../../components/partner/PharmacyPartnerPortal';

export default function PartnerOrderSlugPage() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const decodedRef = typeof ref === 'string' ? decodeURIComponent(ref) : undefined;
  return <PharmacyPartnerPortal initialOrderRef={decodedRef} />;
}
