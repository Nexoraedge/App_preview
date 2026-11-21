import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Building2,
  FlaskConical,
  Pill,
  Users,
  CreditCard,
  Stethoscope,
  Store,
  Activity,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Handshake,
} from 'lucide-react-native';
import { getAllowedSectionsForRole, useAdminAuth } from './AdminAuthGate';

export type AdminNavSection =
  | 'dashboard'
  | 'bookings'
  | 'prescriptions'
  | 'hospitals'
  | 'solo-doctors'
  | 'enquiries'
  | 'verifications'
  | 'labs'
  | 'pharmacies'
  | 'patients'
  | 'finance'
  | 'audit';

interface AdminSidebarProps {
  activeSection: AdminNavSection;
  onSelectSection: (section: AdminNavSection) => void;
  isDesktop: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenPatientApp: () => void;
  counts: {
    totalBookings: number;
    pendingRx: number;
    hospitals: number;
    enquiries?: number;
    verifications?: number;
    labs: number;
    pharmacies: number;
    patients: number;
  };
  realtimeConnected: boolean;
}

interface NavItemConfig {
  id: AdminNavSection;
  label: string;
  icon: any;
  badge?: number;
}

export function AdminSidebar({
  activeSection,
  onSelectSection,
  isDesktop,
  mobileOpen,
  onCloseMobile,
  onOpenPatientApp,
  counts,
  realtimeConnected,
}: AdminSidebarProps) {
  const { adminUser, signOut } = useAdminAuth();
  const allowed = new Set(getAllowedSectionsForRole(adminUser?.role));

  const coreNav: NavItemConfig[] = (
    [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'bookings', label: 'Live Bookings', icon: CalendarCheck, badge: counts.totalBookings },
      { id: 'verifications', label: 'Verifications', icon: ShieldCheck, badge: counts.verifications },
      { id: 'enquiries', label: 'Partner Enquiries', icon: Handshake, badge: counts.enquiries },
      { id: 'prescriptions', label: 'Prescription Queue', icon: FileText, badge: counts.pendingRx },
    ] as NavItemConfig[]
  ).filter((item) => allowed.has(item.id));

  const catalogNav: NavItemConfig[] = (
    [
      { id: 'hospitals', label: 'Hospitals', icon: Building2, badge: counts.hospitals },
      { id: 'solo-doctors', label: 'Doctors', icon: Stethoscope },


      { id: 'labs', label: 'Labs & Scans', icon: FlaskConical, badge: counts.labs },
      { id: 'pharmacies', label: 'Pharmacies', icon: Pill, badge: counts.pharmacies },
    ] as NavItemConfig[]
  ).filter((item) => allowed.has(item.id));

  const managementNav: NavItemConfig[] = (
    [
      { id: 'patients', label: 'Patients & Families', icon: Users, badge: counts.patients },
      { id: 'finance', label: 'Payments & Refunds', icon: CreditCard },
      { id: 'audit', label: 'Team & Audit', icon: ShieldCheck },
    ] as NavItemConfig[]
  ).filter((item) => allowed.has(item.id));

  const renderNavButton = (item: NavItemConfig) => {
    const IconComponent = item.icon;
    const isActive = activeSection === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        onPress={() => {
          onSelectSection(item.id);
          if (!isDesktop) onCloseMobile();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderRadius: 8,
          marginBottom: 2,
          backgroundColor: isActive ? '#235946' : 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <IconComponent
            size={16}
            color={isActive ? '#FAF8F2' : '#9DC0B1'}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#FFFFFF' : '#D9E8E1',
            }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </View>

        {typeof item.badge === 'number' && item.badge > 0 && (
          <View
            style={{
              backgroundColor: isActive ? 'rgba(250, 248, 242, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              paddingHorizontal: 7,
              paddingVertical: 1.5,
              borderRadius: 8,
              minWidth: 22,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: isActive ? '#FFFFFF' : '#B7D4C7',
              }}
            >
              {item.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const sidebarContent = (
    <View
      style={{
        width: 248,
        flexShrink: 0,
        flexGrow: 0,
        height: '100%',
        backgroundColor: '#14362B',
        borderRightWidth: 1,
        borderRightColor: '#1D4A3B',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* Brand Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#1E4C3C',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: '#FAF8F2',
                letterSpacing: -0.3,
              }}
            >
              Adityam Admin
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '600',
                color: '#9DC0B1',
                marginTop: 2,
              }}
            >
              Command Center
            </Text>
          </View>

          {!isDesktop && (
            <TouchableOpacity
              onPress={onCloseMobile}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: '#1E4C3C',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#FAF8F2" />
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Groups */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10 }}
        >
          {coreNav.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#7EA897',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  paddingHorizontal: 10,
                  marginBottom: 5,
                  marginTop: 4,
                }}
              >
                Operations
              </Text>
              {coreNav.map(renderNavButton)}
            </>
          )}

          {catalogNav.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#7EA897',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  paddingHorizontal: 10,
                  marginBottom: 5,
                  marginTop: 14,
                }}
              >
                Catalog
              </Text>
              {catalogNav.map(renderNavButton)}
            </>
          )}

          {managementNav.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#7EA897',
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  paddingHorizontal: 10,
                  marginBottom: 5,
                  marginTop: 14,
                }}
              >
                Users & Finance
              </Text>
              {managementNav.map(renderNavButton)}
            </>
          )}
        </ScrollView>
      </View>

      {/* Footer */}
      <View
        style={{
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: '#1E4C3C',
          gap: 8,
        }}
      >
        {adminUser && (
          <View
            style={{
              backgroundColor: '#102C23',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FAF8F2' }} numberOfLines={1}>
                {adminUser.fullName}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#86EFAC', textTransform: 'uppercase' }}>
                {adminUser.role}
              </Text>
            </View>
            <TouchableOpacity
              onPress={signOut}
              activeOpacity={0.8}
              style={{
                padding: 6,
                borderRadius: 6,
                backgroundColor: '#1E4C3C',
              }}
            >
              <LogOut size={13} color="#FAF8F2" />
            </TouchableOpacity>
          </View>
        )}


      </View>
    </View>
  );

  if (isDesktop) {
    return sidebarContent;
  }

  return (
    <Modal
      visible={mobileOpen}
      transparent
      animationType="fade"
      onRequestClose={onCloseMobile}
    >
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(15, 31, 24, 0.55)' }}>
        {sidebarContent}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onCloseMobile}
        />
      </View>
    </Modal>
  );
}
