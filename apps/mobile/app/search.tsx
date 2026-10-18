import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ArrowLeft,
  X,
  Clock,
  TrendingUp,
  Stethoscope,
  FlaskConical,
  Pill,
  Building2,
  ChevronRight,
} from 'lucide-react-native';
import { useLanguage } from '../src/context/LanguageContext';

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'doctor' | 'hospital' | 'lab' | 'medicine';
  route: string;
}

const SEARCH_DATABASE: SearchItem[] = [
  { id: '1', title: 'Dr. Rohan Mehta', subtitle: 'General Physician • 12 yrs exp', type: 'doctor', route: '/opd' },
  { id: '2', title: 'Dr. Ananya Iyer', subtitle: 'Cardiologist • Apollo Hospitals', type: 'doctor', route: '/opd' },
  { id: '3', title: 'Max Super Speciality Hospital', subtitle: 'Saket, New Delhi • 25% Off OPD', type: 'hospital', route: '/opd' },
  { id: '4', title: 'Indraprastha Apollo Hospitals', subtitle: 'Sarita Vihar • NABH & JCI', type: 'hospital', route: '/opd' },
  { id: '5', title: 'Comprehensive Full Body Checkup (72 Tests)', subtitle: '₹1,499 • 50% Off • NABL Accredited', type: 'lab', route: '/labs' },
  { id: '6', title: 'HbA1c & Fasting Blood Sugar Test', subtitle: '₹399 • Home Sample Collection', type: 'lab', route: '/labs' },
  { id: '7', title: 'Paracetamol 650mg (Dolo 650)', subtitle: '₹30.50 • 20% Off', type: 'medicine', route: '/pharmacy' },
  { id: '8', title: 'Vitamin D3 & B12 Combo', subtitle: '₹420 • 20% Off', type: 'medicine', route: '/pharmacy' },
];

const RECENT_SEARCHES = ['Dr. Rohan Mehta', 'Full Body Checkup', 'Max Hospital Saket', 'Vitamin D3'];
const TRENDING_TAGS = ['Cardiology', 'MRI Scan', 'Diabetes Test', 'Apollo Saket', 'Dolo 650', 'Thyroid Profile'];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'doctor' | 'hospital' | 'lab' | 'medicine'>('all');

  const filteredResults = SEARCH_DATABASE.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const getIcon = (type: SearchItem['type']) => {
    switch (type) {
      case 'doctor':
        return <Stethoscope size={16} color="#087F8C" />;
      case 'hospital':
        return <Building2 size={16} color="#087F8C" />;
      case 'lab':
        return <FlaskConical size={16} color="#4F6BED" />;
      case 'medicine':
        return <Pill size={16} color="#8B70D6" />;
    }
  };

  return (
    <View className="flex-1 bg-[#F7FBFA]">
      {/* Top Header Bar */}
      <View
        style={{ paddingTop: Math.max(insets.top, 14) + 6 }}
        className="px-4 pb-3 bg-white border-b border-[#E1EBE8] flex-row items-center space-x-3"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <ArrowLeft size={20} color="#182F3B" />
        </TouchableOpacity>

        {/* Search Input with Uiverse Gradient Border matching Home Theme */}
        <LinearGradient
          colors={['#36CDBB', '#087F8C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 26,
            padding: 2.5,
            justifyContent: 'center',
            shadowColor: '#087F8C',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 23.5,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
              <Search size={17} color="#087F8C" strokeWidth={2.4} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                autoFocus={true}
                placeholder={language === 'hi' ? 'डॉक्टर, अस्पताल, टेस्ट खोजें...' : 'Search doctors, hospitals, tests...'}
                placeholderTextColor="#94A3B8"
                selectionColor="#087F8C"
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 13,
                  color: '#182F3B',
                  fontWeight: '600',
                  letterSpacing: 0.4,
                  paddingVertical: 0,
                }}
              />
            </View>
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#F1F5F4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={13} color="#617581" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Category Filter Chips */}
      <View className="py-2.5 px-4 bg-white border-b border-[#E1EBE8]">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-2">
          {[
            { id: 'all', label: language === 'hi' ? 'सभी' : 'All' },
            { id: 'doctor', label: language === 'hi' ? 'डॉक्टर' : 'Doctors' },
            { id: 'hospital', label: language === 'hi' ? 'अस्पताल' : 'Hospitals' },
            { id: 'lab', label: language === 'hi' ? 'लैब टेस्ट' : 'Lab Tests' },
            { id: 'medicine', label: language === 'hi' ? 'दवाइयां' : 'Medicines' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveFilter(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-full border mr-2 ${
                activeFilter === cat.id
                  ? 'bg-[#087F8C] border-[#087F8C]'
                  : 'bg-white border-[#E1EBE8]'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeFilter === cat.id ? 'text-white' : 'text-[#617581]'
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        {query.length === 0 ? (
          <>
            {/* Recent Searches */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-black text-[#182F3B] uppercase tracking-wider">
                  {language === 'hi' ? 'हाल की खोजें' : 'Recent Searches'}
                </Text>
              </View>
              {RECENT_SEARCHES.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setQuery(item)}
                  className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
                >
                  <View className="flex-row items-center space-x-2.5">
                    <Clock size={15} color="#94A3B8" />
                    <Text className="text-xs font-semibold text-[#182F3B]">{item}</Text>
                  </View>
                  <ChevronRight size={14} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Trending Tags */}
            <View className="mb-5">
              <View className="flex-row items-center space-x-1.5 mb-2.5">
                <TrendingUp size={15} color="#087F8C" />
                <Text className="text-xs font-black text-[#182F3B] uppercase tracking-wider">
                  {language === 'hi' ? 'ट्रेंडिंग सर्च' : 'Trending Searches'}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {TRENDING_TAGS.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setQuery(tag)}
                    className="bg-white px-3 py-1.5 rounded-full border border-[#E1EBE8] shadow-2xs"
                  >
                    <Text className="text-xs font-bold text-[#087F8C]">{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* Live Search Results */
          <View className="mb-6">
            <Text className="text-xs font-black text-[#617581] uppercase tracking-wider mb-2">
              {language === 'hi' ? `परिणाम (${filteredResults.length})` : `Results (${filteredResults.length})`}
            </Text>
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(item.route as any)}
                  className="bg-white p-3.5 rounded-2xl border border-[#E1EBE8] mb-2.5 flex-row items-center justify-between shadow-2xs"
                >
                  <View className="flex-row items-center space-x-3 flex-1 pr-2">
                    <View className="w-9 h-9 rounded-xl bg-[#F0FAF7] items-center justify-center">
                      {getIcon(item.type)}
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-[#182F3B]">{item.title}</Text>
                      <Text className="text-[11px] text-[#617581] mt-0.5">{item.subtitle}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))
            ) : (
              <View className="py-12 items-center justify-center">
                <Search size={36} color="#CBD5E1" />
                <Text className="text-sm font-bold text-[#182F3B] mt-3">
                  {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No matching results found'}
                </Text>
                <Text className="text-xs text-[#617581] mt-1 text-center">
                  {language === 'hi' ? 'कृपया अलग शब्द या वर्तनी से खोजें' : 'Try searching for general terms like OPD, Apollo, or Blood Test'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
