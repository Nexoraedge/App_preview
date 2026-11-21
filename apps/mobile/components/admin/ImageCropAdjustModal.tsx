import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Crop,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { uploadPrescriptionSlip } from '@adityam/supabase';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
};

interface ImageCropAdjustModalProps {
  visible: boolean;
  imageUri: string;
  aspect: [number, number]; // e.g. [16, 9] or [1, 1]
  filePrefix: string;
  title?: string;
  onClose: () => void;
  onSaved: (uploadedUrl: string) => void;
}

export function ImageCropAdjustModal({
  visible,
  imageUri,
  aspect,
  filePrefix,
  title = 'Adjust Thumbnail Alignment',
  onClose,
  onSaved,
}: ImageCropAdjustModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -100 to 100 (%)
  const [offsetY, setOffsetY] = useState(0); // -100 to 100 (%)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [visible, imageUri]);

  const aspectRatio = aspect[0] / aspect[1];
  const isSquare = aspect[0] === aspect[1];
  const isPortrait = aspect[0] < aspect[1];

  const handleSave = async () => {
    if (!imageUri) return;
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      // Native ImagePicker already uses native cropper; return original URI
      onSaved(imageUri);
      onClose();
      return;
    }

    setSaving(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not load image for cropping.'));
        el.src = imageUri;
      });

      const targetW = isSquare ? 600 : isPortrait ? 600 : 1200;
      const targetH = Math.round(targetW / aspectRatio);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // White background in case of transparent PNG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // Compute cover-fit scale * zoom
      const baseScale = Math.max(targetW / img.width, targetH / img.height);
      const drawW = img.width * baseScale * zoom;
      const drawH = img.height * baseScale * zoom;

      const maxPanX = Math.max(0, (drawW - targetW) / 2);
      const maxPanY = Math.max(0, (drawH - targetH) / 2);
      const drawX = (targetW - drawW) / 2 + (offsetX / 100) * Math.max(maxPanX, targetW * 0.25);
      const drawY = (targetH - drawH) / 2 + (offsetY / 100) * Math.max(maxPanY, targetH * 0.25);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const base64 = dataUrl.split(',')[1];
      const uploadedUrl = await uploadPrescriptionSlip(
        dataUrl,
        `${filePrefix}_${Date.now()}.jpg`,
        base64
      );
      onSaved(uploadedUrl);
      onClose();
    } catch (e: any) {
      Alert.alert(
        'Crop Notice',
        e?.message || 'Could not export cropped thumbnail. Try uploading the image file directly.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            backgroundColor: THEME.surface,
            borderRadius: 18,
            padding: 20,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Crop size={18} color={THEME.green} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={18} color={THEME.muted} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: THEME.muted }}>
            Frame the exact part of the image to show in the{' '}
            <Text style={{ fontWeight: '800', color: THEME.ink }}>
              {isSquare ? '1:1 Square' : isPortrait ? '3:4 Portrait' : '16:9 Card Banner'}
            </Text>
            . Use Zoom &amp; Alignment arrows below.
          </Text>

          {/* Crop Preview Window */}
          <View style={{ alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14 }}>
            <View
              style={{
                width: isSquare ? 220 : isPortrait ? 210 : '100%',
                maxWidth: isSquare ? 220 : isPortrait ? 210 : 400,
                aspectRatio,
                overflow: 'hidden',
                borderRadius: isSquare ? 110 : 12,
                borderWidth: 2,
                borderColor: '#A7F3D0',
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  resizeMode="cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: [
                      { scale: zoom },
                      { translateX: offsetX * 0.8 },
                      { translateY: offsetY * 0.8 },
                    ],
                  }}
                />
              ) : null}
            </View>
          </View>

          {/* Zoom & Position Controls */}
          <View
            style={{
              backgroundColor: THEME.bg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 12,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                Zoom ({zoom.toFixed(1)}x)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ZoomOut size={15} color={THEME.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ZoomIn size={15} color={THEME.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setZoom(1);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RotateCcw size={13} color={THEME.muted} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Alignment</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setOffsetX((x) => Math.max(-100, x - 15))}
                  style={{
                    padding: 7,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ArrowLeft size={14} color={THEME.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOffsetX((x) => Math.min(100, x + 15))}
                  style={{
                    padding: 7,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ArrowRight size={14} color={THEME.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOffsetY((y) => Math.max(-100, y - 15))}
                  style={{
                    padding: 7,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ArrowUp size={14} color={THEME.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOffsetY((y) => Math.min(100, y + 15))}
                  style={{
                    padding: 7,
                    borderRadius: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <ArrowDown size={14} color={THEME.ink} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={saving}
              style={{
                backgroundColor: THEME.green,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 9,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={15} color="#FFFFFF" />
              )}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {saving ? 'Saving Crop...' : 'Save Cropped Thumbnail'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
