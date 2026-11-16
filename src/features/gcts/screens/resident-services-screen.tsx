import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { demoBins } from '@/features/gcts/data/demo-bins';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import {
  useDemoRole,
  type ResidentReportType,
} from '@/features/gcts/state/demo-role-context';
import { palette } from '@/features/gcts/palette';

const issueTypes: { value: ResidentReportType; label: string }[] = [
  { value: 'overflowing_bin', label: 'Overflowing bin' },
  { value: 'missed_collection', label: 'Missed collection' },
];

const reportStatusLabel = {
  received: 'Received',
  under_review: 'Under review',
  resolved: 'Resolved',
} as const;

export function ResidentServicesScreen() {
  const { role, residentReports, addResidentReport } = useDemoRole();
  const [type, setType] = useState<ResidentReportType>('overflowing_bin');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');

  if (role !== 'resident') {
    return (
      <AppPage
        eyebrow="RESIDENT SERVICES"
        title="Resident reports"
        subtitle="This preview workflow is available in the Resident role.">
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Switch preview role</Text>
          <Text style={styles.infoCopy}>
            Use the role selector at the top of the screen to preview resident services.
          </Text>
        </View>
      </AppPage>
    );
  }

  const submitReport = () => {
    if (!location || details.trim().length === 0) {
      return;
    }

    const selectedBin = demoBins.find((bin) => bin.id === location);
    if (!selectedBin) {
      return;
    }

    addResidentReport({
      type,
      location: selectedBin.name,
      details: details.trim(),
    });
    setDetails('');
    setConfirmation('Your report has been received.');
  };

  return (
    <AppPage
      eyebrow="RESIDENT SERVICES"
      title="Report an issue"
      subtitle="Share a collection concern and check service information for your area.">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service schedule and notices</Text>
        <View style={styles.infoCard}>
          <View style={styles.cardTitleRow}>
            <GctsIcon name="schedule" size={18} color={palette.forestLight} />
            <Text style={styles.infoTitle}>Collection schedule</Text>
          </View>
          <Text style={styles.infoCopy}>Collection schedules for your area will appear here.</Text>
        </View>
        <View style={[styles.infoCard, styles.noticeCard]}>
          <View style={styles.cardTitleRow}>
            <GctsIcon name="notice" size={18} color={palette.forestLight} />
            <Text style={styles.infoTitle}>Service notices</Text>
          </View>
          <Text style={styles.infoCopy}>Updates and service announcements will appear here.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Submit a collection concern</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>What happened?</Text>
          <View style={styles.choiceRow}>
            {issueTypes.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setType(option.value)}
                  style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Where is the issue?</Text>
          <View style={styles.locationOptions}>
            {demoBins.map((bin) => {
              const selected = location === bin.id;
              return (
                <Pressable
                  key={bin.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setLocation(bin.id)}
                  style={[styles.locationOption, selected && styles.locationOptionSelected]}>
                  <Text
                    style={[
                      styles.locationOptionText,
                      selected && styles.locationOptionTextSelected,
                    ]}>
                    {bin.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Additional details</Text>
          <TextInput
            accessibilityLabel="Additional issue details"
            value={details}
            onChangeText={(value) => {
              setDetails(value);
              setConfirmation('');
            }}
            placeholder="Add a short description"
            placeholderTextColor="#8B968F"
            multiline
            maxLength={300}
            textAlignVertical="top"
            style={styles.detailsInput}
          />
          <Text style={styles.characterCount}>{details.length}/300</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !location || details.trim().length === 0 }}
            disabled={!location || details.trim().length === 0}
            onPress={submitReport}
            style={({ pressed }) => [
              styles.submitButton,
              (!location || details.trim().length === 0) && styles.submitButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.submitButtonText}>Submit report</Text>
          </Pressable>
          {confirmation.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.confirmation}>
              {confirmation}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.reportsHeading}>
          <Text style={styles.sectionTitle}>My submitted reports</Text>
          <Text style={styles.reportCount}>{residentReports.length}</Text>
        </View>
        {residentReports.length === 0 ? (
          <View style={styles.emptyReports}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyCopy}>Your submitted service requests will appear here.</Text>
          </View>
        ) : (
          <View style={styles.reportList}>
            {residentReports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportType}>
                    {report.type === 'overflowing_bin' ? 'Overflowing bin' : 'Missed collection'}
                  </Text>
                  <Text style={styles.reportStatus}>{reportStatusLabel[report.status]}</Text>
                </View>
                <Text style={styles.reportLocation}>{report.location}</Text>
                <Text style={styles.reportDetails}>{report.details}</Text>
                <Text style={styles.reportDate}>{report.submittedLabel}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 23,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.white,
  },
  noticeCard: {
    marginTop: 9,
  },
  cardEyebrow: {
    color: palette.forestLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 5,
  },
  infoCopy: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  formCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
  },
  fieldLabel: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  choiceChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
  },
  choiceChipSelected: {
    borderColor: palette.forest,
    backgroundColor: palette.mint,
  },
  choiceText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: palette.forest,
  },
  locationOptions: {
    gap: 7,
  },
  locationOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 11,
    backgroundColor: palette.white,
  },
  locationOptionSelected: {
    borderColor: palette.forestLight,
    backgroundColor: palette.mint,
  },
  locationOptionText: {
    color: '#526057',
    fontSize: 11,
    fontWeight: '600',
  },
  locationOptionTextSelected: {
    color: palette.forest,
    fontWeight: '800',
  },
  detailsInput: {
    minHeight: 86,
    padding: 11,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 11,
    color: palette.ink,
    fontSize: 12,
    backgroundColor: '#FCFDFC',
  },
  characterCount: {
    color: '#8B968F',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: palette.forest,
  },
  submitButtonDisabled: {
    backgroundColor: '#AAB8AF',
  },
  submitButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  confirmation: {
    color: palette.green,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 9,
  },
  reportsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportCount: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: palette.mint,
  },
  emptyReports: {
    padding: 17,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    backgroundColor: palette.white,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  reportList: {
    gap: 9,
  },
  reportCard: {
    padding: 13,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    backgroundColor: palette.white,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportType: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  reportStatus: {
    color: palette.green,
    fontSize: 9,
    fontWeight: '800',
  },
  reportLocation: {
    color: palette.forestLight,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  reportDetails: {
    color: '#59665E',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  reportDate: {
    color: '#89958D',
    fontSize: 9,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.75,
  },
});
