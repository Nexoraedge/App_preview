import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Search, Plus, CheckCircle2 } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { SelectDropdown } from '../SelectDropdown';
import { THEME, LabItem, formatInr } from './labTheme';

interface MasterCatalogModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MasterCatalogModal({ visible, onClose }: MasterCatalogModalProps) {
  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'ALL' | 'lab' | 'scan' | 'package'>('ALL');

  const [editingItem, setEditingItem] = useState<LabItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSegment, setFormSegment] = useState<'lab' | 'scan' | 'package'>('lab');
  const [formCategory, setFormCategory] = useState('Pathology');
  const [formPrice, setFormPrice] = useState('500');
  const [formReportHrs, setFormReportHrs] = useState('12');
  const [formFastingHrs, setFormFastingHrs] = useState('');
  const [formPrep, setFormPrep] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('lab_items')
        .select('*')
        .order('popular', { ascending: false })
        .order('name');
      if (data) setItems(data as LabItem[]);
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) loadItems();
  }, [visible]);

  const startEdit = (item: LabItem) => {
    setEditingItem(item);
    setIsAdding(true);
    setFormName(item.name);
    setFormSegment(item.segment);
    setFormCategory(item.category);
    setFormPrice(String(item.base_price));
    setFormReportHrs(String(item.report_hrs));
    setFormFastingHrs(item.fasting_hrs ? String(item.fasting_hrs) : '');
    setFormPrep(item.prep || '');
  };

  const startNew = () => {
    setEditingItem(null);
    setIsAdding(true);
    setFormName('');
    setFormSegment('lab');
    setFormCategory('Pathology');
    setFormPrice('500');
    setFormReportHrs('12');
    setFormFastingHrs('');
    setFormPrep('');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Missing Name', 'Please enter test or scan name.');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const payload = {
        name: formName.trim(),
        name_hi: formName.trim(),
        segment: formSegment,
        category: formCategory.trim() || 'Diagnostics',
        base_price: Number(formPrice) || 500,
        report_hrs: Number(formReportHrs) || 12,
        fasting_hrs: formFastingHrs.trim() ? Number(formFastingHrs) : null,
        prep: formPrep.trim() || null,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase.from('lab_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const newId = `${formSegment}-${Date.now()}`;
        const { error } = await supabase.from('lab_items').insert({ id: newId, ...payload });
        if (error) throw error;
      }

      setIsAdding(false);
      setEditingItem(null);
      await loadItems();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save test.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (segment !== 'ALL' && item.segment !== segment) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [items, search, segment]);

  const inputStyle = {
    backgroundColor: THEME.creamBg,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 13,
    color: THEME.ink,
  } as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(20, 54, 43, 0.38)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 18,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: '88%',
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              backgroundColor: THEME.creamBg,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Master Tests, Scans & Packages Catalog
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                Manage base MRP, fasting hours & preparation notes across all centres
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Close</Text>
            </TouchableOpacity>
          </View>

          {isAdding ? (
            <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
              <SelectDropdown
                label="Segment"
                value={formSegment}
                options={[
                  { value: 'lab', label: 'Pathology / Blood Lab Test' },
                  { value: 'scan', label: 'Scan / Imaging (MRI, CT, X-Ray)' },
                  { value: 'package', label: 'Health Checkup Package' },
                ]}
                onChange={(v) => setFormSegment(v as 'lab' | 'scan' | 'package')}
              />

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Test / Scan Name *
                </Text>
                <TextInput value={formName} onChangeText={setFormName} placeholder="e.g. Lipid Profile" style={inputStyle} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Category
                  </Text>
                  <TextInput value={formCategory} onChangeText={setFormCategory} style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Base MRP (₹)
                  </Text>
                  <TextInput value={formPrice} onChangeText={setFormPrice} keyboardType="numeric" style={inputStyle} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Report Time (hrs)
                  </Text>
                  <TextInput value={formReportHrs} onChangeText={setFormReportHrs} keyboardType="numeric" style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Fasting Required (hrs)
                  </Text>
                  <TextInput
                    value={formFastingHrs}
                    onChangeText={setFormFastingHrs}
                    keyboardType="numeric"
                    placeholder="e.g. 10 (blank if none)"
                    style={inputStyle}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Preparation Instructions
                </Text>
                <TextInput
                  value={formPrep}
                  onChangeText={setFormPrep}
                  placeholder="e.g. 10-12 hours overnight fasting; water allowed"
                  style={inputStyle}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: THEME.creamSoft,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  onPress={handleSave}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: THEME.greenPrimary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add to Catalog'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 16, gap: 12, flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: THEME.creamBg,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 6,
                  }}
                >
                  <Search size={14} color={THEME.muted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search global tests & scans..."
                    style={{ flex: 1, paddingVertical: 8, fontSize: 12.5, color: THEME.ink }}
                  />
                </View>

                <TouchableOpacity
                  onPress={startNew}
                  style={{
                    backgroundColor: THEME.greenPrimary,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>New Item</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {(['ALL', 'lab', 'scan', 'package'] as const).map((seg) => {
                  const active = segment === seg;
                  return (
                    <TouchableOpacity
                      key={seg}
                      onPress={() => setSegment(seg)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 7,
                        backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                        borderWidth: 1,
                        borderColor: active ? THEME.greenPrimary : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? THEME.greenPrimary : THEME.muted }}>
                        {seg === 'ALL' ? 'All' : seg === 'lab' ? 'Lab Tests' : seg === 'scan' ? 'Scans & MRI' : 'Packages'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {loading ? (
                <ActivityIndicator size="small" color={THEME.greenPrimary} style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
                  {filtered.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => startEdit(item)}
                      style={{
                        backgroundColor: THEME.creamBg,
                        borderRadius: 10,
                        padding: 11,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          {item.segment.toUpperCase()} · {item.category} · Report {item.report_hrs}h
                          {item.fasting_hrs ? ` · Fasting ${item.fasting_hrs}h` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenPrimary }}>
                          {formatInr(item.base_price)}
                        </Text>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>Tap to Edit</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
