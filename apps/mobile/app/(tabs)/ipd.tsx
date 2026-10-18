import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import {
  Bed,
  ShieldCheck,
  PhoneCall,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Building2,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import { IpdHospitalBedIcon } from '../../components/ServiceIcons';

interface HospitalAdmission {
  id: string;
  name: string;
  location: string;
  distance: string;
  image: string;
  icuAvailable: number;
  privateRooms: number;
  cashlessDiscount: string;
  rating: number;
  tpaInsurance: string[];
}

const PARTNER_HOSPITALS: HospitalAdmission[] = [
  {
    id: 'hosp-1',
    name: 'Max Super Speciality Hospital',
    location: 'Saket, New Delhi',
    distance: '1.4 km',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=400&q=80',
    icuAvailable: 4,
    privateRooms: 9,
    cashlessDiscount: 'Flat 20% on Room Rent',
    rating: 4.9,
    tpaInsurance: ['Star Health', 'HDFC ERGO', 'Care', 'ICICI Lombard', 'Niva Bupa'],
  },
  {
    id: 'hosp-2',
    name: 'Indraprastha Apollo Hospitals',
    location: 'Sarita Vihar, New Delhi',
    distance: '8.1 km',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80',
    icuAvailable: 2,
    privateRooms: 14,
    cashlessDiscount: 'Zero Security Deposit',
    rating: 4.8,
    tpaInsurance: ['All Major TPAs', 'Star Health', 'Medi Assist', 'Paramount'],
  },
  {
    id: 'hosp-3',
    name: 'Fortis Escorts Heart Institute',
    location: 'Okhla Road, New Delhi',
    distance: '6.5 km',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=400&q=80',
    icuAvailable: 6,
    privateRooms: 11,
    cashlessDiscount: 'Cashless Pre-Auth in 30 Mins',
    rating: 4.8,
    tpaInsurance: ['Star Health', 'Vidal Health', 'Raksha TPA', 'FHPL'],
  },
];

export default function IpdScreen() {
  const { language } = useLanguage();
  const [selectedHospital, setSelectedHospital] = useState<HospitalAdmission | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [patientName, setPatientName] = useState('Hardik Sharma');
  const [roomType, setRoomType] = useState<'icu' | 'deluxe' | 'semi'>('deluxe');
  const [isBooked, setIsBooked] = useState(false);

  const handleBookAdmission = () => {
    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      setModalVisible(false);
      Alert.alert(
        language === 'hi' ? 'भर्ती अनुरोध स्वीकृत' : 'Admission Request Sent',
        language === 'hi'
          ? 'निरामया: केयर मैनेजर आपको 5 मिनट में कॉल करके बेड सुरक्षित करेंगे।'
          : 'Your Niramayaa Care Manager will contact you within 5 minutes to confirm bed allocation and process cashless clearance.'
      );
    }, 1200);
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F7FBFA]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Top Header */}
      <View className="pt-14 px-5 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-[#182F3B]">
              {language === 'hi' ? 'आईपीडी भर्ती सहायता' : 'IPD Admissions'}
            </Text>
            <Text className="text-xs text-[#617581] mt-0.5">
              {language === 'hi'
                ? 'कैशलेस अस्पताल भर्ती • 0% अग्रिम भुगतान'
                : 'Zero-Advance Hospital Admission & Cashless Desk'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:1800123456')}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-[#FFF1F0] border border-[#FADEDC] items-center justify-center shadow-xs"
          >
            <PhoneCall size={18} color="#E87869" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Call Banner */}
      <View className="px-4 mt-3">
        <View className="bg-[#FEF5F4] p-4 rounded-3xl border border-[#F9DCDB] flex-row items-center justify-between shadow-xs">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center space-x-1.5 mb-1">
              <View className="w-2 h-2 rounded-full bg-[#E87869]" />
              <Text className="text-[11px] font-black text-[#E87869] uppercase tracking-wider">
                {language === 'hi' ? '24x7 आपातकालीन भर्ती' : '24x7 Admission Helpline'}
              </Text>
            </View>
            <Text className="text-sm font-black text-[#182F3B] leading-tight">
              {language === 'hi' ? 'तत्काल बेड या आईसीयू की आवश्यकता है?' : 'Need Urgent Bed or ICU Admission?'}
            </Text>
            <Text className="text-[11px] text-[#617581] mt-0.5">
              {language === 'hi' ? 'बिना रुकावट तुरंत सहायता पाएं' : 'Call our dedicated hospital care coordinators'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:1800123456')}
            className="bg-[#E87869] px-4 py-2.5 rounded-2xl flex-row items-center space-x-1.5 shadow-sm"
          >
            <PhoneCall size={14} color="#FFFFFF" />
            <Text className="text-xs font-black text-white">
              {language === 'hi' ? 'कॉल करें' : 'Call Desk'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3 Pillars of IPD Protection */}
      <View className="px-4 mt-4">
        <View className="bg-white rounded-3xl p-4 border border-[#E1EBE8] shadow-xs">
          <Text className="text-xs font-black text-[#182F3B] uppercase tracking-wider mb-3">
            {language === 'hi' ? 'निरामया: आईपीडी सुरक्षा गारंटी' : 'Niramayaa IPD Guarantees'}
          </Text>
          <View className="space-y-2.5">
            <View className="flex-row items-start space-x-2.5">
              <CheckCircle2 size={16} color="#087F8C" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#182F3B]">
                  {language === 'hi' ? '30 मिनट में कैशलेस प्री-ऑथ' : '30-Minute Cashless TPA Pre-Auth'}
                </Text>
                <Text className="text-[10px] text-[#617581]">
                  {language === 'hi' ? 'लंबी कतारों से मुक्ति, त्वरित बीमा निपटान' : 'Zero wait time at TPA desks with priority clearance'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start space-x-2.5">
              <CheckCircle2 size={16} color="#087F8C" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#182F3B]">
                  {language === 'hi' ? 'कमरे के किराए पर 20% तक छूट' : 'Up to 20% Discount on Room Rent'}
                </Text>
                <Text className="text-[10px] text-[#617581]">
                  {language === 'hi' ? 'पार्टनर अस्पतालों में सीधे बिलिंग पर छूट' : 'Direct savings on private, semi-private and ICU rooms'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start space-x-2.5">
              <CheckCircle2 size={16} color="#087F8C" className="mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#182F3B]">
                  {language === 'hi' ? 'अस्पताल में समर्पित केयर बडी' : 'Dedicated On-Ground Hospital Buddy'}
                </Text>
                <Text className="text-[10px] text-[#617581]">
                  {language === 'hi' ? 'भर्ती से डिस्चार्ज तक हर कदम पर सहायता' : 'Personal assistance for paperwork, beds and discharge'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Available Partner Hospitals */}
      <View className="px-4 mt-5">
        <Text className="text-base font-black text-[#182F3B] mb-3">
          {language === 'hi' ? 'लाइव बेड उपलब्धता वाले अस्पताल' : 'Partner Hospitals with Live Beds'}
        </Text>

        {PARTNER_HOSPITALS.map((hospital) => (
          <View
            key={hospital.id}
            className="bg-white rounded-3xl p-4 border border-[#E1EBE8] mb-3.5 shadow-xs"
          >
            <View className="flex-row space-x-3">
              <Image
                source={{ uri: hospital.image }}
                className="w-20 h-20 rounded-2xl"
                resizeMode="cover"
              />
              <View className="flex-1 justify-between py-0.5">
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-extrabold text-[#087F8C]">
                      ★ {hospital.rating}
                    </Text>
                    <View className="bg-[#FFF9F0] px-2 py-0.5 rounded-full border border-[#FFE7C2]">
                      <Text className="text-[9px] font-black text-[#CF8A40]">
                        {hospital.cashlessDiscount}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-black text-[#182F3B] leading-tight mt-0.5">
                    {hospital.name}
                  </Text>
                  <View className="flex-row items-center space-x-1 mt-1">
                    <MapPin size={11} color="#617581" />
                    <Text className="text-[11px] text-[#617581] font-medium">
                      {hospital.location} • {hospital.distance}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bed Availability Badges */}
            <View className="flex-row items-center space-x-2 mt-3 pt-3 border-t border-[#F1F5F4]">
              <View className="flex-1 bg-[#F4FAF8] py-1.5 px-2 rounded-xl items-center border border-[#CFECE5]">
                <Text className="text-[10px] text-[#617581] font-medium">
                  {language === 'hi' ? 'आईसीयू बेड्स' : 'ICU Beds'}
                </Text>
                <Text className="text-xs font-black text-[#087F8C]">
                  {hospital.icuAvailable} {language === 'hi' ? 'उपलब्ध' : 'Available'}
                </Text>
              </View>
              <View className="flex-1 bg-[#EEF2FF] py-1.5 px-2 rounded-xl items-center border border-[#D6E0FA]">
                <Text className="text-[10px] text-[#617581] font-medium">
                  {language === 'hi' ? 'प्राइवेट रूम्स' : 'Private Rooms'}
                </Text>
                <Text className="text-xs font-black text-[#4F6BED]">
                  {hospital.privateRooms} {language === 'hi' ? 'उपलब्ध' : 'Available'}
                </Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={() => {
                setSelectedHospital(hospital);
                setModalVisible(true);
              }}
              className="mt-3 bg-[#087F8C] active:bg-[#066873] py-2.5 px-4 rounded-xl items-center justify-center flex-row space-x-1.5 shadow-xs"
            >
              <Bed size={15} color="#FFFFFF" />
              <Text className="text-xs font-black text-white">
                {language === 'hi' ? 'बेड बुक करें या पूछताछ करें' : 'Reserve Bed & Admission'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Booking Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-6 border-t border-[#E1EBE8]">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-black text-[#182F3B]">
                  {language === 'hi' ? 'बेड आरक्षण अनुरोध' : 'Reserve Hospital Bed'}
                </Text>
                <Text className="text-xs text-[#617581]">
                  {selectedHospital?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color="#617581" />
              </TouchableOpacity>
            </View>

            {/* Patient Name */}
            <Text className="text-xs font-bold text-[#182F3B] mb-1">
              {language === 'hi' ? 'मरीज का नाम' : 'Patient Name'}
            </Text>
            <TextInput
              value={patientName}
              onChangeText={setPatientName}
              className="bg-[#F7FBFA] border border-[#E1EBE8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#182F3B] mb-3"
            />

            {/* Room Preference */}
            <Text className="text-xs font-bold text-[#182F3B] mb-2">
              {language === 'hi' ? 'पसंदीदा कमरा' : 'Select Room Category'}
            </Text>
            <View className="flex-row space-x-2 mb-4">
              {[
                { id: 'deluxe', label: language === 'hi' ? 'डिलक्स रूम' : 'Deluxe Room' },
                { id: 'semi', label: language === 'hi' ? 'सेमी-प्राइवेट' : 'Semi-Private' },
                { id: 'icu', label: language === 'hi' ? 'आईसीयू (गंभीर)' : 'ICU' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setRoomType(item.id as any)}
                  className={`flex-1 py-2 rounded-xl items-center border ${
                    roomType === item.id
                      ? 'bg-[#087F8C] border-[#087F8C]'
                      : 'bg-white border-[#E1EBE8]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      roomType === item.id ? 'text-white' : 'text-[#617581]'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleBookAdmission}
              className="w-full bg-[#087F8C] py-3.5 rounded-2xl items-center justify-center shadow-sm"
            >
              <Text className="text-sm font-black text-white">
                {isBooked
                  ? language === 'hi' ? 'प्रक्रिया में...' : 'Processing Admission...'
                  : language === 'hi' ? 'पुष्टि करें (0% अग्रिम)' : 'Confirm Admission (Zero Advance)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
