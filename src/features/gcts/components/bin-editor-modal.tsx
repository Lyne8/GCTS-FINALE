import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette } from '@/features/gcts/palette';
import { FirebaseBinRepository } from '@/features/gcts/data/firebase-bin-repository';
import type { WasteBin } from '@/features/gcts/domain/bin';

const binRepo = new FirebaseBinRepository();

const availableDivisions = [
  { id: 'central', label: 'Central Division' },
  { id: 'north', label: 'North Division' },
];

type BinEditorModalProps = {
  visible: boolean;
  binToEdit: WasteBin | null;
  onClose: () => void;
  onSaved: () => void;
};

export function BinEditorModal({
  visible,
  binToEdit,
  onClose,
  onSaved,
}: BinEditorModalProps) {
  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <BinEditorForm
            key={binToEdit?.id ?? 'new-bin'}
            binToEdit={binToEdit}
            onClose={onClose}
            onSaved={onSaved}
          />
        </View>
      </View>
    </Modal>
  );
}

function BinEditorForm({
  binToEdit,
  onClose,
  onSaved,
}: {
  binToEdit: WasteBin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!binToEdit;
  const [binId, setBinId] = useState(binToEdit?.id ?? '');
  const [code, setCode] = useState(binToEdit?.code ?? '');
  const [name, setName] = useState(binToEdit?.name ?? '');
  const [divisionId, setDivisionId] = useState(binToEdit?.divisionId ?? 'central');
  const [latitude, setLatitude] = useState(
    binToEdit?.latitude !== undefined && binToEdit?.latitude !== null
      ? String(binToEdit.latitude)
      : '0.6550'
  );
  const [longitude, setLongitude] = useState(
    binToEdit?.longitude !== undefined && binToEdit?.longitude !== null
      ? String(binToEdit.longitude)
      : '30.2750'
  );
  const [deviceKey, setDeviceKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!code.trim()) {
      setError('Bin code is required (e.g. BIN-FP-009).');
      return;
    }
    if (!name.trim()) {
      setError('Location / Name is required (e.g. Central Market Gate).');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError('Please provide valid decimal coordinates for latitude and longitude.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        // True PATCH update: only updates changed/specified fields, keeping existing telemetry intact
        await binRepo.updateBin(binToEdit.id, {
          code: code.trim(),
          name: name.trim(),
          divisionId,
          latitude: latNum,
          longitude: lngNum,
          ...(deviceKey.trim() ? { deviceKey: deviceKey.trim() } : {}),
        });
      } else {
        await binRepo.createBin({
          ...(binId.trim() ? { id: binId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') } : {}),
          code: code.trim(),
          name: name.trim(),
          divisionId,
          latitude: latNum,
          longitude: lngNum,
          ...(deviceKey.trim() ? { deviceKey: deviceKey.trim() } : {}),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dustbin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.modalTitle}>
        {isEditing ? 'Edit Smart Dustbin' : 'Register New Smart Dustbin'}
      </Text>
      <Text style={styles.modalSubtitle}>
        {isEditing
          ? 'Update dustbin metadata and coordinates. Real-time telemetry is preserved.'
          : 'Configure dustbin location metadata, division, and hardware security key.'}
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {isEditing ? 'Bin ID (Locked / Fixed in Firestore)' : 'Bin ID (Optional Document ID)'}
        </Text>
        <TextInput
          value={isEditing ? binToEdit.id : binId}
          onChangeText={setBinId}
          editable={!isEditing}
          placeholder="Auto-generated from name if left empty"
          placeholderTextColor={palette.muted}
          style={[styles.textInput, isEditing && styles.disabledInput]}
        />
        {isEditing && (
          <Text style={styles.inputHelper}>
            Document ID is fixed to ensure hardware sensor endpoints and historical logs remain linked.
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bin Code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="e.g. BIN-FP-009"
          placeholderTextColor={palette.muted}
          style={styles.textInput}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Location Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ruwenzori Square East"
          placeholderTextColor={palette.muted}
          style={styles.textInput}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Division</Text>
        <View style={styles.divisionRow}>
          {availableDivisions.map((div) => {
            const selected = divisionId === div.id;
            return (
              <Pressable
                key={div.id}
                accessibilityRole="button"
                onPress={() => setDivisionId(div.id)}
                style={[styles.divisionOption, selected && styles.divisionOptionSelected]}>
                <Text
                  style={[
                    styles.divisionOptionText,
                    selected && styles.divisionOptionTextSelected,
                  ]}>
                  {div.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.coordsRow}>
        <View style={[styles.inputGroup, styles.coordInput]}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="numeric"
            placeholder="0.6550"
            placeholderTextColor={palette.muted}
            style={styles.textInput}
          />
        </View>
        <View style={[styles.inputGroup, styles.coordInput]}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="numeric"
            placeholder="30.2750"
            placeholderTextColor={palette.muted}
            style={styles.textInput}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Device Secret Key (ESP32 REST Authentication)</Text>
        <TextInput
          value={deviceKey}
          onChangeText={setDeviceKey}
          placeholder={isEditing ? 'Leave blank to preserve current key' : 'e.g. gcts_esp32_device_secret'}
          placeholderTextColor={palette.muted}
          secureTextEntry
          style={styles.textInput}
        />
        <Text style={styles.inputHelper}>
          {isEditing
            ? 'Leave blank unless rotating the hardware authentication secret key.'
            : 'Hardware uses this key in JSON payloads to authenticate telemetry writes without credentials.'}
        </Text>
      </View>

      <View style={styles.modalActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
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
            <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Register Bin'}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 33, 27, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxWidth: 500,
    maxHeight: '90%',
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
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputHelper: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
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
  divisionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divisionOption: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  divisionOptionSelected: {
    backgroundColor: palette.mint,
    borderColor: palette.forest,
  },
  divisionOptionText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  divisionOptionTextSelected: {
    color: palette.forest,
    fontWeight: '800',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordInput: {
    flex: 1,
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
    minWidth: 110,
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
