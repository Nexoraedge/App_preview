// app/family.tsx
// Family members management stack screen. Reached from Profile and the "Ordering for" chip.
// Statutory consent is required before saving someone else's details. No invasive data (Aadhaar, religion, caste) is collected.
// Fully localized (English & Hindi) with zero haptics, responsive layout, and smooth SheetFrame modal.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  ShieldCheck,
  User,
} from 'lucide-react-native';

import { C, R, SHADOW } from '../src/theme';
import { PressableCard } from '../components/ui/PressableCard';
import { Chip, PrimaryButton, SheetFrame, tap } from '../components/ui/kit';
import {
  useFamily,
  getRelationLabel,
  getGenderLabel,
  type Relation,
  type Gender,
  type Member,
} from '../src/context/FamilyContext';
import { useLanguage } from '../src/context/LanguageContext';

const RELATIONS: Relation[] = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'];
const GENDERS: Gender[] = ['Female', 'Male', 'Other'];

const AVATARS = [
  { bg: '#EAF1FF', fg: '#1D4ED8' },
  { bg: '#E7F8F0', fg: '#047857' },
  { bg: '#FFF4E0', fg: '#B45309' },
  { bg: '#F1EBFF', fg: '#7C3AED' },
  { bg: '#FDEBF4', fg: '#DB2777' },
];

const wrap = {
  width: '100%' as const,
  maxWidth: 560,
  alignSelf: 'center' as const,
  paddingHorizontal: 16,
};

const initials = (n: string) =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

function PickChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        height: 40,
        paddingHorizontal: 16,
        borderRadius: R.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? C.brandSoft : '#FFFFFF',
        borderWidth: 1,
        borderColor: active ? C.brand : C.line,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? '700' : '500',
          color: active ? C.brand : C.sub,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = {
  height: 50,
  borderRadius: R.md,
  borderWidth: 1,
  borderColor: C.line,
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 14,
  fontSize: 15,
  color: C.ink,
} as const;

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const { members, activeId, setActive, add, update, remove } = useFamily();

  const [sheet, setSheet] = useState<{ id: string | null } | null>(null); // id null = adding
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation>('Spouse');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);

  const editing = sheet?.id ? members.find((m) => m.id === sheet.id) : undefined;
  const isSelf = editing?.relation === 'Self';
  const ageNum = parseInt(age, 10);
  const minor = !isNaN(ageNum) && ageNum < 18;

  const openAdd = () => {
    setName('');
    setRelation('Spouse');
    setAge('');
    setGender(undefined);
    setPhone('');
    setConsent(false);
    setSheet({ id: null });
  };

  const openEdit = (m: Member) => {
    setName(m.name === 'You' ? '' : m.name);
    setRelation(m.relation);
    setAge(String(m.age));
    setGender(m.gender);
    setPhone(m.phone ?? '');
    setConsent(!!m.consentAt || m.relation === 'Self');
    setSheet({ id: m.id });
  };

  const phoneOk = phone.length === 0 || /^\d{10}$/.test(phone);
  const valid =
    name.trim().length >= 2 &&
    !isNaN(ageNum) &&
    ageNum >= 0 &&
    ageNum <= 120 &&
    phoneOk &&
    (isSelf || consent);

  const save = () => {
    if (!valid) return;
    const base = {
      name: name.trim(),
      relation,
      age: ageNum,
      gender,
      phone: phone || undefined,
    };

    if (editing) {
      update(editing.id, {
        ...base,
        consentAt: editing.consentAt ?? (isSelf ? undefined : new Date().toISOString()),
      });
    } else {
      const id = add({
        ...base,
        consentAt: new Date().toISOString(),
      });
      setActive(id);
    }
    setSheet(null);
  };

  const confirmRemove = (m: Member) => {
    const memberDisplayName = isHi && m.nameHi ? m.nameHi : m.name;
    Alert.alert(
      isHi ? 'परिवार से हटाएं?' : 'Remove from family?',
      isHi
        ? `${memberDisplayName} को आपकी परिवार सूची से हटा दिया जाएगा।`
        : `${m.name} will be removed from your family list.`,
      [
        { text: isHi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHi ? 'हटाएं' : 'Remove',
          style: 'destructive',
          onPress: () => remove(m.id),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[wrap, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          {/* Back Navigation Button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: -4,
              marginBottom: 10,
              alignSelf: 'flex-start',
            }}
          >
            <ChevronLeft size={22} color={C.brand} />
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.brand }}>
              {isHi ? 'वापस' : 'Back'}
            </Text>
          </Pressable>

          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: C.ink,
              letterSpacing: -0.4,
            }}
          >
            {isHi ? 'परिवार के सदस्य' : 'Family'}
          </Text>
          <Text
            style={{
              fontSize: 13.5,
              color: C.sub,
              marginTop: 4,
              lineHeight: 19,
            }}
          >
            {isHi
              ? 'जिनके लिए आप सेवाएं बुक करते हैं, उन्हें यहां जोड़ें। बुकिंग करने हेतु किसी सदस्य पर टैप करें।'
              : 'Add the people you book for. Tap a person to make bookings for them.'}
          </Text>

          {/* Members List */}
          <View style={{ gap: 12, marginTop: 18 }}>
            {members.map((m, i) => {
              const sel = m.id === activeId;
              const av = AVATARS[i % AVATARS.length];
              const memberDisplayName = isHi && m.nameHi ? m.nameHi : m.name;
              const relationLabel =
                m.relation === 'Self'
                  ? (isHi ? 'अकाउंट धारक (स्वयं)' : 'Account holder')
                  : getRelationLabel(m.relation, isHi);

              return (
                <PressableCard
                  key={m.id}
                  index={i}
                  onPress={() => setActive(m.id)}
                  label={memberDisplayName}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: sel ? C.brandSoft : '#FFFFFF',
                      borderRadius: R.xl,
                      padding: 14,
                      borderWidth: sel ? 2 : 1,
                      borderColor: sel ? C.brand : C.line,
                      ...SHADOW,
                    }}
                  >
                    {/* Member Initials Avatar */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: av.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: '800', color: av.fg }}>
                        {initials(m.name)}
                      </Text>
                    </View>

                    {/* Member Information */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}>
                        {m.relation === 'Self'
                          ? (isHi ? 'स्वयं (You)' : 'You')
                          : memberDisplayName}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                        {relationLabel} · {m.age} {isHi ? 'वर्ष' : 'yrs'}
                        {m.gender ? ` · ${getGenderLabel(m.gender, isHi)}` : ''}
                      </Text>

                      {sel && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                          <Chip
                            label={isHi ? 'बुकिंग हेतु चयनित' : 'Booking for'}
                            tone="brand"
                            icon={<Check size={11} color={C.brand} strokeWidth={3} />}
                          />
                        </View>
                      )}
                    </View>

                    {/* Actions: Edit & Remove */}
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable
                        onPress={() => openEdit(m)}
                        hitSlop={8}
                        accessibilityLabel={
                          isHi ? `${memberDisplayName} का विवरण बदलें` : `Edit ${m.name}`
                        }
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F1F5F9',
                        }}
                      >
                        <Pencil size={16} color={C.sub} />
                      </Pressable>

                      {m.relation !== 'Self' && (
                        <Pressable
                          onPress={() => confirmRemove(m)}
                          hitSlop={8}
                          accessibilityLabel={
                            isHi ? `${memberDisplayName} को हटाएं` : `Remove ${m.name}`
                          }
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FEE2E2',
                          }}
                        >
                          <Trash2 size={16} color={C.danger} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </PressableCard>
              );
            })}
          </View>

          {/* Privacy & Legal Notice */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              backgroundColor: C.goodSoft,
              borderRadius: R.lg,
              padding: 13,
              marginTop: 20,
              borderWidth: 1,
              borderColor: '#D1FAE5',
              alignItems: 'center',
            }}
          >
            <ShieldCheck size={22} color={C.good} />
            <Text style={{ flex: 1, fontSize: 12, color: C.sub, lineHeight: 18 }}>
              {isHi
                ? 'विवरण का उपयोग केवल डॉक्टर अपॉइंटमेंट और दवा बुकिंग के लिए किया जाता है। किसी व्यक्ति को केवल उनकी अनुमति से या उनके माता-पिता/अभिभावक के रूप में जोड़ें। आप उन्हें किसी भी समय हटा सकते हैं।'
                : 'Details are used only to make bookings. Add someone only with their permission, or as their parent or guardian. You can remove them any time.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Add Member CTA */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(246, 248, 252, 0.98)',
          borderTopWidth: 1,
          borderTopColor: C.line,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        }}
      >
        <View style={wrap}>
          <Pressable
            onPress={() => {
              tap();
              openAdd();
            }}
            style={{
              height: 52,
              borderRadius: R.lg,
              backgroundColor: C.brand,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#1E40AF',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <Plus size={19} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFFFFF', fontSize: 15.5, fontWeight: '700' }}>
              {isHi ? 'परिवार का नया सदस्य जोड़ें' : 'Add family member'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Add / Edit Member Sheet Modal */}
      <SheetFrame
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={
          editing
            ? (isHi ? 'विवरण में बदलाव करें' : 'Edit details')
            : (isHi ? 'परिवार का नया सदस्य जोड़ें' : 'Add family member')
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 20) + 32,
          }}
        >
          {/* Full Name */}
          <Field label={isHi ? 'पूरा नाम' : 'Full name'}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isHi ? 'पहचान पत्र के अनुसार (जैसे आधार / वोटर ID)' : 'As on official ID'}
              placeholderTextColor={C.mute}
              style={inputStyle}
              autoCapitalize="words"
            />
          </Field>

          {/* Relation Selection (hidden for Self) */}
          {!isSelf && (
            <Field label={isHi ? 'संबंध' : 'Relation'}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {RELATIONS.map((r) => (
                  <PickChip
                    key={r}
                    label={getRelationLabel(r, isHi)}
                    active={relation === r}
                    onPress={() => setRelation(r)}
                  />
                ))}
              </View>
            </Field>
          )}

          {/* Age */}
          <Field label={isHi ? 'उम्र (वर्ष)' : 'Age (in years)'}>
            <TextInput
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder={isHi ? 'वर्ष में उम्र (जैसे 34)' : 'Years (e.g. 34)'}
              placeholderTextColor={C.mute}
              keyboardType="number-pad"
              style={inputStyle}
            />
          </Field>

          {/* Gender */}
          <Field label={isHi ? 'लिंग (वैकल्पिक)' : 'Gender (optional)'}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GENDERS.map((g) => (
                <PickChip
                  key={g}
                  label={getGenderLabel(g, isHi)}
                  active={gender === g}
                  onPress={() => setGender(gender === g ? undefined : g)}
                />
              ))}
            </View>
          </Field>

          {/* Mobile Phone */}
          <Field label={isHi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile number (optional)'}>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder={isHi ? '10 अंकों का मोबाइल नंबर' : '10 digits mobile number'}
              placeholderTextColor={C.mute}
              keyboardType="number-pad"
              style={inputStyle}
            />
            {!phoneOk && (
              <Text style={{ fontSize: 12, color: C.danger, marginTop: 5 }}>
                {isHi
                  ? '10 अंकों का वैध मोबाइल नंबर दर्ज करें, या इसे खाली छोड़ दें।'
                  : 'Enter a valid 10-digit number, or leave it empty.'}
              </Text>
            )}
          </Field>

          {/* Statutory Consent Checkbox */}
          {!isSelf && (
            <Pressable
              onPress={() => {
                tap();
                setConsent((c) => !c);
              }}
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                marginTop: 18,
                backgroundColor: C.brandSoft,
                borderRadius: R.md,
                padding: 13,
                borderWidth: 1,
                borderColor: '#DBEAFE',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: consent ? C.brand : '#FFFFFF',
                  borderWidth: consent ? 0 : 2,
                  borderColor: C.line,
                  marginTop: 1,
                }}
              >
                {consent && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: C.ink, lineHeight: 18 }}>
                {minor
                  ? (isHi
                      ? 'मैं इस बच्चे का माता-पिता या कानूनी अभिभावक हूँ और बुकिंग के लिए उनका विवरण जोड़ने की सहमति देता हूँ।'
                      : 'I am this child’s parent or legal guardian and I agree to add their details for bookings.')
                  : (isHi
                      ? 'मेरे पास बुकिंग के लिए उनका विवरण जोड़ने की इस व्यक्ति की स्पष्ट अनुमति है।'
                      : 'I have this person’s permission to add their details for bookings.')}
              </Text>
            </Pressable>
          )}

          {/* Save / Submit Button */}
          <View style={{ marginTop: 22, marginBottom: 8 }}>
            <PrimaryButton
              label={
                editing
                  ? (isHi ? 'परिवर्तन सहेजें' : 'Save changes')
                  : (isHi ? 'परिवार में जोड़ें' : 'Add to family')
              }
              disabled={!valid}
              onPress={save}
            />
          </View>
        </ScrollView>
      </SheetFrame>
    </View>
  );
}
