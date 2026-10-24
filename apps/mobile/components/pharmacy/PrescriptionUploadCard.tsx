// apps/mobile/components/pharmacy/PrescriptionUploadCard.tsx
// Prescription upload card with camera & gallery buttons, thumbnail gallery, and deletion

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Camera, Upload, X, FileText } from 'lucide-react-native';
import { pharmacyCopy } from '../../src/i18n/pharmacyCopy';

interface PrescriptionUploadCardProps {
  isHi: boolean;
  images: string[];
  maxPages: number;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onRemoveImage: (index: number) => void;
}

export function PrescriptionUploadCard({
  isHi,
  images,
  maxPages,
  onPickCamera,
  onPickGallery,
  onRemoveImage,
}: PrescriptionUploadCardProps) {
  const c = isHi ? pharmacyCopy.hi : pharmacyCopy.en;

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
          {c.uploadTitle}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
          {images.length} / {maxPages} {c.pagesAttached}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 12,
          color: '#64748B',
          marginBottom: 14,
          lineHeight: 16,
        }}
      >
        {c.uploadSubtitle}
      </Text>

      {/* Upload Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onPickCamera}
          activeOpacity={0.85}
          disabled={images.length >= maxPages}
          style={{
            flex: 1,
            backgroundColor: images.length >= maxPages ? '#F1F5F9' : '#EFF6FF',
            borderWidth: 1,
            borderColor: images.length >= maxPages ? '#E2E8F0' : '#BFDBFE',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Camera
            size={18}
            color={images.length >= maxPages ? '#94A3B8' : '#2563EB'}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: images.length >= maxPages ? '#94A3B8' : '#2563EB',
            }}
          >
            {c.btnCamera}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPickGallery}
          activeOpacity={0.85}
          disabled={images.length >= maxPages}
          style={{
            flex: 1,
            backgroundColor: images.length >= maxPages ? '#F1F5F9' : '#FFFFFF',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Upload
            size={18}
            color={images.length >= maxPages ? '#94A3B8' : '#334155'}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: images.length >= maxPages ? '#94A3B8' : '#334155',
            }}
          >
            {c.btnGallery}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Uploaded Thumbnails Preview */}
      {images.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          {images.map((uri, idx) => (
            <View
              key={idx}
              style={{
                width: 76,
                height: 98,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                position: 'relative',
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => onRemoveImage(idx)}
                activeOpacity={0.8}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={13} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
