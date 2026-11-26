import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import { palette } from '@/features/gcts/palette';
import { FirebaseStaffProfileRepository } from '@/features/gcts/data/firebase-staff-profile-repository';
import type { StaffProfile } from '@/features/gcts/domain/staff-profile';

const staffRepo = new FirebaseStaffProfileRepository();
const availableRoles: ('collector' | 'supervisor' | 'admin')[] = [
  'collector',
  'supervisor',
  'admin',
];

const availableDivisions = [
  { id: 'central', label: 'Central Division' },
  { id: 'north', label: 'North Division' },
];

export function StaffManagementPanel() {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal editor state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StaffProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'collector' | 'supervisor' | 'admin'>('collector');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(['central']);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = staffRepo.subscribeStaff((state) => {
      if (state.status === 'ready') {
        setProfiles(Object.values(state.profiles));
        setLoading(false);
        setError(null);
      } else if (state.status === 'error') {
        setError(state.message);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const openCreateModal = () => {
    setEditingProfile(null);
    setDisplayName('');
    setEmail('');
    setRole('collector');
    setSelectedDivisions(['central']);
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (profile: StaffProfile) => {
    setEditingProfile(profile);
    setDisplayName(profile.displayName);
    setEmail(profile.email);
    setRole(profile.role);
    setSelectedDivisions(profile.divisionIds ?? ['central']);
    setFormError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setFormError('Please enter full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await staffRepo.saveStaffProfile({
        email: email.trim(),
        displayName: displayName.trim(),
        role,
        divisionIds: role === 'supervisor' ? selectedDivisions : [],
      });
      setModalVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save staff profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (profile: StaffProfile) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to remove ${profile.displayName} (${profile.email}) from staff roles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffRepo.deleteStaffProfile(profile.email);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove staff.');
            }
          },
        },
      ]
    );
  };

  const toggleDivision = (divId: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(divId) ? prev.filter((id) => id !== divId) : [...prev, divId]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Staff & Roles</Text>
          <Text style={styles.subtitle}>Assign system roles to field staff and supervisors</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openCreateModal}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <Text style={styles.addButtonText}>+ Add Staff</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={palette.forest} />
          <Text style={styles.loadingText}>Loading staff profiles...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && profiles.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>
            No staff profiles found. Tap &quot;+ Add Staff&quot; to assign roles.
          </Text>
        </View>
      )}

      {!loading &&
        profiles.map((profile) => (
          <View key={profile.uid || profile.email} style={styles.profileRow}>
            <View style={styles.profileInfo}>
              <View style={styles.nameRoleRow}>
                <Text style={styles.profileName}>{profile.displayName}</Text>
                <View
                  style={[
                    styles.roleBadge,
                    profile.role === 'admin'
                      ? styles.roleBadgeAdmin
                      : profile.role === 'supervisor'
                        ? styles.roleBadgeSupervisor
                        : styles.roleBadgeCollector,
                  ]}>
                  <Text style={styles.roleBadgeText}>{profile.role.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              {profile.role === 'supervisor' && profile.divisionIds && (
                <Text style={styles.profileDivisions}>
                  Divisions: {profile.divisionIds.join(', ')}
                </Text>
              )}
            </View>

            <View style={styles.rowActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openEditModal(profile)}
                style={({ pressed }) => [styles.editAction, pressed && styles.pressed]}>
                <Text style={styles.editActionText}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleDelete(profile)}
                style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}>
                <Text style={styles.deleteActionText}>✕</Text>
              </Pressable>
            </View>
          </View>
        ))}

      {/* Add / Edit Staff Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingProfile ? 'Edit Staff Role' : 'Assign New Staff Role'}
            </Text>
            <Text style={styles.modalSubtitle}>
              When this user signs into GCTS, their permissions will be active immediately.
            </Text>

            {formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Patrick Magezi"
                placeholderTextColor={palette.muted}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. collector@gcts.fortportal.go.ug"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!editingProfile}
                style={[styles.textInput, !!editingProfile && styles.disabledInput]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assigned Role</Text>
              <View style={styles.rolePickerRow}>
                {availableRoles.map((r) => {
                  const selected = role === r;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="button"
                      onPress={() => setRole(r)}
                      style={[styles.roleOption, selected && styles.roleOptionSelected]}>
                      <Text
                        style={[
                          styles.roleOptionText,
                          selected && styles.roleOptionTextSelected,
                        ]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {role === 'supervisor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supervised Divisions</Text>
                <View style={styles.divisionsRow}>
                  {availableDivisions.map((div) => {
                    const active = selectedDivisions.includes(div.id);
                    return (
                      <Pressable
                        key={div.id}
                        accessibilityRole="button"
                        onPress={() => toggleDivision(div.id)}
                        style={[
                          styles.divisionChip,
                          active && styles.divisionChipActive,
                        ]}>
                        <Text
                          style={[
                            styles.divisionChipText,
                            active && styles.divisionChipTextActive,
                          ]}>
                          {div.label}
                        </Text>
                        {active && (
                          <GctsIcon name="available" size={14} color={palette.forest} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                disabled={saving}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                {saving ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Role</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 17,
    backgroundColor: palette.white,
    marginBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: palette.mint,
  },
  addButtonText: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '800',
  },
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 6,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FDEEE9',
    marginBottom: 12,
  },
  errorText: {
    color: palette.red,
    fontSize: 11,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  profileInfo: {
    flex: 1,
  },
  nameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeAdmin: {
    backgroundColor: '#FDEEE9',
  },
  roleBadgeSupervisor: {
    backgroundColor: '#E8F1FC',
  },
  roleBadgeCollector: {
    backgroundColor: palette.mint,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: palette.ink,
  },
  profileEmail: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
  },
  profileDivisions: {
    color: palette.forestLight,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F7F4',
  },
  editActionText: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteAction: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FDEEE9',
  },
  deleteActionText: {
    color: palette.red,
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 33, 27, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  formErrorBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FDEEE9',
    marginBottom: 12,
  },
  formErrorText: {
    color: palette.red,
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: palette.ink,
    backgroundColor: palette.canvas,
  },
  disabledInput: {
    backgroundColor: '#EBEFEB',
    color: palette.muted,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  roleOptionSelected: {
    backgroundColor: palette.mint,
    borderColor: palette.forest,
  },
  roleOptionText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  roleOptionTextSelected: {
    color: palette.forest,
    fontWeight: '800',
  },
  divisionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  divisionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
  },
  divisionChipActive: {
    backgroundColor: palette.mint,
    borderColor: palette.forestLight,
  },
  divisionChipText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  divisionChipTextActive: {
    color: palette.forest,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F1',
  },
  cancelButtonText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
