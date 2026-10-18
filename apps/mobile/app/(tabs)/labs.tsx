import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FlaskConical, Search, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';

export default function LabsScreen() {
  const { t } = useLanguage();

  return (
    <ScrollView className="flex-1 bg-[#F0F2F2] px-5 pt-14" showsVerticalScrollIndicator={false}>
      <View className="mb-4">
        <Text className="text-2xl font-bold font-serif text-[#182F3B]">
          {t.investigationsTitle}
        </Text>
        <Text className="text-xs text-slate-500 mt-1">
          NABL Accredited Diagnostic Scans, Blood Tests & Full Body Checkups
        </Text>
      </View>

      {/* 25% Off Banner */}
      <View className="bg-[#EAF6F5] p-4.5 rounded-2xl border border-[#D1ECE8] mb-5 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center space-x-1.5">
            <Sparkles size={16} color="#087F8C" />
            <Text className="text-xs font-black text-[#087F8C] uppercase">
              {t.checkupBadge}
            </Text>
          </View>
        </View>
        <Text className="text-base font-bold text-[#2E4A70]">
          Flat 25% Discount on MRI, CT & Blood Tests
        </Text>
        <Text className="text-xs text-slate-600 mt-1 leading-relaxed">
          Book pathology or radiology tests at partner centers and get instant platform discount.
        </Text>
      </View>

      {/* Test Categories */}
      <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider mb-3">
        Popular Test Packages
      </Text>

      {[
        { name: 'Comprehensive Full Body Checkup (72 Tests)', price: '₹1,499', original: '₹3,000', tag: 'Most Popular' },
        { name: 'Advanced Cardiac Risk Profile (Lipid + ECG)', price: '₹999', original: '₹2,000', tag: 'Fast Results' },
        { name: 'Diabetes Screening (HbA1c + Fasting Sugar)', price: '₹399', original: '₹800', tag: 'NABL Certified' },
        { name: 'Thyroid Function Profile (T3, T4, TSH)', price: '₹450', original: '₹900', tag: 'Home Sample' },
      ].map((test, idx) => (
        <View key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs font-extrabold text-[#24B0BA]">{test.tag}</Text>
            <View className="bg-[#FFF9F0] px-2 py-0.5 rounded">
              <Text className="text-[10px] font-black text-[#CF8A40]">25% OFF</Text>
            </View>
          </View>
          <Text className="text-sm font-bold text-[#2E4A70]">{test.name}</Text>
          <View className="flex-row items-baseline justify-between mt-3 pt-2 border-t border-slate-100">
            <View className="flex-row items-baseline space-x-2">
              <Text className="text-base font-black text-[#2E4A70]">{test.price}</Text>
              <Text className="text-xs line-through text-slate-400">{test.original}</Text>
            </View>
            <TouchableOpacity className="bg-[#24B0BA] px-3.5 py-1.5 rounded-xl flex-row items-center space-x-1">
              <Text className="text-white text-xs font-bold">Book Test</Text>
              <ArrowRight size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View className="h-10" />
    </ScrollView>
  );
}
