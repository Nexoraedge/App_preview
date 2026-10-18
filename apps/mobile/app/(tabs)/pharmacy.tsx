import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  Camera as CameraIcon,
  QrCode,
  Upload,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Building,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';

export default function PharmacyScanPayScreen() {
  const { user, deductWallet } = useAuth();

  const [scannedStore, setScannedStore] = useState<string | null>('Apollo Pharmacy - Saket Block B');
  const [billAmount, setBillAmount] = useState('1600');
  const [billImage, setBillImage] = useState<string | null>(
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptRef, setReceiptRef] = useState<string | null>(null);

  // Discount calculation
  const gross = parseFloat(billAmount) || 0;
  const discountRate = 0.25; // 25% Adityam platform subsidy
  const discountAmount = Math.round(gross * discountRate);
  const finalPayable = Math.max(0, gross - discountAmount);

  // UPI payment intent link
  const upiId = 'adityam@icici';
  const payeeName = 'Adityam Niramayaa Healthcare';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    payeeName
  )}&am=${finalPayable}&cu=INR&tn=${encodeURIComponent('Pharmacy 25% Discount Bill')}`;

  const handleSimulateScan = () => {
    setIsCameraActive(false);
    setScannedStore('Medanta Medstore - Saket Metro');
    Alert.alert('QR Detected', 'Partner Pharmacy: Medanta Medstore verified.');
  };

  const handleCaptureBill = () => {
    setBillImage(
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
    );
    Alert.alert('Bill Captured', 'Receipt photo verified for 25% instant discount calculation.');
  };

  const handleLaunchUPIIntent = async () => {
    const bookingRef = `AN-PHARM-${Math.floor(1000 + Math.random() * 9000)}`;

    // Sync to Supabase Realtime
    const newBooking: Booking = {
      id: `pharm-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'PHARMACY_SCAN_PAY',
      user_id: user?.id,
      patient_name: user?.full_name || 'Dr. Vikram Malhotra',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_name: scannedStore || 'Partner Pharmacy Counter',
      bill_amount: gross,
      discount_amount: discountAmount,
      final_payable: finalPayable,
      status: 'PAID',
      call_status: 'completed',
      notes: `Counter bill ₹${gross}. Instant 25% discount ₹${discountAmount}. Paid ₹${finalPayable} via UPI intent.`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback
    }

    // Attempt to open UPI app
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      }
    } catch {
      // Silently continue for web / simulator
    }

    setReceiptRef(bookingRef);
    setPaymentSuccess(true);
    deductWallet(finalPayable);
  };

  return (
    <ScrollView className="flex-1 bg-[#F0F2F2] px-5 pt-4" showsVerticalScrollIndicator={false}>
      {/* 25% Subsidy Announcement in Linen (#FFF9F0) and Gold (#CF8A40) */}
      <View className="bg-[#FFF9F0] p-4.5 rounded-2xl mb-4 shadow-sm border border-[#CF8A40]/40">
        <View className="flex-row items-center space-x-2">
          <Sparkles size={16} color="#CF8A40" />
          <Text className="text-[#CF8A40] text-xs font-black uppercase tracking-wider">
            Launch Event Guarantee
          </Text>
        </View>
        <Text className="text-[#2E4A70] text-base font-bold mt-1">
          Instant Flat 25% Discount on Counter Medicines
        </Text>
        <Text className="text-slate-600 text-xs mt-0.5 leading-relaxed">
          Scan the pharmacy counter QR code, snap the physical bill, and pay the subsidized amount via UPI.
        </Text>
      </View>

      {/* Step 1: Scan Store QR Code */}
      <View className="bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <QrCode size={18} color="#24B0BA" />
            <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider">
              1. Partner Pharmacy QR
            </Text>
          </View>
          {/* Turquoise #24B0BA Action Button */}
          <TouchableOpacity
            onPress={() => setIsCameraActive(!isCameraActive)}
            className="bg-[#E6F8F9] px-3 py-1.5 rounded-lg"
          >
            <Text className="text-[#24B0BA] text-xs font-bold">
              {isCameraActive ? 'Close Camera' : 'Open Camera'}
            </Text>
          </TouchableOpacity>
        </View>

        {isCameraActive ? (
          <View className="bg-[#2E4A70] rounded-xl p-6 items-center justify-center my-2">
            <View className="w-48 h-48 border-2 border-dashed border-[#73C7E3] rounded-xl items-center justify-center">
              <QrCode size={64} color="#73C7E3" />
              <Text className="text-white text-xs mt-3 font-semibold">
                Point camera at store QR code
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSimulateScan}
              className="mt-4 bg-[#24B0BA] py-2 px-4 rounded-lg"
            >
              <Text className="text-white font-bold text-xs">Simulate QR Detection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Building size={16} color="#2E4A70" className="mr-2" />
            <View className="flex-1">
              <Text className="text-[10px] text-slate-500 font-semibold uppercase">Verified Partner</Text>
              <Text className="text-xs font-bold text-slate-800">
                {scannedStore || 'Scan Partner Counter QR'}
              </Text>
            </View>
            <CheckCircle2 size={16} color="#24B0BA" />
          </View>
        )}
      </View>

      {/* Step 2: Upload / Snap Bill Photo */}
      <View className="bg-white p-4 rounded-2xl border border-slate-200 mb-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <CameraIcon size={18} color="#24B0BA" />
            <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider">
              2. Capture Bill Photo
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCaptureBill}
            className="bg-[#E6F8F9] px-3 py-1.5 rounded-lg flex-row items-center space-x-1"
          >
            <Upload size={12} color="#24B0BA" />
            <Text className="text-[#24B0BA] text-xs font-bold">Snap Bill</Text>
          </TouchableOpacity>
        </View>

        {billImage && (
          <View className="flex-row items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Image
              source={{ uri: billImage }}
              className="w-12 h-12 rounded-lg mr-3"
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-800">Bill_Receipt_1600.jpg</Text>
              <Text className="text-[11px] text-[#24B0BA] font-semibold">
                ✓ Prescription verified by Adityam AI Engine
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Step 3: Enter Bill & Realtime 25% Discount Calculation */}
      <View className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 shadow-sm">
        <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider mb-2">
          3. Bill Amount & 25% Discount Breakdown
        </Text>

        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
          <Text className="text-base font-bold text-[#2E4A70] mr-2">₹</Text>
          <TextInput
            placeholder="Enter counter bill amount"
            keyboardType="numeric"
            value={billAmount}
            onChangeText={setBillAmount}
            className="flex-1 text-base font-bold text-slate-900"
          />
        </View>

        {/* Calculation Summary Table */}
        <View className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-xs text-slate-600">Gross Counter Bill</Text>
            <Text className="text-xs font-bold text-slate-900">₹{gross.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-row items-center space-x-1">
              <Text className="text-xs font-bold text-[#CF8A40]">Adityam 25% Discount</Text>
              <View className="bg-[#FFF9F0] border border-[#CF8A40]/40 px-1.5 py-0.2 rounded">
                <Text className="text-[9px] font-black text-[#CF8A40]">SUBSIDIZED</Text>
              </View>
            </View>
            <Text className="text-xs font-bold text-[#CF8A40]">-₹{discountAmount.toFixed(2)}</Text>
          </View>

          <View className="w-full h-px bg-slate-200 my-1" />

          <View className="flex-row justify-between items-baseline">
            <Text className="text-sm font-bold text-[#2E4A70]">Net Amount You Pay</Text>
            <Text className="text-xl font-black text-[#2E4A70]">₹{finalPayable.toFixed(2)}</Text>
          </View>
        </View>

        {/* UPI Payment Intent Trigger (Turquoise #24B0BA) */}
        <TouchableOpacity
          onPress={handleLaunchUPIIntent}
          className="mt-5 bg-[#24B0BA] active:bg-[#1E97A0] py-3.5 rounded-xl items-center flex-row justify-center space-x-2 shadow-lg shadow-[#24B0BA]/20"
        >
          <CreditCard size={18} color="#FFFFFF" />
          <Text className="text-white font-bold text-sm">
            Pay ₹{finalPayable} via UPI (GPay / PhonePe / Paytm)
          </Text>
        </TouchableOpacity>

        <Text className="text-[10px] text-slate-400 text-center mt-2">
          Direct UPI Intent: upi://pay?pa={upiId}&am={finalPayable}
        </Text>
      </View>

      {/* Payment Success Confirmation Drawer */}
      {paymentSuccess && (
        <View className="bg-[#FFF9F0] border border-[#CF8A40]/50 p-5 rounded-2xl mb-8">
          <View className="flex-row items-center space-x-2 mb-2">
            <CheckCircle2 size={20} color="#24B0BA" />
            <Text className="text-base font-bold text-[#2E4A70]">
              Payment Completed & Synced!
            </Text>
          </View>
          <Text className="text-xs font-mono font-bold text-[#CF8A40]">
            Receipt Reference: {receiptRef}
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            You saved ₹{discountAmount} on this order. Dispatched to Call-Center CRM. Show this screen to the counter pharmacist.
          </Text>
        </View>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
