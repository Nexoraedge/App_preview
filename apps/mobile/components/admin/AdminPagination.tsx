import React from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const THEME = {
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2EA',
  border: '#E6E1D5',
  greenDark: '#14362B',
  ink: '#1A2421',
  muted: '#5C6B64',
};

interface AdminPaginationProps {
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  compact?: boolean;
}

export function AdminPagination({
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 25, 50],
  itemLabel = 'items',
  compact = false,
}: AdminPaginationProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (totalCount <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);

  if (totalPages === 1 && !onPageSizeChange) return null;

  return (
    <View
      style={{
        backgroundColor: THEME.surface,
        borderRadius: compact ? 0 : 12,
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 8 : 10,
        borderWidth: compact ? 0 : 1,
        borderTopWidth: compact ? 1 : 1,
        borderColor: THEME.border,
        flexDirection: !compact && isDesktop ? 'row' : 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>
        {startIdx + 1}–{endIdx} of {totalCount} {itemLabel}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {onPageSizeChange && !compact && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {pageSizeOptions.map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => {
                  onPageSizeChange(sz);
                  onPageChange(1);
                }}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 7,
                  backgroundColor: pageSize === sz ? THEME.greenDark : THEME.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: pageSize === sz ? '#FFFFFF' : THEME.ink,
                  }}
                >
                  {sz}/pg
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            disabled={safePage <= 1}
            onPress={() => onPageChange(Math.max(1, safePage - 1))}
            style={{
              padding: 5,
              borderRadius: 7,
              backgroundColor: THEME.surfaceAlt,
              opacity: safePage <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={15} color={THEME.ink} />
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
            {safePage} / {totalPages}
          </Text>
          <TouchableOpacity
            disabled={safePage >= totalPages}
            onPress={() => onPageChange(Math.min(totalPages, safePage + 1))}
            style={{
              padding: 5,
              borderRadius: 7,
              backgroundColor: THEME.surfaceAlt,
              opacity: safePage >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={15} color={THEME.ink} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
