'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Menu,
  X,
  Search,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import { getSupabaseClient } from '@adityam/supabase';

type AdminNavSection =
  | 'dashboard'
  | 'bookings'
  | 'prescriptions'
  | 'hospitals'
  | 'labs'
  | 'pharmacies'
  | 'patients'
  | 'finance'
  | 'portal-hospital'
  | 'portal-lab'
  | 'portal-pharmacy';

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<AdminNavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [networkCounts, setNetworkCounts] = useState({
    hospitals: 0,
    labs: 0,
    pharmacies: 0,
    patients: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'RX_ONLY' | ServiceType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState<BookingStatus>('NEW');
  const [editAgent, setEditAgent] = useState('');
  const [editDoctorOrPanel, setEditDoctorOrPanel] = useState('');
  const [editSlotTime, setEditSlotTime] = useState('');
  const [editGrossBill, setEditGrossBill] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editFinalPayable, setEditFinalPayable] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [bookingsRes, hospRes, labRes, pharmRes, usersRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('lab_centres').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
      ]);

      if (bookingsRes.data && Array.isArray(bookingsRes.data)) {
        setBookings(bookingsRes.data as Booking[]);
      }

      setNetworkCounts({
        hospitals: hospRes.count ?? 4,
        labs: labRes.count ?? 5,
        pharmacies: pharmRes.count ?? 6,
        patients: usersRes.count ?? 1,
      });

      setLastSyncedAt(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (err) {
      console.warn('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('next-admin-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => loadDashboardData(true)
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  const isPrescriptionOrTriage = useCallback((b: Booking) => {
    const ref = b.booking_ref || '';
    return (
      Boolean(b.bill_image_url) ||
      ref.includes('-RX-') ||
      ref.includes('DOC-ADVICE') ||
      b.service_type === 'IPD_ENQUIRY' ||
      b.service_type === 'PHARMACY_SCAN_PAY'
    );
  }, []);

  const metrics = useMemo(() => {
    const activeList = bookings.filter((b) => b.status !== 'CANCELLED');
    const pendingRxCount = bookings.filter(
      (b) =>
        isPrescriptionOrTriage(b) &&
        b.status !== 'CANCELLED' &&
        b.status !== 'COMPLETED'
    ).length;

    const totalRevenue = activeList.reduce(
      (sum, b) => sum + Number(b.final_payable ?? b.doctor_fee ?? 0),
      0
    );
    const totalSavings = activeList.reduce(
      (sum, b) => sum + Number(b.discount_amount ?? 0),
      0
    );

    const todayStr = new Date().toDateString();
    const todayBookings = bookings.filter(
      (b) => new Date(b.created_at).toDateString() === todayStr
    ).length;

    return {
      totalBookings: bookings.length,
      todayBookings,
      pendingRxCount,
      totalRevenue,
      totalSavings,
      opdCount: bookings.filter((b) => b.service_type === 'OPD_CONCIERGE').length,
      labCount: bookings.filter((b) => b.service_type === 'INVESTIGATION').length,
      pharmacyCount: bookings.filter((b) => b.service_type === 'PHARMACY_SCAN_PAY').length,
      ipdCount: bookings.filter((b) => b.service_type === 'IPD_ENQUIRY').length,
    };
  }, [bookings, isPrescriptionOrTriage]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (serviceFilter === 'RX_ONLY') {
        if (!isPrescriptionOrTriage(b)) return false;
      } else if (serviceFilter !== 'ALL' && b.service_type !== serviceFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (b.booking_ref || '').toLowerCase().includes(q) ||
          (b.patient_name || '').toLowerCase().includes(q) ||
          (b.patient_phone || '').toLowerCase().includes(q) ||
          (b.hospital_name || '').toLowerCase().includes(q) ||
          (b.doctor_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, serviceFilter, statusFilter, searchQuery, isPrescriptionOrTriage]);

  const openInspector = (b: Booking) => {
    setSelectedBooking(b);
    setEditStatus(b.status);
    setEditAgent(b.assigned_agent || '');
    setEditDoctorOrPanel(b.doctor_name || '');
    setEditSlotTime(b.slot_time || '');
    setEditGrossBill(b.bill_amount ? String(b.bill_amount) : '');
    setEditDiscount(b.discount_amount ? String(b.discount_amount) : '');
    const payable = b.final_payable ?? b.doctor_fee ?? 0;
    setEditFinalPayable(payable ? String(payable) : '');
    setEditNotes(b.notes || '');
  };

  const handleSaveBookingChanges = async () => {
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const grossNum = editGrossBill ? Number(editGrossBill) : 0;
      const discountNum = editDiscount ? Number(editDiscount) : 0;
      const payableNum = editFinalPayable
        ? Number(editFinalPayable)
        : Math.max(0, grossNum - discountNum);

      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          status: editStatus,
          assigned_agent: editAgent.trim() || null,
          doctor_name: editDoctorOrPanel.trim() || selectedBooking.doctor_name,
          slot_time: editSlotTime.trim() || selectedBooking.slot_time,
          bill_amount: grossNum,
          discount_amount: discountNum,
          final_payable: payableNum,
          doctor_fee: payableNum,
          notes: editNotes.trim() || selectedBooking.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', selectedBooking.booking_ref);

      await loadDashboardData(true);
      setSelectedBooking(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSection = (sec: AdminNavSection) => {
    setActiveSection(sec);
    setMobileMenuOpen(false);
    if (sec === 'prescriptions') setServiceFilter('RX_ONLY');
    else if (sec === 'bookings' || sec === 'dashboard') setServiceFilter('ALL');
  };

  const navGroups = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard' as AdminNavSection, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'bookings' as AdminNavSection, label: 'Live Bookings', icon: CalendarCheck, badge: metrics.totalBookings },
        { id: 'prescriptions' as AdminNavSection, label: 'Prescription Queue', icon: FileText, badge: metrics.pendingRxCount },
      ],
    },
    {
      title: 'Jaipur Catalog',
      items: [
        { id: 'hospitals' as AdminNavSection, label: 'Hospitals & Doctors', icon: Building2, badge: networkCounts.hospitals },
        { id: 'labs' as AdminNavSection, label: 'Labs & Scans', icon: FlaskConical, badge: networkCounts.labs },
        { id: 'pharmacies' as AdminNavSection, label: 'Pharmacies', icon: Pill, badge: networkCounts.pharmacies },
      ],
    },
    {
      title: 'Users & Finance',
      items: [
        { id: 'patients' as AdminNavSection, label: 'Patients & Families', icon: Users, badge: networkCounts.patients },
        { id: 'finance' as AdminNavSection, label: 'Payments & Refunds', icon: CreditCard },
      ],
    },
    {
      title: 'Partner Portals',
      items: [
        { id: 'portal-hospital' as AdminNavSection, label: 'Hospital Portal', icon: Stethoscope },
        { id: 'portal-lab' as AdminNavSection, label: 'Lab Portal', icon: Activity },
        { id: 'portal-pharmacy' as AdminNavSection, label: 'Pharmacy Portal', icon: Store },
      ],
    },
  ];

  const renderSidebar = () => (
    <div className="w-[248px] bg-[#14362B] text-[#FAF8F2] flex flex-col justify-between h-full border-r border-[#1D4A3B] shrink-0">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#1E4C3C] flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base text-[#FAF8F2] leading-tight">Adityam Admin</h1>
            <p className="text-[11px] font-semibold text-[#9DC0B1] mt-0.5">Jaipur Command Center</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-[#1E4C3C] text-[#FAF8F2]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-3 my-3 px-3 py-2 rounded-lg bg-[#1A4436] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs font-semibold text-[#E6F0EB]">Supabase Live</span>
          </div>
          <span className="text-[10px] font-bold text-[#86EFAC]">
            {realtimeConnected ? 'SYNCED' : 'ACTIVE'}
          </span>
        </div>

        <nav className="px-2.5 py-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7EA897]">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition ${
                        active
                          ? 'bg-[#235946] text-white font-bold'
                          : 'text-[#D9E8E1] font-medium hover:bg-[#1A4436]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && (
                        <span
                          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg ${
                            active ? 'bg-[#FAF8F2]/20 text-white' : 'bg-white/10 text-[#B7D4C7]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-[#1E4C3C] text-[11px] text-[#9DC0B1]">
        <p className="font-semibold text-[#FAF8F2]">Adityam Niramayaa</p>
        <p className="text-[10px] mt-0.5">Jaipur Region • Production v1.0</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAF8F2] text-[#1A2421] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">{renderSidebar()}</div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative z-10 h-full">{renderSidebar()}</div>
          <div
            className="flex-1 bg-[#0F1F18]/55"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[#E6E1D5] px-4 lg:px-7 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#F3EFE4] border border-[#E6E1D5] text-[#1A2421]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base lg:text-lg font-extrabold text-[#1A2421] truncate">
                Dashboard Overview
              </h2>
              <p className="text-xs text-[#5C6B64] truncate">
                Jaipur live bookings & prescription triage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center bg-[#FAF8F2] border border-[#E6E1D5] rounded-lg px-3 py-1.5 w-60">
              <Search className="w-3.5 h-3.5 text-[#5C6B64] mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, patient, phone..."
                className="bg-transparent text-xs text-[#1A2421] focus:outline-none w-full"
              />
            </div>

            <button
              onClick={() => {
                setIsRefreshing(true);
                loadDashboardData(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EBF5F0] text-[#1B5E43] border border-[#C6E2D4] text-xs font-bold hover:bg-[#DFEFE7] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-7 space-y-5">
          {/* 4 Clean KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-[#E6E1D5]">
              <p className="text-[11px] font-bold uppercase text-[#5C6B64]">Total Bookings</p>
              <p className="text-2xl font-black text-[#1A2421] mt-1.5">{metrics.totalBookings}</p>
              <p className="text-xs font-semibold text-[#1B5E43] mt-1.5">
                {metrics.todayBookings} booked today
              </p>
            </div>

            <div
              onClick={() => setServiceFilter(serviceFilter === 'RX_ONLY' ? 'ALL' : 'RX_ONLY')}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                serviceFilter === 'RX_ONLY'
                  ? 'bg-[#FEF7E6] border-[#F3DBA8]'
                  : 'bg-white border-[#E6E1D5]'
              }`}
            >
              <p className="text-[11px] font-bold uppercase text-[#5C6B64]">Rx & Triage Queue</p>
              <p className="text-2xl font-black text-[#9A5B13] mt-1.5">{metrics.pendingRxCount}</p>
              <p className="text-xs font-semibold text-[#9A5B13] mt-1.5">
                Tap to filter slips
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E6E1D5]">
              <p className="text-[11px] font-bold uppercase text-[#5C6B64]">Paid Volume</p>
              <p className="text-2xl font-black text-[#1B5E43] mt-1.5">
                ₹{metrics.totalRevenue.toLocaleString('en-IN')}
              </p>
              <p className="text-xs font-semibold text-[#5C6B64] mt-1.5">
                ₹{metrics.totalSavings.toLocaleString('en-IN')} patient savings
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E6E1D5]">
              <p className="text-[11px] font-bold uppercase text-[#5C6B64]">Jaipur Network</p>
              <p className="text-2xl font-black text-[#1A2421] mt-1.5">
                {networkCounts.hospitals + networkCounts.labs + networkCounts.pharmacies}
              </p>
              <p className="text-xs font-semibold text-[#5C6B64] mt-1.5 truncate">
                {networkCounts.hospitals} Hosp · {networkCounts.labs} Labs · {networkCounts.pharmacies} Pharm
              </p>
            </div>
          </div>

          {/* 4 Pillar Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                { id: 'OPD_CONCIERGE' as ServiceType, title: 'OPD Consults', count: metrics.opdCount },
                { id: 'INVESTIGATION' as ServiceType, title: 'Labs & Scans', count: metrics.labCount },
                { id: 'PHARMACY_SCAN_PAY' as ServiceType, title: 'Pharmacy Orders', count: metrics.pharmacyCount },
                { id: 'IPD_ENQUIRY' as ServiceType, title: 'IPD Admissions', count: metrics.ipdCount },
              ]
            ).map((pillar) => {
              const active = serviceFilter === pillar.id;
              return (
                <button
                  key={pillar.id}
                  onClick={() => setServiceFilter(active ? 'ALL' : pillar.id)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-left transition ${
                    active
                      ? 'bg-[#EBF5F0] border-[#1B5E43]'
                      : 'bg-white border-[#E6E1D5] hover:border-[#C6E2D4]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#1A2421] truncate">{pillar.title}</span>
                  <span className="text-base font-black text-[#1B5E43] ml-2">{pillar.count}</span>
                </button>
              );
            })}
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-2xl border border-[#E6E1D5] overflow-hidden">
            <div className="p-4 border-b border-[#E6E1D5] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm lg:text-base font-extrabold text-[#1A2421]">
                  Live Requests & Prescription Queue ({filteredBookings.length})
                </h3>
                <p className="text-xs text-[#5C6B64] mt-0.5">
                  Select any row to inspect uploaded slips, assign coordinator, or set bill
                  {lastSyncedAt ? ` · Synced ${lastSyncedAt}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'RX_ONLY', label: 'Uploaded Rx' },
                    { id: 'OPD_CONCIERGE', label: 'OPD' },
                    { id: 'INVESTIGATION', label: 'Labs' },
                    { id: 'PHARMACY_SCAN_PAY', label: 'Pharmacy' },
                    { id: 'IPD_ENQUIRY', label: 'IPD' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setServiceFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      serviceFilter === tab.id
                        ? 'bg-[#14362B] text-white'
                        : 'bg-[#F3EFE4] text-[#1A2421]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F2] border-b border-[#E6E1D5] text-[10.5px] font-extrabold uppercase text-[#5C6B64]">
                    <th className="py-2.5 px-4">Ref</th>
                    <th className="py-2.5 px-4">Patient</th>
                    <th className="py-2.5 px-4">Service</th>
                    <th className="py-2.5 px-4">Facility & Details</th>
                    <th className="py-2.5 px-4">Slip</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EFE8] text-xs">
                  {filteredBookings.map((b) => {
                    const feeVal = Number(b.final_payable ?? b.doctor_fee ?? 0);
                    return (
                      <tr
                        key={b.id || b.booking_ref}
                        onClick={() => openInspector(b)}
                        className="hover:bg-[#FAF8F2] cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-bold text-[#1A2421]">#{b.booking_ref}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#1A2421]">{b.patient_name}</p>
                          <p className="text-[#5C6B64]">{b.patient_phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded bg-[#F3EFE4] text-[#1A2421] font-bold text-[11px]">
                            {b.service_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#1A2421]">{b.hospital_name}</p>
                          <p className="text-[#5C6B64]">{b.doctor_name} · {b.slot_time}</p>
                        </td>
                        <td className="py-3 px-4">
                          {b.bill_image_url ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#EBF5F0] text-[#1B5E43] font-bold text-[11px]">
                              <Eye className="w-3 h-3" /> Slip
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {b.service_type === 'IPD_ENQUIRY' ? (
                            <span className="text-[#1B5E43]">Cashless TPA</span>
                          ) : feeVal > 0 ? (
                            <span className="text-[#1B5E43]">₹{feeVal.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-[#9A5B13]">Quote Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded bg-[#EBF5F0] text-[#1B5E43] font-bold text-[11px]">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6E1D5] bg-[#FAF8F2] font-bold text-[#1A2421]">
                            Manage <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Inspector Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-[#14362B]/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-[#E6E1D5]">
            <div className="bg-[#14362B] px-5 py-4 flex items-center justify-between text-[#FAF8F2]">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9DC0B1]">Booking & Prescription Triage</p>
                <h3 className="text-base font-extrabold">
                  #{selectedBooking.booking_ref} · {selectedBooking.patient_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg bg-white/15 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedBooking.bill_image_url && (
                <div className="bg-[#EBF5F0] border border-[#C6E2D4] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#14362B]">Uploaded Prescription / Slip</span>
                    <a
                      href={selectedBooking.bill_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1B5E43] text-white text-[11px] font-bold"
                    >
                      Open Full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <img
                    src={selectedBooking.bill_image_url}
                    alt="Uploaded prescription"
                    className="w-full max-h-56 object-contain rounded-lg bg-white"
                  />
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase text-[#5C6B64] mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['NEW', 'CALLING', 'CONFIRMED', 'PAID', 'COMPLETED', 'MISSED', 'CANCELLED'] as BookingStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setEditStatus(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        editStatus === st
                          ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                          : 'bg-[#FAF8F2] text-[#1A2421] border-[#E6E1D5]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] mb-1">Assigned Coordinator</label>
                  <input
                    value={editAgent}
                    onChange={(e) => setEditAgent(e.target.value)}
                    placeholder="e.g. Simran Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF8F2] border border-[#E6E1D5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] mb-1">Confirmed Slot</label>
                  <input
                    value={editSlotTime}
                    onChange={(e) => setEditSlotTime(e.target.value)}
                    placeholder="e.g. Tomorrow, 08:00 AM"
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF8F2] border border-[#E6E1D5] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] mb-1">Gross Bill (₹)</label>
                  <input
                    type="number"
                    value={editGrossBill}
                    onChange={(e) => setEditGrossBill(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF8F2] border border-[#E6E1D5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF8F2] border border-[#E6E1D5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1B5E43] mb-1">Final Payable (₹)</label>
                  <input
                    type="number"
                    value={editFinalPayable}
                    onChange={(e) => setEditFinalPayable(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#EBF5F0] border border-[#C6E2D4] text-xs font-bold text-[#14362B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {selectedBooking.patient_phone ? (
                  <a
                    href={`tel:${selectedBooking.patient_phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EBF5F0] text-[#1B5E43] border border-[#C6E2D4] text-xs font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 rounded-lg bg-[#F3EFE4] text-[#5C6B64] text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBookingChanges}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save & Sync'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
