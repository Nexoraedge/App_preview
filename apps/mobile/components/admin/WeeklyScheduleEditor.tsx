import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Plus, X, Copy, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TimeSlot {
  start: string; // HH:mm (24h, e.g. "09:00")
  end: string;   // HH:mm (24h, e.g. "13:00")
}

export interface DaySchedule {
  open: boolean;
  slots: TimeSlot[];
}

export type WeeklySchedule = Record<DayKey, DaySchedule>;

const THEME = {
  creamBg: '#FAF8F2',
  creamSoft: '#F3EFE4',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  redText: '#B91C1C',
  redBg: '#FEF2F2',
};

export const DAY_ORDER: { key: DayKey; short: string; full: string }[] = [
  { key: 'mon', short: 'Mon', full: 'Monday' },
  { key: 'tue', short: 'Tue', full: 'Tuesday' },
  { key: 'wed', short: 'Wed', full: 'Wednesday' },
  { key: 'thu', short: 'Thu', full: 'Thursday' },
  { key: 'fri', short: 'Fri', full: 'Friday' },
  { key: 'sat', short: 'Sat', full: 'Saturday' },
  { key: 'sun', short: 'Sun', full: 'Sunday' },
];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: { open: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
  tue: { open: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
  wed: { open: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
  thu: { open: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
  fri: { open: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '20:00' }] },
  sat: { open: true, slots: [{ start: '09:00', end: '14:00' }] },
  sun: { open: false, slots: [] },
};

function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatTime12h(hhmm: string): string {
  const mins = parseMinutes(hhmm);
  if (mins === null) return hhmm || '—';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatSlotsLine(day: DaySchedule): string {
  if (!day.open || !day.slots || day.slots.length === 0) return 'Closed';
  return day.slots.map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`).join(', ');
}

export function getTodayDayKey(date = new Date()): DayKey {
  const idx = date.getDay(); // 0=Sun, 1=Mon, ...
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[idx];
}

export function getLiveOpenStatus(
  schedule?: WeeklySchedule | null,
  is24x7 = false
): { isOpen: boolean; label: string; detail: string } {
  const sched = schedule || DEFAULT_WEEKLY_SCHEDULE;
  const now = new Date();
  const todayKey = getTodayDayKey(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todaySched = sched[todayKey];

  if (todaySched?.open && todaySched.slots?.length > 0) {
    for (const slot of todaySched.slots) {
      const start = parseMinutes(slot.start);
      const end = parseMinutes(slot.end);
      if (start !== null && end !== null && nowMins >= start && nowMins < end) {
        return {
          isOpen: true,
          label: is24x7 ? 'OPD Open Now' : 'Open Now',
          detail: `Closes ${formatTime12h(slot.end)}`,
        };
      }
    }

    // Check if there is a later slot today
    const nextToday = todaySched.slots
      .map((s) => ({ start: parseMinutes(s.start), raw: s.start }))
      .filter((s) => s.start !== null && s.start > nowMins)
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0];

    if (nextToday) {
      return {
        isOpen: is24x7,
        label: is24x7 ? '24x7 Emergency · OPD Break' : 'Closed Now',
        detail: `OPD opens ${formatTime12h(nextToday.raw)}`,
      };
    }
  }

  // Find next open day
  const startIndex = DAY_ORDER.findIndex((d) => d.key === todayKey);
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = DAY_ORDER[(startIndex + offset) % 7];
    const nextSched = sched[nextDay.key];
    if (nextSched?.open && nextSched.slots?.length > 0) {
      return {
        isOpen: is24x7,
        label: is24x7 ? '24x7 Emergency · OPD Closed' : 'Closed Now',
        detail: `Opens ${nextDay.short} ${formatTime12h(nextSched.slots[0].start)}`,
      };
    }
  }

  return {
    isOpen: is24x7,
    label: is24x7 ? '24x7 Open' : 'Closed',
    detail: 'No OPD hours set',
  };
}

export function summarizeWeeklySchedule(schedule?: WeeklySchedule | null): string {
  const sched = schedule || DEFAULT_WEEKLY_SCHEDULE;
  const todayKey = getTodayDayKey();
  const todayText = formatSlotsLine(sched[todayKey]);
  return `Today: ${todayText}`;
}

export function WeeklyScheduleDisplay({
  schedule,
  is24x7 = false,
  fallbackText,
}: {
  schedule?: WeeklySchedule | null;
  is24x7?: boolean;
  fallbackText?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const sched = schedule || DEFAULT_WEEKLY_SCHEDULE;
  const todayKey = getTodayDayKey();
  const live = getLiveOpenStatus(sched, is24x7);

  return (
    <View style={{ gap: 6 }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: THEME.creamBg,
          borderWidth: 1,
          borderColor: THEME.border,
          borderRadius: 9,
          paddingHorizontal: 11,
          paddingVertical: 8,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, flexWrap: 'wrap' }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: live.isOpen ? THEME.greenPrimary : THEME.redText,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: live.isOpen ? THEME.greenPrimary : THEME.redText,
            }}
          >
            {live.label}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted }}>
            · {live.detail}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>
            {expanded ? 'Hide Hours' : 'All 7 Days'}
          </Text>
          {expanded ? (
            <ChevronUp size={13} color={THEME.greenPrimary} />
          ) : (
            <ChevronDown size={13} color={THEME.greenPrimary} />
          )}
        </View>
      </TouchableOpacity>

      {!schedule && fallbackText ? (
        <Text style={{ fontSize: 11, color: THEME.muted }}>
          Default schedule shown ({fallbackText})
        </Text>
      ) : null}

      {expanded && (
        <View
          style={{
            backgroundColor: THEME.creamBg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 10,
            padding: 10,
            gap: 6,
          }}
        >
          {DAY_ORDER.map((day) => {
            const isToday = day.key === todayKey;
            const dayData = sched[day.key] || { open: false, slots: [] };
            return (
              <View
                key={day.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  borderRadius: 6,
                  backgroundColor: isToday ? THEME.greenSoft : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? '800' : '600',
                    color: isToday ? THEME.greenPrimary : THEME.ink,
                    width: 92,
                  }}
                >
                  {day.full}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: isToday ? '700' : '500',
                    color: dayData.open ? THEME.ink : THEME.muted,
                  }}
                >
                  {formatSlotsLine(dayData)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function WeeklyScheduleEditor({
  value,
  onChange,
  title = 'Weekly OPD Hours (Google-style)',
}: {
  value: WeeklySchedule;
  onChange: (next: WeeklySchedule) => void;
  title?: string;
}) {
  const toggleDayOpen = (dayKey: DayKey) => {
    const cur = value[dayKey];
    onChange({
      ...value,
      [dayKey]: {
        open: !cur.open,
        slots: !cur.open && cur.slots.length === 0 ? [{ start: '09:00', end: '13:00' }] : cur.slots,
      },
    });
  };

  const updateSlot = (dayKey: DayKey, idx: number, field: 'start' | 'end', val: string) => {
    const cur = value[dayKey];
    const nextSlots = cur.slots.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    onChange({ ...value, [dayKey]: { ...cur, slots: nextSlots } });
  };

  const addSlot = (dayKey: DayKey) => {
    const cur = value[dayKey];
    onChange({
      ...value,
      [dayKey]: {
        open: true,
        slots: [...cur.slots, { start: '16:00', end: '20:00' }],
      },
    });
  };

  const removeSlot = (dayKey: DayKey, idx: number) => {
    const cur = value[dayKey];
    const nextSlots = cur.slots.filter((_, i) => i !== idx);
    onChange({
      ...value,
      [dayKey]: {
        open: nextSlots.length > 0,
        slots: nextSlots,
      },
    });
  };

  const copyMonToWeekdays = (includeSat: boolean) => {
    const mon = value.mon;
    const cloneSlots = () => mon.slots.map((s) => ({ ...s }));
    const next: WeeklySchedule = {
      ...value,
      tue: { open: mon.open, slots: cloneSlots() },
      wed: { open: mon.open, slots: cloneSlots() },
      thu: { open: mon.open, slots: cloneSlots() },
      fri: { open: mon.open, slots: cloneSlots() },
      ...(includeSat ? { sat: { open: mon.open, slots: cloneSlots() } } : {}),
    };
    onChange(next);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color={THEME.greenPrimary} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>{title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => copyMonToWeekdays(true)}
          style={{
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Copy size={11} color={THEME.greenPrimary} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>
            Copy Mon → Tue–Sat
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 11, color: THEME.muted }}>
        Use 24h format (e.g. 09:00 to 13:00, 14:00 to 16:00, 16:00 to 20:00)
      </Text>

      <View style={{ gap: 8 }}>
        {DAY_ORDER.map((day) => {
          const dayData = value[day.key] || { open: false, slots: [] };
          return (
            <View
              key={day.key}
              style={{
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 10,
                padding: 10,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink, width: 38 }}>
                    {day.short}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleDayOpen(day.key)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: dayData.open ? THEME.greenSoft : THEME.surface,
                      borderWidth: 1,
                      borderColor: dayData.open ? THEME.greenPrimary : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: dayData.open ? THEME.greenPrimary : THEME.muted,
                      }}
                    >
                      {dayData.open ? 'Open' : 'Closed'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {dayData.open && (
                  <TouchableOpacity
                    onPress={() => addSlot(day.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: THEME.surface,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Plus size={11} color={THEME.greenPrimary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>
                      Add Shift
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {dayData.open && dayData.slots.length > 0 && (
                <View style={{ gap: 6 }}>
                  {dayData.slots.map((slot, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        value={slot.start}
                        onChangeText={(v) => updateSlot(day.key, idx, 'start', v)}
                        placeholder="09:00"
                        style={{
                          width: 76,
                          backgroundColor: THEME.surface,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 7,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          fontSize: 12.5,
                          fontWeight: '600',
                          color: THEME.ink,
                          textAlign: 'center',
                        }}
                      />
                      <Text style={{ fontSize: 12, color: THEME.muted }}>to</Text>
                      <TextInput
                        value={slot.end}
                        onChangeText={(v) => updateSlot(day.key, idx, 'end', v)}
                        placeholder="13:00"
                        style={{
                          width: 76,
                          backgroundColor: THEME.surface,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 7,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          fontSize: 12.5,
                          fontWeight: '600',
                          color: THEME.ink,
                          textAlign: 'center',
                        }}
                      />
                      <Text style={{ fontSize: 11, color: THEME.muted, flex: 1 }}>
                        ({formatTime12h(slot.start)} – {formatTime12h(slot.end)})
                      </Text>
                      {dayData.slots.length > 1 && (
                        <TouchableOpacity onPress={() => removeSlot(day.key, idx)}>
                          <X size={14} color={THEME.redText} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
