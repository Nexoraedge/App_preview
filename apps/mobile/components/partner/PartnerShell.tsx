import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BedDouble,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  QrCode,
  Settings,
  Stethoscope,
  Store,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { usePartnerAuth } from './PartnerAuthGate';
import { resolvePartnerModules } from '../../src/services/partnerModules';
import { playPartnerOrderAlarm } from '../../src/services/adminAlerts';
import { triggerBrowserNotification } from '../../src/services/notificationService';
import { getPartnerOpenMenus, setPartnerOpenMenus } from '../../src/services/partnerNavState';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
};

export type PartnerShellRouteKey =
  | 'dashboard'
  | 'orders'
  | 'opd'
  | 'opd_doctors'
  | 'opd_hospital'
  | 'labs'
  | 'labs_services'
  | 'ipd'
  | 'scanner'
  | 'payouts'
  | 'settings';

interface NavChild {
  id: PartnerShellRouteKey;
  label: string;
  href: string;
  badge?: number;
}

interface NavItem {
  id: PartnerShellRouteKey;
  label: string;
  href: string;
  icon: any;
  badge?: number;
  children?: NavChild[];
}

interface PartnerShellProps {
  activeRoute: PartnerShellRouteKey;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function PartnerShell({
  activeRoute,
  title,
  subtitle,
  headerRight,
  children,
}: PartnerShellProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { partnerUser, signOutPartner } = usePartnerAuth();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => getPartnerOpenMenus());
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = soundOn;

  const [counts, setCounts] = useState({
    pharmacy: 0,
    opd: 0,
    labs: 0,
    ipd: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('bookings')
        .select('service_type, status, booking_ref, hospital_name, hospital_id, pharmacy_id')
        .limit(300);
      const rows = data || [];
      let pharmacy = 0;
      let opd = 0;
      let labs = 0;
      let ipd = 0;
      for (const r of rows as any[]) {
        const st = String(r.status || '').toUpperCase();
        if (['COMPLETED', 'CANCELLED', 'MISSED', 'REJECTED', 'DISCHARGED'].includes(st)) continue;
        const svc = String(r.service_type || '').toUpperCase();
        const hospLower = String(r.hospital_name || '').toLowerCase();
        const refUpper = String(r.booking_ref || '').toUpperCase();
        if (svc.includes('PHARMACY')) {
          if (!partnerUser?.partnerPharmacyId || !r.pharmacy_id || r.pharmacy_id === partnerUser.partnerPharmacyId) pharmacy += 1;
        } else if (svc.includes('OPD')) {
          if (!partnerUser?.partnerHospitalId || !r.hospital_id || r.hospital_id === partnerUser.partnerHospitalId) opd += 1;
        } else if (svc.includes('LAB') || svc === 'INVESTIGATION') {
          const isAdityam = hospLower.includes('adityam') || refUpper.includes('LAB-RX');
          const matchesPartner =
            Boolean(partnerUser?.partnerHospitalId) && r.hospital_id === partnerUser?.partnerHospitalId;
          if (!isAdityam && matchesPartner) labs += 1;
        } else if (svc.includes('IPD') || svc.includes('SURGERY')) {
          if (!partnerUser?.partnerHospitalId || !r.hospital_id || r.hospital_id === partnerUser.partnerHospitalId) ipd += 1;
        }
      }
      setCounts({ pharmacy, opd, labs, ipd });
    } catch {
      // noop
    }
  }, [partnerUser?.partnerHospitalId, partnerUser?.partnerPharmacyId, partnerUser?.partnerLabId]);

  useEffect(() => {
    void loadCounts();
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('partner-shell-bookings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          void loadCounts();
          if (payload?.eventType === 'INSERT') {
            const row = payload?.new || {};
            const svc = String(row.service_type || 'BOOKING').replace(/_/g, ' ');
            const msg = `${row.patient_name || 'New Patient'} · ${row.doctor_name || row.hospital_name || svc} (#${row.booking_ref || ''})`;
            if (soundRef.current) {
              playPartnerOrderAlarm('New Client Lead!', msg);
            }
            triggerBrowserNotification('New Client Lead — Adityam Partner', msg);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCounts]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      playPartnerOrderAlarm('Partner Alerts Active', 'You will hear a chime on every new client booking.');
      if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => {});
      }
    }
  };

  const enabledModules = partnerUser
    ? resolvePartnerModules({
        enabledModules: partnerUser.enabledModules,
        partnerType: partnerUser.partnerType,
        role: partnerUser.role,
      })
    : [];
  const canPharmacy = enabledModules.includes('PHARMACY');
  const canOpd = enabledModules.includes('OPD');
  const canLabs = enabledModules.includes('LABS');
  const canIpd = enabledModules.includes('IPD');
  const isMultiModule = enabledModules.length > 1;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/partner', icon: LayoutDashboard },
    ...(canPharmacy
      ? [
          {
            id: 'orders' as const,
            label: isMultiModule ? 'Pharmacy' : 'Orders',
            href: '/partner/pharmacy/orders',
            icon: Pill,
            badge: counts.pharmacy || undefined,
            children: [
              { id: 'orders' as const, label: '• Orders Queue', href: '/partner/pharmacy/orders', badge: counts.pharmacy || undefined },
              { id: 'settings' as const, label: '• Store & Delivery', href: '/partner/pharmacy/settings' },
            ],
          },
        ]
      : []),
    ...(canOpd
      ? [
          {
            id: 'opd' as const,
            label: 'OPD',
            href: '/partner/opd',
            icon: Stethoscope,
            badge: counts.opd || undefined,
            children: [
              { id: 'opd' as const, label: '• OPD Queue', href: '/partner/opd', badge: counts.opd || undefined },
              { id: 'opd_doctors' as const, label: '• Doctors & Timings', href: '/partner/opd/doctors' },
              { id: 'opd_hospital' as const, label: '• Hospital & Branches', href: '/partner/opd/hospital' },
            ],
          },
        ]
      : []),
    ...(canLabs
      ? [
          {
            id: 'labs' as const,
            label: 'Labs & Tests',
            href: '/partner/labs',
            icon: FlaskConical,
            badge: counts.labs || undefined,
            children: [
              { id: 'labs' as const, label: '• Walk-in Queue', href: '/partner/labs', badge: counts.labs || undefined },
              { id: 'labs_services' as const, label: '• Services & Timings', href: '/partner/labs/services' },
            ],
          },
        ]
      : []),
    ...(canIpd
      ? [
          {
            id: 'ipd' as const,
            label: 'IPD Desk',
            href: '/partner/ipd',
            icon: BedDouble,
            badge: counts.ipd || undefined,
          },
        ]
      : []),
    { id: 'scanner', label: 'Scan QR', href: '/partner/scanner', icon: QrCode },
    { id: 'payouts', label: 'Payouts', href: '/partner/payouts', icon: Wallet },
  ];

  const navigateTo = (href: string) => {
    setMobileDrawerOpen(false);
    router.replace(href as any);
  };

  const renderBadge = (val?: number) =>
    val && val > 0 ? (
      <View
        style={{
          backgroundColor: '#F3DBA8',
          paddingHorizontal: 7,
          paddingVertical: 1,
          borderRadius: 99,
        }}
      >
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#14362B' }}>{val}</Text>
      </View>
    ) : null;

  const renderNavList = () => (
    <View style={{ gap: 4 }}>
      {navItems.map((tab) => {
        const hasChildren = Boolean(tab.children?.length);
        const menuExpanded = Boolean(openMenus[tab.id]);
        const isGroupActive = hasChildren
          ? tab.children!.some((c) => c.id === activeRoute)
          : activeRoute === tab.id;
        const Icon = tab.icon;

        return (
          <View key={tab.id} style={{ gap: 3 }}>
            <TouchableOpacity
              onPress={() => {
                if (hasChildren) {
                  setOpenMenus((prev) => {
                    const next = { ...prev, [tab.id]: !prev[tab.id] };
                    setPartnerOpenMenus(next);
                    return next;
                  });
                } else {
                  navigateTo(tab.href);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isGroupActive && !hasChildren ? 'rgba(255,255,255,0.14)' : 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon size={17} color={isGroupActive ? '#FFFFFF' : '#9DC0B1'} />
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: isGroupActive ? '800' : '600',
                    color: isGroupActive ? '#FFFFFF' : '#C6E2D4',
                  }}
                >
                  {tab.label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {renderBadge(tab.badge)}
                {hasChildren ? (
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#9DC0B1' }}>
                    {menuExpanded ? '▾' : '▸'}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            {hasChildren && menuExpanded && (
              <View
                style={{
                  marginLeft: 18,
                  paddingLeft: 10,
                  borderLeftWidth: 1,
                  borderLeftColor: 'rgba(255,255,255,0.14)',
                  gap: 2,
                }}
              >
                {tab.children!.map((child) => {
                  const childActive = activeRoute === child.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => navigateTo(child.href)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: childActive ? 'rgba(167,243,208,0.18)' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: childActive ? '800' : '600',
                          color: childActive ? '#FFFFFF' : '#B5D6C7',
                        }}
                      >
                        {child.label}
                      </Text>
                      {renderBadge(child.badge)}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const soundButton = (
    <TouchableOpacity
      onPress={handleToggleSound}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: soundOn ? '#FEF7E6' : THEME.bg,
        borderWidth: 1,
        borderColor: soundOn ? '#F3DBA8' : THEME.border,
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 9,
      }}
    >
      {soundOn ? <Volume2 size={14} color="#92400E" /> : <VolumeX size={14} color={THEME.muted} />}
      <Text style={{ fontSize: 12, fontWeight: '800', color: soundOn ? '#92400E' : THEME.muted }}>
        {soundOn ? 'Sound On' : 'Muted'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: THEME.bg }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <View
          style={{
            width: 248,
            backgroundColor: THEME.greenDark,
            padding: 18,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={19} color="#A7D7C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                  Partner Desk
                </Text>
                <Text style={{ fontSize: 11, color: '#A7D7C0' }}>Adityam Partner Portal</Text>
              </View>
            </View>
            {renderNavList()}
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  {partnerUser?.fullName || partnerUser?.email || 'Partner Staff'}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#A7D7C0', fontWeight: '700', textTransform: 'uppercase' }}>
                  {partnerUser?.role === 'admin' || partnerUser?.role === 'super_admin' ? 'ADMIN PREVIEW' : 'PARTNER PORTAL'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => void signOutPartner()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {/* Mobile Header */}
        {!isDesktop && (
          <View
            style={{
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 14,
              paddingTop: Platform.OS === 'ios' ? 50 : 12,
              paddingBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <TouchableOpacity
                onPress={() => setMobileDrawerOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Menu size={19} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text numberOfLines={1} style={{ fontSize: 11, color: '#A7D7C0' }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            {headerRight || soundButton}
          </View>
        )}

        {/* Desktop Header */}
        {isDesktop && (
          <View
            style={{
              backgroundColor: THEME.surface,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 19, fontWeight: '800', color: THEME.ink }}>{title}</Text>
              {subtitle ? (
                <Text style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>{subtitle}</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {soundButton}
              {headerRight}
            </View>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isDesktop ? 24 : 14, gap: 16 }}>
          {children}
        </ScrollView>
      </View>

      {/* Mobile Burger Drawer */}
      {!isDesktop && (
        <Modal
          visible={mobileDrawerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMobileDrawerOpen(false)}
        >
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
            <View
              style={{
                width: 272,
                backgroundColor: THEME.greenDark,
                paddingTop: Platform.OS === 'ios' ? 48 : 24,
                paddingBottom: 24,
                paddingHorizontal: 14,
                justifyContent: 'space-between',
                height: '100%',
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingHorizontal: 8,
                    paddingBottom: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                    marginBottom: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Store size={19} color="#A7F3D0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                        Partner Desk
                      </Text>
                      <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                        Adityam Partner Portal
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMobileDrawerOpen(false)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {renderNavList()}
              </ScrollView>

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                      {partnerUser?.fullName || partnerUser?.email || 'Partner Staff'}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#A7F3D0', fontWeight: '700', textTransform: 'uppercase' }}>
                      {partnerUser?.role?.replace(/_/g, ' ') || 'PARTNER'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setMobileDrawerOpen(false);
                      void signOutPartner();
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LogOut size={16} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMobileDrawerOpen(false)} />
          </View>
        </Modal>
      )}
    </View>
  );
}
