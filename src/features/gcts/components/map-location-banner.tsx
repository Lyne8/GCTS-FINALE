import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocationStatusState } from '@/features/gcts/components/gcts-map-shared';
import { palette } from '@/features/gcts/palette';

type MapLocationBannerProps = {
  state: LocationStatusState;
  onDismiss: () => void;
};

export function MapLocationBanner({ state, onDismiss }: MapLocationBannerProps) {
  if (state.status === 'idle') {
    return null;
  }

  const isError = state.status === 'error';
  const isReady = state.status === 'ready';

  return (
    <View
      pointerEvents="box-none"
      style={styles.overlayWrap}>
      <View
        style={[
          styles.banner,
          isError && styles.bannerError,
          isReady && styles.bannerReady,
        ]}>
        <Text
          numberOfLines={2}
          style={[
            styles.text,
            isError && styles.textError,
            isReady && styles.textReady,
          ]}>
          {state.message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss location status"
          onPress={onDismiss}
          hitSlop={8}
          style={styles.dismissButton}>
          <Text style={[styles.dismissText, isError && styles.textError]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayWrap: {
    position: 'absolute',
    left: 10,
    right: 54,
    bottom: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerReady: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  text: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: palette.ink,
  },
  textError: {
    color: '#991B1B',
  },
  textReady: {
    color: '#1D4ED8',
  },
  dismissButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
  },
});
