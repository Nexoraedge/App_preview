import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { AdminAuthGate } from '../../components/admin/AdminAuthGate';

export default function AdityamLabsLayout() {
  const appMode = String(process.env.EXPO_PUBLIC_APP_MODE || '').toLowerCase();
  if (appMode === 'patient' || appMode === 'partner') {
    return <Redirect href="/" />;
  }

  return (
    <AdminAuthGate>
      <Slot />
    </AdminAuthGate>
  );
}
