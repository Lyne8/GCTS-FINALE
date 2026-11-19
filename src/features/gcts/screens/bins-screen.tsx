import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { BinCard } from '@/features/gcts/components/bin-card';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import { GctsMapView } from '@/features/gcts/components/gcts-map-view';
import type { BinListState } from '@/features/gcts/data/bin-repository';
import { FirebaseBinRepository } from '@/features/gcts/data/firebase-bin-repository';
import {
  getBinUrgency,
  getBinUrgencyLabel,
  type BinUrgency,
  type WasteBin,
} from '@/features/gcts/domain/bin';
import { useAppState } from '@/features/gcts/state/app-state-context';
import { palette } from '@/features/gcts/palette';
import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';

type BinFilter = 'all' | 'collection_due' | 'nearly_full' | 'available';

const filters: { value: BinFilter; label: string }[] = [
  { value: 'all', label: 'All bins' },
  { value: 'collection_due', label: 'Due' },
  { value: 'nearly_full', label: 'Nearly full' },
  { value: 'available', label: 'Available' },
];

const firebaseBinRepository = new FirebaseBinRepository();

export function BinsScreen() {
  const { role: previewRole, setSettingsVisible } = useAppState();
  const { session } = useFirebaseAuth();
  const [filter, setFilter] = useState<BinFilter>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [query, setQuery] = useState('');
  const [selectedBin, setSelectedBin] = useState<WasteBin | null>(null);
  const [liveBins, setLiveBins] = useState<BinListState>({ status: 'loading' });
  const principal = session.status === 'signed-in' ? session.principal : null;

  useEffect(() => {
    if (!principal) {
      return;
    }
    return firebaseBinRepository.subscribe(principal, setLiveBins);
  }, [principal]);

  if (session.status === 'loading') {
    return <AppPage eyebrow="BIN MONITORING" title="Bins" subtitle="Checking account status..." />;
  }
  if (session.status === 'error') {
    return (
      <AppPage eyebrow="BIN MONITORING" title="Bins" subtitle="Account status is temporarily unavailable.">
        <DataMessage message={session.failure.message} />
      </AppPage>
    );
  }

  const role = principal?.role ?? previewRole;
  const roleBins = principal && liveBins.status === 'ready' ? liveBins.bins : [];
  const counts = {
    all: roleBins.length,
    collection_due: roleBins.filter((bin) => getBinUrgency(bin.fillLevelPercent) === 'collection_due')
      .length,
    nearly_full: roleBins.filter((bin) => getBinUrgency(bin.fillLevelPercent) === 'nearly_full')
      .length,
    available: roleBins.filter((bin) => getBinUrgency(bin.fillLevelPercent) === 'available').length,
  };
  const filteredBins = roleBins.filter((bin) => {
    const matchesFilter = filter === 'all' || getBinUrgency(bin.fillLevelPercent) === filter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${bin.name} ${bin.code} ${bin.division}`.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  return (
    <AppPage
      eyebrow="BIN MONITORING"
      title={role === 'resident' ? 'Public bin locations' : 'Bins'}
      subtitle={
        role === 'resident'
          ? 'Check public bin locations and status.'
          : 'Browse fill levels by location and collection priority.'
      }>
      {!principal ? (
        <View style={styles.promptCard}>
          <View style={styles.promptIcon}>
            <GctsIcon name="bins" size={24} color={palette.forest} />
          </View>
          <Text style={styles.promptTitle}>Public Bin Locations</Text>
          <Text style={styles.promptCopy}>
            Verified residents and city collection staff can view live bin status, monitor collection urgency, and report issues across Fort Portal.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}>
            <Text style={styles.ctaButtonText}>Sign In or Register</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {liveBins.status === 'loading' && (
            <DataMessage message="Loading bin locations..." />
          )}
          {liveBins.status === 'empty' && (
            <DataMessage message="No reportable bin records are available." />
          )}
          {liveBins.status === 'permission-denied' && (
            <DataMessage message={liveBins.message} />
          )}
          {liveBins.status === 'offline' && <DataMessage message={liveBins.message} />}
          {liveBins.status === 'error' && (
            <DataMessage message={liveBins.failure.message} />
          )}
          {liveBins.status === 'ready' && liveBins.source === 'cache' && (
            <DataMessage message="Offline mode: showing saved data." />
          )}

          <View style={styles.summaryRow}>
            <SummaryCard value={String(counts.collection_due)} label="Collection due" tone="red" />
            <SummaryCard value={String(counts.nearly_full)} label="Nearly full" tone="amber" />
            <SummaryCard value={String(counts.available)} label="Available" tone="green" />
          </View>

          <View style={styles.searchBox}>
            <GctsIcon name="search" size={19} color={palette.muted} />
            <TextInput
              accessibilityLabel="Search bins"
              placeholder="Search bin or area"
              placeholderTextColor="#8B968F"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                hitSlop={8}>
                <GctsIcon name="close" size={17} color={palette.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            {filters.map((item) => {
              const selected = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item.value)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}>
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.filterCount, selected && styles.filterTextSelected]}>
                    {counts[item.value]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.listHeading}>
            <View>
              <Text style={styles.listTitle}>
                {filter === 'all' ? 'All locations' : filters.find((item) => item.value === filter)?.label}
              </Text>
              <Text style={styles.listCount}>{filteredBins.length} shown</Text>
            </View>
            <View style={styles.segmentContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="List view"
                accessibilityState={{ selected: viewMode === 'list' }}
                onPress={() => setViewMode('list')}
                style={[styles.segmentButton, viewMode === 'list' && styles.segmentButtonActive]}>
                <Text
                  style={[
                    styles.segmentButtonText,
                    viewMode === 'list' && styles.segmentButtonTextActive,
                  ]}>
                  List
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Map view"
                accessibilityState={{ selected: viewMode === 'map' }}
                onPress={() => setViewMode('map')}
                style={[styles.segmentButton, viewMode === 'map' && styles.segmentButtonActive]}>
                <Text
                  style={[
                    styles.segmentButtonText,
                    viewMode === 'map' && styles.segmentButtonTextActive,
                  ]}>
                  Map
                </Text>
              </Pressable>
            </View>
          </View>

          {viewMode === 'map' ? (
            <View style={styles.mapWrapper}>
              <GctsMapView
                bins={filteredBins}
                selectedBinId={selectedBin?.id}
                onSelectBin={(bin) => setSelectedBin(bin)}
                height={380}
              />
              <Text style={styles.mapHint}>
                Tap any marker to view fill level, division, and report details.
              </Text>
            </View>
          ) : (
            <View style={styles.binList}>
              {filteredBins.map((bin) => (
                <BinCard
                  key={bin.id}
                  bin={bin}
                  publicView={role === 'resident'}
                  onPress={() => setSelectedBin(bin)}
                />
              ))}
              {liveBins.status === 'ready' && filteredBins.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No matching bins</Text>
                  <Text style={styles.emptyCopy}>Try another search or status filter.</Text>
                </View>
              )}
            </View>
          )}

          <BinDetailModal
            bin={
              liveBins.status === 'ready'
                ? liveBins.bins.find((bin) => bin.id === selectedBin?.id) ?? null
                : selectedBin
            }
            publicView={role === 'resident'}
            onClose={() => setSelectedBin(null)}
          />
        </>
      )}
    </AppPage>
  );
}

function DataMessage({
  message,
  tone = 'warning',
}: {
  message: string;
  tone?: 'warning' | 'info';
}) {
  return (
    <View style={[styles.dataMessage, tone === 'info' && styles.dataMessageInfo]}>
      <Text style={[styles.dataMessageText, tone === 'info' && styles.dataMessageInfoText]}>
        {message}
      </Text>
    </View>
  );
}

type SummaryCardProps = {
  value: string;
  label: string;
  tone: 'red' | 'amber' | 'green';
};

function SummaryCard({ value, label, tone }: SummaryCardProps) {
  const color = tone === 'red' ? palette.red : tone === 'amber' ? palette.amber : palette.green;

  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

type BinDetailModalProps = {
  bin: WasteBin | null;
  publicView: boolean;
  onClose: () => void;
};

function BinDetailModal({ bin, publicView, onClose }: BinDetailModalProps) {
  if (!bin) {
    return null;
  }
  const urgency: BinUrgency = getBinUrgency(bin.fillLevelPercent);

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close bin details"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              {!publicView && <Text style={styles.sheetEyebrow}>{bin.code}</Text>}
              <Text style={styles.sheetTitle}>{bin.name}</Text>
              <Text style={styles.sheetMeta}>{bin.division}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close bin details"
              onPress={onClose}
              style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <BinCard bin={bin} publicView={publicView} />
          <View style={styles.detailInfo}>
            <DetailRow label="Last updated" value={bin.lastUpdatedLabel} />
            <DetailRow
              label="Status"
              value={getBinUrgencyLabel(urgency)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 78,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    backgroundColor: palette.white,
  },
  summaryValue: {
    fontSize: 21,
    fontWeight: '800',
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  searchBox: {
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.white,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: palette.ink,
    fontSize: 13,
  },
  filters: {
    gap: 8,
    paddingVertical: 14,
  },
  filterChip: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    backgroundColor: palette.white,
  },
  filterChipSelected: {
    borderColor: palette.forest,
    backgroundColor: palette.forest,
  },
  filterText: {
    color: '#647168',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: palette.white,
  },
  filterCount: {
    color: '#8A958E',
    fontSize: 10,
    fontWeight: '700',
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8EDE9',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: palette.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
  },
  segmentButtonTextActive: {
    color: palette.forest,
  },
  mapWrapper: {
    gap: 8,
    marginBottom: 16,
  },
  mapHint: {
    fontSize: 11,
    color: palette.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  listCount: {
    color: palette.muted,
    fontSize: 10,
  },
  binList: {
    gap: 9,
  },
  emptyState: {
    padding: 22,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 5,
  },
  dataMessage: {
    padding: 11,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: palette.amberSoft,
  },
  dataMessageText: {
    color: palette.amber,
    fontSize: 11,
    lineHeight: 16,
  },
  dataMessageInfo: {
    backgroundColor: palette.mint,
  },
  dataMessageInfoText: {
    color: palette.forest,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 33, 27, 0.4)',
  },
  detailSheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.canvas,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: '#D5DDD6',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sheetTitleGroup: {
    flex: 1,
  },
  sheetEyebrow: {
    color: palette.forestLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    marginTop: 3,
  },
  sheetMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EEEA',
  },
  closeButtonText: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 24,
  },
  detailInfo: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    backgroundColor: palette.white,
  },
  detailRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EFF2EF',
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 11,
  },
  detailValue: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  doneButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: palette.forest,
  },
  doneButtonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
  },
  promptCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    marginTop: 8,
  },
  promptIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mint,
    marginBottom: 12,
  },
  promptTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  promptCopy: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    maxWidth: 320,
  },
  ctaButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.forest,
  },
  ctaButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
