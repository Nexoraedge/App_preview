import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { AdminAuthGate } from '../../components/admin/AdminAuthGate';

export default function AdminLayout() {
  const appMode = String(process.env.EXPO_PUBLIC_APP_MODE || '').toLowerCase();
  if (appMode === 'patient' || appMode === 'partner') {
    return <Redirect href="/" />;
  }

  return (
    <AdminAuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Console | Adityam Niramayaa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="hospitals/[slug]"
        options={{
          title: 'Hospital Detail | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="hospitals/add-new"
        options={{
          title: 'Add New Hospital | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="doctors/[slug]"
        options={{
          title: 'Doctor Profile | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="doctors/add-new"
        options={{
          title: 'Add Solo Doctor | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="pharmacies/[slug]"
        options={{
          title: 'Pharmacy Detail | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="pharmacies/add-new"
        options={{
          title: 'Add Partner Pharmacy | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="labs/[slug]"
        options={{
          title: 'Lab Centre Detail | Adityam Admin',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="labs/add-new"
        options={{
          title: 'Add Lab & Scan Centre | Adityam Admin',
          headerShown: false,
        }}
      />
      </Stack>
    </AdminAuthGate>
  );
}
