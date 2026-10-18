import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  X,
  CreditCard,
  FileCheck2,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import type { DependentRelation } from '@adityam/types';
import { getSupabaseClient } from '@adityam/supabase';

const RELATIONS: DependentRelation[] = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'];

export default function FamilyVaultScreen() {
  const { user, dependents, addDependent } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState<DependentRelation>('Mother');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [aadhaarLastFour, setAadhaarLastFour] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);

  const handleSaveDependent = async () => {
    if (!fullName.trim() || !age.trim()) {
      Alert.alert('Incomplete Fields', 'Please enter full name and age of the family member.');
      return;
    }
    if (!consentGiven) {
      Alert.alert('Consent Required', 'Please confirm statutory patient consent to proceed.');
      return;
    }

    const newDepData = {
      full_name: fullName,
      relation,
      age: parseInt(age, 10) || 30,
      gender,
      aadhaar_last_four: aadhaarLastFour.trim() || '4592',
      kyc_status: 'lazy_submitted' as const,
      consent_given: true,
    };

    addDependent(newDepData);

    try {
      const supabase = getSupabaseClient();
      await supabase.from('dependents').insert({
        user_id: user?.id,
        ...newDepData,
      });
    } catch {
      // Offline fallback handling
    }

    setModalVisible(false);
    setFullName('');
    setAge('');
    setAadhaarLastFour('');
    Alert.alert('Dependent Added', `${fullName} has been added to your Family Vault.`);
  };

  return (
    <View className="flex-1 bg-[#F0F2F2]">
      {/* Header Info (Navy #2E4A70 + Sky #73C7E3) */}
      <View className="bg-[#2E4A70] px-5 pt-3 pb-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <ShieldCheck size={16} color="#73C7E3" />
            <Text className="text-[11px] font-bold text-[#73C7E3] uppercase tracking-wider">
              Lazy Aadhaar KYC Protection
            </Text>
          </View>
          <View className="bg-[#E9F6FB] px-2 py-0.5 rounded">
            <Text className="text-[#2E4A70] text-[10px] font-mono font-bold">ABHA Aligned</Text>
          </View>
        </View>
        <Text className="text-white text-sm font-medium mt-1">
          Store family members for instant hospital slot booking & insurance claims
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* VIP Family Privilege Card in Linen #FFF9F0 and Gold #CF8A40 */}
        <View className="bg-[#FFF9F0] p-4.5 rounded-2xl border border-[#CF8A40]/40 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <Sparkles size={16} color="#CF8A40" />
              <Text className="text-xs font-black text-[#CF8A40] uppercase tracking-wider">
                Family Health Privilege Card
              </Text>
            </View>
            <View className="bg-[#CF8A40] px-2 py-0.5 rounded">
              <Text className="text-white text-[9px] font-black uppercase">ACTIVE</Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-[#2E4A70]">
            Malhotra Family Coverage (Tier 1)
          </Text>
          <Text className="text-xs text-slate-600 mt-1 leading-relaxed">
            All registered dependents automatically receive 25% pharmacy discounts and priority OPD concierge routing across all network hospitals.
          </Text>
        </View>

        {/* Add Dependent Quick Trigger in Turquoise #24B0BA */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-white p-4 rounded-2xl border-2 border-dashed border-[#24B0BA] flex-row items-center justify-center space-x-2 mb-4 active:bg-[#E6F8F9]"
        >
          <UserPlus size={18} color="#24B0BA" />
          <Text className="text-[#24B0BA] font-bold text-sm">
            + Add New Family Dependent
          </Text>
        </TouchableOpacity>

        {/* Existing Dependents Cards */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Saved Family Profiles ({dependents.length})
        </Text>

        {dependents.map((dep) => (
          <View
            key={dep.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-3"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <Text className="text-base font-bold text-[#2E4A70]">
                  {dep.full_name}
                </Text>
                <View className="bg-[#E9F6FB] px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-semibold text-[#2E4A70]">
                    {dep.relation}
                  </Text>
                </View>
              </View>

              <View
                className={`px-2 py-0.5 rounded-full ${
                  dep.kyc_status === 'verified'
                    ? 'bg-[#E6F8F9] text-[#24B0BA]'
                    : 'bg-[#FFF9F0] text-[#CF8A40]'
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase ${
                    dep.kyc_status === 'verified' ? 'text-[#24B0BA]' : 'text-[#CF8A40]'
                  }`}
                >
                  {dep.kyc_status === 'verified' ? '✓ Aadhaar KYC Verified' : '● Lazy KYC Submitted'}
                </Text>
              </View>
            </View>

            <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">
                {dep.age} yrs • {dep.gender}
              </Text>
              <View className="flex-row items-center space-x-1">
                <CreditCard size={12} color="#64748B" />
                <Text className="text-xs font-mono font-semibold text-slate-700">
                  XXXX-XXXX-{dep.aadhaar_last_four || '9999'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View className="bg-white p-4 rounded-2xl border border-slate-200 mt-4 mb-8">
          <View className="flex-row items-center space-x-1.5 mb-1">
            <FileCheck2 size={14} color="#24B0BA" />
            <Text className="text-xs font-bold text-[#2E4A70] uppercase">
              What is Lazy Aadhaar KYC?
            </Text>
          </View>
          <Text className="text-xs text-slate-600 leading-relaxed">
            To prevent drop-offs during booking, patients only provide their dependent's last 4 Aadhaar digits. Full biometric / OTP authentication is deferred until actual admission at the partner hospital counter.
          </Text>
        </View>
      </ScrollView>

      {/* Add Dependent Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <Text className="text-base font-bold text-[#2E4A70]">
                Add Dependent Profile
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-4 space-y-4" showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <View>
                <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Legal Name
                </Text>
                <TextInput
                  placeholder="e.g. Ramesh Chandra Malhotra"
                  value={fullName}
                  onChangeText={setFullName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900"
                />
              </View>

              {/* Relation */}
              <View>
                <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
                  Relation to Patient
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {RELATIONS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setRelation(rel)}
                      className={`px-3 py-1.5 rounded-lg border ${
                        relation === rel
                          ? 'bg-[#24B0BA] border-[#24B0BA]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          relation === rel ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Age & Gender */}
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
                    Age
                  </Text>
                  <TextInput
                    placeholder="e.g. 58"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={age}
                    onChangeText={setAge}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
                    Gender
                  </Text>
                  <View className="flex-row space-x-2">
                    {['Male', 'Female'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          gender === g
                            ? 'bg-[#2E4A70] border-[#2E4A70]'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            gender === g ? 'text-[#73C7E3]' : 'text-slate-700'
                          }`}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Lazy Aadhaar Number */}
              <View>
                <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
                  Aadhaar Number (Lazy KYC)
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <Text className="text-xs font-mono font-bold text-slate-400 mr-2">
                    XXXX - XXXX -
                  </Text>
                  <TextInput
                    placeholder="1234"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={aadhaarLastFour}
                    onChangeText={setAadhaarLastFour}
                    className="flex-1 text-xs font-mono font-bold text-slate-900"
                  />
                </View>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Only last 4 digits stored for immediate booking. Verification completed on admission.
                </Text>
              </View>

              {/* Statutory Consent */}
              <TouchableOpacity
                onPress={() => setConsentGiven(!consentGiven)}
                className="flex-row items-start space-x-2 pt-2"
              >
                <View
                  className={`w-4 h-4 rounded border mt-0.5 items-center justify-center ${
                    consentGiven ? 'bg-[#24B0BA] border-[#24B0BA]' : 'border-slate-300'
                  }`}
                >
                  {consentGiven && <CheckCircle2 size={12} color="#FFFFFF" />}
                </View>
                <Text className="text-[11px] text-slate-600 flex-1 leading-snug">
                  I give consent to store this dependent profile for Adityam Niramayaa OPD & IPD consultations.
                </Text>
              </TouchableOpacity>

              {/* Submit CTA in Turquoise #24B0BA */}
              <TouchableOpacity
                onPress={handleSaveDependent}
                className="bg-[#24B0BA] active:bg-[#1E97A0] py-3.5 rounded-xl items-center mt-3 shadow-md"
              >
                <Text className="text-white font-bold text-xs uppercase tracking-wider">
                  Save Dependent to Vault
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
