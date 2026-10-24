// apps/mobile/components/pharmacy/OrderTrackingTimeline.tsx
// Vertical 5-step order timeline progression for pharmacy requests

import React from 'react';
import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { RequestStatus, STATUS_ORDER } from '../../src/data/pharmacySample';
import { Mode } from '../../src/data/pharmacyData';
import { C } from '../../src/theme';

interface OrderTrackingTimelineProps {
  status: RequestStatus;
  mode: Mode;
  isHi: boolean;
}

export function OrderTrackingTimeline({
  status,
  mode,
  isHi,
}: OrderTrackingTimelineProps) {
  const idx = STATUS_ORDER.indexOf(status);

  const steps = [
    {
      title: isHi ? 'पर्चा भेज दिया गया' : 'Prescription sent',
      sub: isHi
        ? 'फार्मेसी को पर्चा प्राप्त हो गया है'
        : 'The pharmacy has received it',
    },
    {
      title: isHi ? 'फार्मासिस्ट जांच कर रहे हैं' : 'Pharmacist is checking',
      sub: isHi
        ? 'दवाओं और स्टॉक का मिलान किया जा रहा है'
        : 'They match your medicines and stock',
    },
    {
      title: isHi ? 'बिल तैयार है' : 'Bill ready',
      sub: isHi
        ? 'बिल की समीक्षा करें और भुगतान करें'
        : 'Review the bill and pay',
    },
    {
      title: isHi ? 'भुगतान संपन्न' : 'Payment done',
      sub: isHi
        ? 'आपकी इन-ऐप छूट लागू हो गई है'
        : 'Your in-app discount is applied',
    },
    {
      title:
        mode === 'delivery'
          ? isHi
            ? 'दवाएं रास्ते में हैं'
            : 'On its way'
          : isHi
          ? 'पिकअप के लिए तैयार'
          : 'Ready for pickup',
      sub:
        mode === 'delivery'
          ? isHi
            ? 'फार्मेसी द्वारा होम डिलीवरी'
            : 'Delivered by the pharmacy'
          : isHi
          ? 'काउंटर पर अपना कोड दिखाएं'
          : 'Show your code at the counter',
    },
  ];

  return (
    <View>
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const last = i === steps.length - 1;

        return (
          <View key={s.title} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 28 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done
                    ? C.good
                    : current
                    ? C.brand
                    : '#FFFFFF',
                  borderWidth: done || current ? 0 : 2,
                  borderColor: C.line,
                }}
              >
                {done ? (
                  <Check size={15} color="#FFFFFF" strokeWidth={3} />
                ) : current ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                ) : null}
              </View>
              {!last && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 22,
                    backgroundColor: done ? C.good : C.line,
                    marginVertical: 2,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: current ? '700' : '600',
                  color: i > idx ? C.mute : C.ink,
                }}
              >
                {s.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: i > idx ? C.mute : C.sub,
                  marginTop: 1,
                }}
              >
                {s.sub}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
