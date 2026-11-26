import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppPage } from '@/features/gcts/components/app-page';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import { palette } from '@/features/gcts/palette';
import { FirebaseAccountPanel } from '@/features/auth/components/firebase-account-panel';
import { useAppState } from '@/features/gcts/state/app-state-context';

const divisions = ['All divisions', 'Central Division', 'North Division'];

export function SettingsContent() {
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]);
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    priorityAlertsEnabled,
    setPriorityAlertsEnabled,
  } = useAppState();

  return (
    <>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Account</Text>
        <FirebaseAccountPanel />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Workspace</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Default division</Text>
          <View style={styles.options}>
            {divisions.map((division) => {
              const selected = division === selectedDivision;
              return (
                <Pressable
                  key={division}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedDivision(division)}
                  style={[styles.option, selected && styles.optionSelected]}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {division}
                  </Text>
                  {selected && <GctsIcon name="available" size={16} color={palette.forest} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingSwitch
            title="Push notifications"
            subtitle="Receive collection and service updates"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <View style={styles.divider} />
          <SettingSwitch
            title="Priority alerts"
            subtitle="Be notified when a bin needs attention"
            value={priorityAlertsEnabled}
            onValueChange={setPriorityAlertsEnabled}
            disabled={!notificationsEnabled}
          />
        </View>
      </View>
    </>
  );
}

export function SettingsScreen() {
  return (
    <AppPage
      eyebrow="PREFERENCES"
      title="Settings"
      subtitle="Set up your GCTS workspace the way you work.">
      <SettingsContent />
    </AppPage>
  );
}

function SettingSwitch({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.switchRow, disabled && styles.disabled]}>
      <View style={styles.switchCopy}>
        <Text style={styles.switchTitle}>{title}</Text>
        <Text style={styles.switchSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D9E1DB', true: '#8DB6A0' }}
        thumbColor={value ? palette.forest : '#FFFFFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 22,
  },
  groupTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  option: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
  },
  optionSelected: {
    borderColor: palette.forestLight,
    backgroundColor: palette.mint,
  },
  optionText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: palette.forest,
  },
  switchRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchCopy: {
    flex: 1,
  },
  switchTitle: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  switchSubtitle: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  disabled: {
    opacity: 0.45,
  },
});
