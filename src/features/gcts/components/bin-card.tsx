import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getBinUrgency, getBinUrgencyLabel, type WasteBin } from '@/features/gcts/domain/bin';
import { GctsIcon, type GctsIconName } from '@/features/gcts/components/gcts-icon';
import { palette } from '@/features/gcts/palette';

type BinCardProps = {
  bin: WasteBin;
  onPress?: () => void;
  compact?: boolean;
  publicView?: boolean;
};

export function BinCard({ bin, onPress, compact = false, publicView = false }: BinCardProps) {
  const urgency = getBinUrgency(bin.fillLevelPercent);
  const urgencyStyles = urgencyStyle[urgency];
  const urgencyIcon: Record<typeof urgency, GctsIconName> = {
    collection_due: 'priority',
    nearly_full: 'nearlyFull',
    available: 'available',
  };

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${bin.name}, ${bin.fillLevelPercent}% full, ${getBinUrgencyLabel(urgency)}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.binIdentity}>
          <Text style={styles.binName} numberOfLines={1}>
            {bin.name}
          </Text>
          <Text style={styles.binMeta}>
            {publicView ? bin.division : `${bin.code} · ${bin.division}`}
          </Text>
        </View>
        <View style={[styles.statusPill, urgencyStyles.pill]}>
          <GctsIcon name={urgencyIcon[urgency]} size={13} color={urgencyStyles.icon} />
          <Text style={[styles.statusText, urgencyStyles.text]}>{getBinUrgencyLabel(urgency)}</Text>
        </View>
      </View>
      <View style={styles.fillRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${bin.fillLevelPercent}%`, backgroundColor: urgencyStyles.bar },
            ]}
          />
        </View>
        <Text style={[styles.fillValue, urgencyStyles.text]}>{bin.fillLevelPercent}%</Text>
      </View>
      {!compact && (
        <View style={styles.bottomRow}>
          <Text style={styles.readingSource}>SIMULATED READING</Text>
          <Text style={styles.updated}>{bin.lastUpdatedLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const urgencyStyle = {
  collection_due: {
    pill: { backgroundColor: palette.redSoft },
    text: { color: palette.red },
    icon: palette.red,
    bar: palette.red,
  },
  nearly_full: {
    pill: { backgroundColor: palette.amberSoft },
    text: { color: palette.amber },
    icon: palette.amber,
    bar: '#D69A39',
  },
  available: {
    pill: { backgroundColor: palette.greenSoft },
    text: { color: palette.green },
    icon: palette.green,
    bar: '#4B9A6D',
  },
} as const;

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
    shadowColor: '#22372C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  compactCard: {
    padding: 13,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  binIdentity: {
    flex: 1,
  },
  binName: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  binMeta: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 4,
  },
  metaDivider: {
    color: '#AAB5AD',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 13,
  },
  progressTrack: {
    height: 7,
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#EEF1ED',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  fillValue: {
    width: 38,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  readingSource: {
    color: '#89958D',
    fontSize: 9,
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  updated: {
    color: palette.muted,
    fontSize: 10,
  },
  pressed: {
    opacity: 0.78,
  },
});
