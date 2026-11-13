// apps/mobile/components/ui/QuickAssistBar.tsx
// High-conversion 3-pill assistance bar (Call, Quick Order, WhatsApp)
// Matching production health platforms (1mg, Apollo 24/7, Pharmeasy)

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { PhoneCall, FileText, Phone } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

export interface QuickAssistBarProps {
  context?: 'labs' | 'home' | 'ipd';
  isHi?: boolean;
  onPressQuickOrder?: () => void;
  helplinePhone?: string;
  whatsappNumber?: string;
  style?: object;
}

// Crisp official WhatsApp SVG icon
function WhatsAppIcon({ size = 20, color = '#25D366' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L7.09 20.67C8.54 21.51 10.22 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
        fill={color}
      />
      <Path
        d="M17.47 14.38C17.17 14.23 15.71 13.51 15.44 13.41C15.17 13.31 14.97 13.26 14.77 13.56C14.57 13.86 14 14.56 13.82 14.76C13.64 14.96 13.47 14.98 13.17 14.83C12.87 14.68 11.91 14.37 10.77 13.35C9.88 12.56 9.28 11.58 9.11 11.28C8.93 10.98 9.09 10.82 9.24 10.67C9.37 10.54 9.53 10.33 9.68 10.16C9.83 9.99 9.88 9.86 9.98 9.66C10.08 9.46 10.03 9.28 9.96 9.13C9.88 8.98 9.28 7.51 9.03 6.91C8.79 6.32 8.54 6.4 8.36 6.39C8.19 6.38 7.99 6.38 7.79 6.38C7.59 6.38 7.27 6.45 6.99 6.75C6.72 7.05 5.94 7.78 5.94 9.26C5.94 10.74 7.02 12.17 7.17 12.37C7.32 12.57 9.29 15.61 12.31 16.91C13.03 17.22 13.59 17.41 14.03 17.55C14.76 17.78 15.42 17.75 15.94 17.67C16.53 17.58 17.74 16.94 17.99 16.24C18.24 15.54 18.24 14.94 18.17 14.81C18.09 14.68 17.77 14.53 17.47 14.38Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

export function QuickAssistBar({
  context = 'labs',
  isHi = false,
  onPressQuickOrder,
  helplinePhone = '+918271310911',
  whatsappNumber = '918271310911',
  style,
}: QuickAssistBarProps) {
  const handleCall = async () => {
    try {
      const url = `tel:${helplinePhone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          isHi ? 'हेल्पलाइन नंबर' : 'Helpline Number',
          isHi
            ? `कृपया इस नंबर पर कॉल करें: ${helplinePhone}`
            : `Please call our care team at: ${helplinePhone}`
        );
      }
    } catch {
      Alert.alert(
        isHi ? 'कॉल कनेक्ट नहीं हो सका' : 'Could not place call',
        `Care Desk: ${helplinePhone}`
      );
    }
  };

  const handleWhatsApp = async () => {
    let msg = '';
    if (context === 'labs') {
      msg = isHi
        ? 'नमस्ते आदित्यम टीम, मुझे जयपुर में लैब टेस्ट / हेल्थ चेकअप बुक करने में सहायता चाहिए।'
        : 'Hello Adityam Care, I need assistance booking diagnostic lab tests in Jaipur.';
    } else if (context === 'ipd') {
      msg = isHi
        ? 'नमस्ते आदित्यम टीम, मुझे जयपुर में अस्पताल भर्ती / सर्जरी एवं कैशलेस टीपीए में सहायता चाहिए।'
        : 'Hello Adityam Care, I need assistance with hospital admission and cashless TPA surgery in Jaipur.';
    } else {
      msg = isHi
        ? 'नमस्ते आदित्यम टीम, मुझे डॉक्टर परामर्श / स्वास्थ्य सेवा बुक करने में सहायता चाहिए।'
        : 'Hello Adityam Care, I would like to book a healthcare service / doctor consultation in Jaipur.';
    }

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('WhatsApp', `Please chat with our care desk at +${whatsappNumber}`);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* 1. Book via Phone Call */}
      <TouchableOpacity
        onPress={handleCall}
        activeOpacity={0.82}
        style={[styles.pill, styles.phonePill]}
      >
        <View style={styles.phoneIconWrap}>
          <PhoneCall size={15} color="#2563EB" />
        </View>
        <Text style={styles.pillText} numberOfLines={1}>
          {isHi ? 'कॉल पर ' : 'Book via '}
          <Text style={styles.boldText}>{isHi ? 'बुक करें' : 'Phone Call'}</Text>
        </Text>
      </TouchableOpacity>

      {/* 2. Quick Order / Prescription Advice */}
      <TouchableOpacity
        onPress={onPressQuickOrder}
        activeOpacity={0.82}
        style={[styles.pill, styles.orderPill]}
      >
        <View style={styles.orderIconWrap}>
          <FileText size={15} color="#BE185D" />
        </View>
        <Text style={styles.pillText} numberOfLines={1}>
          {isHi ? 'त्वरित ' : 'Quick '}
          <Text style={styles.boldText}>{isHi ? 'ऑर्डर' : 'Order'}</Text>
        </Text>
      </TouchableOpacity>

      {/* 3. Book via WhatsApp */}
      <TouchableOpacity
        onPress={handleWhatsApp}
        activeOpacity={0.82}
        style={[styles.pill, styles.whatsappPill]}
      >
        <View style={styles.whatsappIconWrap}>
          <WhatsAppIcon size={18} color="#16A34A" />
        </View>
        <Text style={styles.pillText} numberOfLines={1}>
          {isHi ? 'व्हाट्सएप ' : 'Book via '}
          <Text style={styles.boldText}>{isHi ? 'बुक करें' : 'Whatsapp'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    paddingVertical: 6,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 46,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  phonePill: {
    backgroundColor: '#F0F7FF',
    borderColor: '#DBEAFE',
  },
  phoneIconWrap: {
    marginRight: 6,
  },
  orderPill: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
  },
  orderIconWrap: {
    marginRight: 6,
  },
  whatsappPill: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  whatsappIconWrap: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 11.5,
    color: '#1E293B',
    fontWeight: '500',
  },
  boldText: {
    color: '#0F172A',
    fontWeight: '800',
  },
});

