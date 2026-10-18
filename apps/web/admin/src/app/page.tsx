'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Hospital as HospitalIcon, 
  MapPin, 
  FileText, 
  QrCode, 
  Activity, 
  Search, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Flame,
  Volume2,
  X,
  Send,
  Plus
} from 'lucide-react';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import { getSupabaseClient, SEED_BOOKINGS } from '@adityam/supabase';

export default function CallCenterDashboard() {
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(SEED_BOOKINGS[0]);
  const [activeTab, setActiveTab] = useState<'ALL' | ServiceType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentNote, setAgentNote] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [newAlertBadge, setNewAlertBadge] = useState<string | null>(null);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Attempt real-time subscription
    try {
      const channel = supabase
        .channel('public:bookings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => {
            console.log('Realtime change received:', payload);
            if (payload.eventType === 'INSERT') {
              const newBooking = payload.new as Booking;
              setBookings((prev) => [newBooking, ...prev]);
              setNewAlertBadge(`New ${newBooking.service_type} from ${newBooking.patient_name}`);
              setTimeout(() => setNewAlertBadge(null), 5000);
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Booking;
              setBookings((prev) =>
                prev.map((b) => (b.id === updated.id ? updated : b))
              );
              if (selectedBooking?.id === updated.id) {
                setSelectedBooking(updated);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Offline fallback: keep seed data active
      setRealtimeConnected(false);
    }
  }, [selectedBooking]);

  // Call timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdateStatus = (bookingId: string, nextStatus: BookingStatus, callStatus: Booking['call_status']) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: nextStatus, call_status: callStatus } : b
      )
    );
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking((prev) =>
        prev ? { ...prev, status: nextStatus, call_status: callStatus } : null
      );
    }

    // Try sending update to Supabase
    try {
      const supabase = getSupabaseClient();
      supabase
        .from('bookings')
        .update({ status: nextStatus, call_status: callStatus })
        .eq('id', bookingId)
        .then();
    } catch {
      // Ignored in offline mock mode
    }
  };

  const handleTriggerExotelCall = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCallingModalOpen(true);
    setIsCallActive(true);
    handleUpdateStatus(booking.id, 'CALLING', 'calling');
  };

  const handleEndCall = (outcome: 'CONFIRMED' | 'REJECTED' | 'CALLBACK') => {
    setIsCallActive(false);
    setIsCallingModalOpen(false);
    if (!selectedBooking) return;

    if (outcome === 'CONFIRMED') {
      handleUpdateStatus(selectedBooking.id, 'CONFIRMED', 'completed');
    } else if (outcome === 'REJECTED') {
      handleUpdateStatus(selectedBooking.id, 'CANCELLED', 'completed');
    } else {
      handleUpdateStatus(selectedBooking.id, 'NEW', 'pending');
    }
  };

  // Mock simulator to trigger incoming request from mobile app
  const simulateIncomingPatientRequest = () => {
    const randomHospital = ['Max Super Speciality Hospital, Saket', 'Fortis Memorial Gurugram', 'Medanta - The Medicity'][Math.floor(Math.random() * 3)];
    const randomNames = ['Aman Sharma', 'Priya Deshmukh', 'Rajeev Kapoor', 'Ananya Gupta', 'Kavita Chawla'];
    const randomPatient = randomNames[Math.floor(Math.random() * randomNames.length)];
    const mockRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest: Booking = {
      id: `mock-${Date.now()}`,
      booking_ref: mockRef,
      service_type: 'OPD_CONCIERGE',
      patient_name: randomPatient,
      patient_phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      hospital_name: randomHospital,
      specialty_requested: 'General Medicine / Fever Clinic',
      status: 'NEW',
      call_status: 'pending',
      notes: 'Urgent OPD Concierge booked via Mobile App. Distance: 2.4 km.',
      created_at: new Date().toISOString(),
    };

    setBookings((prev) => [newRequest, ...prev]);
    setSelectedBooking(newRequest);
    setNewAlertBadge(`🔔 NEW OPD Request: ${newRequest.patient_name} (${randomHospital})`);
    setTimeout(() => setNewAlertBadge(null), 6000);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesTab = activeTab === 'ALL' || b.service_type === activeTab;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch =
      b.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patient_phone.includes(searchQuery) ||
      b.booking_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.hospital_name && b.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesStatus && matchesSearch;
  });

  const stats = {
    newRequests: bookings.filter((b) => b.status === 'NEW').length,
    activeCalling: bookings.filter((b) => b.status === 'CALLING').length,
    confirmedToday: bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PAID').length,
    avgResponseTime: '38s',
  };

  return (
    <div className="flex h-screen bg-[#F7F9FB] text-slate-800 overflow-hidden font-body">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1D2D50] text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-[#15213C]">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3A7BD5] to-[#CFF7EA] flex items-center justify-center text-[#1D2D50] font-black shadow-lg">
                AN
              </div>
              <div>
                <h1 className="font-header font-bold text-lg tracking-tight text-white leading-none">
                  Adityam Niramayaa
                </h1>
                <p className="text-[11px] font-medium text-[#CFF7EA] uppercase tracking-wider mt-1">
                  Call-Center CRM v1.0
                </p>
              </div>
            </div>
          </div>

          {/* Realtime Live Indicator */}
          <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CFF7EA] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#CFF7EA]"></span>
              </span>
              <span className="text-xs text-white/90 font-medium">Supabase Realtime</span>
            </div>
            <span className="text-[10px] bg-[#124D41] text-[#CFF7EA] px-2 py-0.5 rounded font-mono font-bold">
              LIVE
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'ALL'
                  ? 'bg-[#3A7BD5] text-white shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4" />
                <span>All Live Feeds</span>
              </div>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('OPD_CONCIERGE')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'OPD_CONCIERGE'
                  ? 'bg-[#3A7BD5] text-white shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <HospitalIcon className="w-4 h-4" />
                <span>OPD Concierge</span>
              </div>
              <span className="text-xs bg-[#CFF7EA] text-[#124D41] px-2 py-0.5 rounded-full font-bold">
                {bookings.filter((b) => b.service_type === 'OPD_CONCIERGE').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PHARMACY_SCAN_PAY')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'PHARMACY_SCAN_PAY'
                  ? 'bg-[#3A7BD5] text-white shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <QrCode className="w-4 h-4" />
                <span>Pharmacy Scan & Pay</span>
              </div>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                {bookings.filter((b) => b.service_type === 'PHARMACY_SCAN_PAY').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('IPD_ENQUIRY')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'IPD_ENQUIRY'
                  ? 'bg-[#3A7BD5] text-white shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4" />
                <span>IPD Admissions</span>
              </div>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                {bookings.filter((b) => b.service_type === 'IPD_ENQUIRY').length}
              </span>
            </button>
          </nav>
        </div>

        {/* Exotel Cloud Masked Calling Status */}
        <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center space-x-2 text-[#CFF7EA] mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Exotel Masked Gateway</span>
          </div>
          <p className="text-xs text-slate-300">
            Virtual DID: <span className="font-mono text-white font-bold">+91 11 4000 8800</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Patient phone numbers are shielded during agent calls.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, phone, booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#3A7BD5] transition"
              />
            </div>

            {/* Status Quick Filters */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
              {(['ALL', 'NEW', 'CALLING', 'CONFIRMED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    statusFilter === status
                      ? 'bg-white text-[#1D2D50] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Action Center & Test Surge Generator */}
          <div className="flex items-center space-x-3">
            <button
              onClick={simulateIncomingPatientRequest}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#124D41] to-[#1B6C5C] text-white hover:opacity-95 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate Patient Request</span>
            </button>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#1D2D50] text-[#CFF7EA] flex items-center justify-center font-bold text-xs">
                OP
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 leading-tight">Agent Simran</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Available for Calls</p>
              </div>
            </div>
          </div>
        </header>

        {/* Real-Time Live Notification Banner */}
        {newAlertBadge && (
          <div className="bg-[#124D41] text-[#CFF7EA] px-6 py-2.5 flex items-center justify-between text-xs font-semibold animate-pulse shadow-md">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>{newAlertBadge}</span>
            </div>
            <span className="text-[11px] underline cursor-pointer">Dispatch Now</span>
          </div>
        )}

        {/* KPI Metric Cards */}
        <section className="p-6 pb-2 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Incoming In Queue
              </p>
              <p className="text-2xl font-black text-rose-600 font-heading mt-1">
                {stats.newRequests}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Exotel Calling Now
              </p>
              <p className="text-2xl font-black text-[#3A7BD5] font-heading mt-1">
                {stats.activeCalling}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#3A7BD5] flex items-center justify-center">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Confirmed Today
              </p>
              <p className="text-2xl font-black text-[#124D41] font-heading mt-1">
                {stats.confirmedToday}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#CFF7EA]/50 text-[#124D41] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Avg Dispatch Time
              </p>
              <p className="text-2xl font-black text-[#1D2D50] font-heading mt-1">
                {stats.avgResponseTime}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#1D2D50] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Master-Detail Split Workspace */}
        <div className="flex-1 flex overflow-hidden p-6 pt-4 gap-6">
          {/* Left: Real-time Request Stream */}
          <div className="w-5/12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h2 className="font-bold text-sm text-slate-900">
                  Live Dispatch Stream ({filteredBookings.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Auto-updating</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredBookings.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No booking requests matching filter</p>
                </div>
              ) : (
                filteredBookings.map((booking) => {
                  const isSelected = selectedBooking?.id === booking.id;
                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`p-3.5 rounded-lg cursor-pointer transition relative mb-1.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border border-[#3A7BD5]/40 shadow-sm'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          {booking.booking_ref}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            booking.status === 'NEW'
                              ? 'bg-rose-100 text-rose-700 animate-pulse'
                              : booking.status === 'CALLING'
                              ? 'bg-amber-100 text-amber-800'
                              : booking.status === 'CONFIRMED' || booking.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900">
                          {booking.patient_name}
                        </h3>
                        <span className="text-xs font-mono font-medium text-slate-500">
                          {booking.patient_phone}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 flex items-center space-x-1 mt-1 truncate">
                        <HospitalIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{booking.hospital_name || 'Partner Health Network'}</span>
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#1D2D50] bg-slate-100 px-2 py-0.5 rounded">
                          {booking.service_type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(booking.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Detailed Patient Concierge Desk */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {selectedBooking ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Lead Header */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-[#F7F9FB] to-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {selectedBooking.booking_ref}
                      </span>
                      <span className="text-xs bg-[#CFF7EA] text-[#124D41] font-bold px-2 py-0.5 rounded-full">
                        {selectedBooking.service_type}
                      </span>
                    </div>
                    <h2 className="text-2xl font-heading font-black text-[#1D2D50] mt-1">
                      {selectedBooking.patient_name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contact: <span className="font-mono font-semibold text-slate-800">{selectedBooking.patient_phone}</span>
                    </p>
                  </div>

                  {/* Exotel Call CTA */}
                  <div>
                    <button
                      onClick={() => handleTriggerExotelCall(selectedBooking)}
                      className="flex items-center space-x-2 bg-[#3A7BD5] hover:bg-[#2967BE] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition active:scale-95"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Initiate Masked Call (Exotel)</span>
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6 flex-1">
                  {/* Hospital Info Box */}
                  <div className="bg-[#F7F9FB] p-5 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Requested Partner Facility
                    </h4>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1D2D50] text-[#CFF7EA] flex items-center justify-center shrink-0">
                        <HospitalIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-base text-slate-900">
                          {selectedBooking.hospital_name || 'Adityam Health Partner'}
                        </p>
                        {selectedBooking.specialty_requested && (
                          <p className="text-xs font-medium text-[#3A7BD5] mt-0.5">
                            Specialty: {selectedBooking.specialty_requested}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Delhi NCR Geospatial Hub • Within 5 km</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pharmacy Bill Details if Scan & Pay */}
                  {selectedBooking.service_type === 'PHARMACY_SCAN_PAY' && (
                    <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-[#124D41] uppercase tracking-wider">
                          Pharmacy Scan & Pay Verification
                        </h4>
                        <span className="text-xs font-bold bg-[#CFF7EA] text-[#124D41] px-2 py-0.5 rounded">
                          25% Platform Discount
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-500">Gross Bill</p>
                          <p className="font-bold text-slate-900">₹{selectedBooking.bill_amount || 1600}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-emerald-200">
                          <p className="text-[10px] text-emerald-700">App Savings (25%)</p>
                          <p className="font-bold text-emerald-700">-₹{selectedBooking.discount_amount || 400}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-blue-200">
                          <p className="text-[10px] text-blue-700">Final Patient Paid</p>
                          <p className="font-black text-blue-700">₹{selectedBooking.final_payable || 1200}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Call Notes & Dispatch Resolution */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Concierge Call Notes & Hospital Confirmation
                    </label>
                    <textarea
                      rows={3}
                      value={agentNote || selectedBooking.notes || ''}
                      onChange={(e) => setAgentNote(e.target.value)}
                      placeholder="Enter consultation time slot confirmed with hospital, doctor name, or patient remarks..."
                      className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A7BD5]"
                    />
                  </div>

                  {/* Status Action Workflow Buttons */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED', 'completed')}
                        className="flex items-center space-x-1.5 bg-[#124D41] hover:bg-[#1B6C5C] text-white px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Slot with Hospital</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED', 'completed')}
                        className="px-4 py-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                      >
                        Cancel Request
                      </button>
                    </div>

                    <button
                      onClick={() => alert(`WhatsApp confirmation sent to ${selectedBooking.patient_phone}!`)}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-lg text-xs font-bold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <HospitalIcon className="w-12 h-12 stroke-1 mb-3 text-slate-300" />
                <p className="font-semibold text-sm">Select an incoming request from the dispatch stream</p>
                <p className="text-xs text-slate-400 mt-1">Real-time bookings will appear instantly as users submit them in the app.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exotel Masked Call Simulator Modal */}
      {isCallingModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1D2D50] text-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#CFF7EA]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#CFF7EA]">
                  Exotel Masked Telephony Engine
                </span>
              </div>
              <button
                onClick={() => setIsCallingModalOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-6">
              <div className="relative inline-block mx-auto mb-4">
                <div className="w-20 h-20 rounded-full bg-[#3A7BD5] flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
                  <PhoneCall className="w-8 h-8 animate-bounce" />
                </div>
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#1D2D50]"></span>
              </div>

              <h3 className="text-xl font-heading font-black text-white">
                {selectedBooking.patient_name}
              </h3>
              <p className="font-mono text-sm text-[#CFF7EA] mt-1">
                Virtual Routing: +91 11 4000 8800 ➔ Patient
              </p>

              <div className="my-6 inline-block bg-white/10 px-4 py-2 rounded-full font-mono text-sm font-bold text-white">
                ⏱ {formatTimer(callTimer)} • Line Encrypted
              </div>

              <div className="bg-white/5 rounded-xl p-3 text-left text-xs space-y-1 mb-6 border border-white/10">
                <p className="text-white/70">
                  <span className="font-bold text-white">Hospital Requested:</span> {selectedBooking.hospital_name}
                </p>
                <p className="text-white/70">
                  <span className="font-bold text-white">Specialty:</span> {selectedBooking.specialty_requested || 'General Consultation'}
                </p>
                <p className="text-[#CFF7EA] font-semibold mt-1">
                  Agent Script: "Namaste! Calling from Adityam Niramayaa concierge to confirm your priority OPD slot."
                </p>
              </div>

              {/* Call End Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleEndCall('CONFIRMED')}
                  className="w-full bg-[#124D41] hover:bg-[#1B6C5C] text-white py-3 rounded-xl font-bold text-xs transition"
                >
                  ✓ Slot Confirmed
                </button>
                <button
                  onClick={() => handleEndCall('REJECTED')}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-xs transition"
                >
                  ✕ Patient Declined
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
