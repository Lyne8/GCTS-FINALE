import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GctsIcon, type GctsIconName } from '@/features/gcts/components/gcts-icon';
import { demoRoles, useDemoRole } from '@/features/gcts/state/demo-role-context';
import { palette } from '@/features/gcts/palette';
import { useResponsiveWidth } from '@/features/gcts/hooks/use-responsive-width';

const roleTitles = {
  admin: 'City administrator',
  supervisor: 'Supervisor',
  collector: 'Collector / driver',
  resident: 'Resident',
} as const;

const notifications: { title: string; detail: string; time: string; icon: GctsIconName }[] = [
  { title: 'Collection due', detail: 'Central Market bin needs collection.', time: '4 min ago', icon: 'priority' },
  { title: 'Route started', detail: 'Central Market Loop is in progress.', time: '18 min ago', icon: 'routes' },
  { title: 'New resident report', detail: 'Overflowing bin reported at Mpanga Market.', time: '31 min ago', icon: 'report' },
];

type AppPageProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

export function AppPage({ children, eyebrow, title, subtitle }: AppPageProps) {
  const { role, setRolePickerVisible, setNotificationsVisible } = useDemoRole();
  const width = useResponsiveWidth();
  const wideWeb = Platform.OS === 'web' && width >= 900;
  const desktopAdmin = Platform.OS === 'web' && role === 'admin' && width >= 1100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          wideWeb && styles.scrollContentWide,
          desktopAdmin && styles.scrollContentDesktopAdmin,
        ]}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.content,
            wideWeb && styles.contentWide,
            desktopAdmin && styles.contentDesktopAdmin,
          ]}>
          <View style={styles.topBar}>
            <View style={[styles.brandLockup, desktopAdmin && styles.desktopAdminBrandHidden]}>
              <View style={styles.brandMark}>
                <GctsIcon name="recycle" size={23} color={palette.white} />
              </View>
              <View>
                <Text style={styles.brandName}>GCTS</Text>
                <Text style={styles.brandLocation}>Fort Portal Tourism City</Text>
              </View>
            </View>
            <View style={styles.topBarActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => setNotificationsVisible(true)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <GctsIcon name="notifications" size={20} color={palette.forest} />
                <View style={styles.notificationBadge} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview role: ${roleTitles[role]}. Change role`}
                onPress={() => setRolePickerVisible(true)}
                style={({ pressed }) => [styles.roleButton, pressed && styles.pressed]}>
                <View style={styles.avatar}>
                  <GctsIcon name="person" size={17} color={palette.forest} />
                </View>
                <Text style={[styles.roleButtonLabel, width > 0 && width < 500 && styles.roleButtonLabelCompact]}>
                  {width > 0 && width < 500
                    ? { admin: 'Admin', supervisor: 'Supervisor', collector: 'Collector', resident: 'Resident' }[role]
                    : roleTitles[role]}
                </Text>
                <GctsIcon name="chevron" size={15} color={palette.muted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {children}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

export function WorkspaceOverlays() {
  const {
    role,
    setRole,
    rolePickerVisible,
    setRolePickerVisible,
    notificationsVisible,
    setNotificationsVisible,
  } = useDemoRole();
  const notificationActionLabel =
    role === 'admin' ? 'View reports' : role === 'resident' ? 'My reports' : 'View routes';

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={rolePickerVisible}
        onRequestClose={() => setRolePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close role selector"
            onPress={() => setRolePickerVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.roleDialog}>
            <Text style={styles.dialogEyebrow}>PREVIEW WORKSPACE</Text>
            <Text style={styles.dialogTitle}>View as</Text>
            <Text style={styles.dialogCopy}>Choose a role to preview its workspace.</Text>
            {demoRoles.map((item) => {
              const selected = item.value === role;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRole(item.value);
                    setRolePickerVisible(false);
                  }}
                  style={[styles.roleOption, selected && styles.roleOptionSelected]}>
                  <View style={styles.roleOptionCopy}>
                    <Text style={styles.roleOptionTitle}>{item.label}</Text>
                    <Text style={styles.roleOptionDescription}>{item.description}</Text>
                  </View>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setRolePickerVisible(false)}
              style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
            onPress={() => setNotificationsVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.notificationDialog}>
            <View style={styles.notificationHeader}>
              <View>
                <Text style={styles.dialogEyebrow}>UPDATES</Text>
                <Text style={styles.notificationTitle}>Notifications</Text>
              </View>
              <Text style={styles.notificationCount}>Recent activity</Text>
            </View>
            {notifications.map(({ title, detail, time, icon }) => (
              <View key={title} style={styles.notificationItem}>
                <View style={styles.notificationItemIcon}>
                  <GctsIcon name={icon} size={18} />
                </View>
                <View style={styles.notificationItemCopy}>
                  <Text style={styles.notificationItemTitle}>{title}</Text>
                  <Text style={styles.notificationItemDetail}>{detail}</Text>
                  <Text style={styles.notificationItemTime}>{time}</Text>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setNotificationsVisible(false);
                router.navigate(
                  role === 'admin'
                    ? '/reports'
                    : role === 'resident'
                      ? '/resident'
                      : '/routes'
                );
              }}
              style={styles.notificationAction}>
              <Text style={styles.notificationActionText}>{notificationActionLabel}</Text>
              <GctsIcon name="chevron" size={16} color={palette.forest} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 96,
  },
  scrollContentWide: {
    alignItems: 'stretch',
    paddingBottom: 36,
  },
  scrollContentDesktopAdmin: {
    paddingBottom: 32,
  },
  content: {
    width: '100%',
    maxWidth: 920,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentWide: {
    maxWidth: 1600,
    paddingHorizontal: 32,
    alignSelf: 'center',
  },
  contentDesktopAdmin: {
    maxWidth: undefined,
    paddingLeft: 284,
    paddingRight: 40,
  },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopAdminBrandHidden: {
    display: 'none',
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.forest,
  },
  brandName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  brandLocation: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 1,
  },
  roleButton: {
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    backgroundColor: palette.white,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 13,
    backgroundColor: palette.white,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.red,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mint,
  },
  roleButtonLabel: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 108,
  },
  roleButtonLabelCompact: {
    maxWidth: 66,
    fontSize: 10,
  },
  heading: {
    marginTop: 30,
    marginBottom: 18,
  },
  eyebrow: {
    color: palette.forestLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.15,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 5,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    maxWidth: 620,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(18, 33, 27, 0.42)',
  },
  roleDialog: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 22,
    backgroundColor: palette.white,
  },
  notificationDialog: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 22,
    backgroundColor: palette.white,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitle: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  notificationCount: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.mint,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  notificationItemIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F1',
  },
  notificationItemCopy: {
    flex: 1,
  },
  notificationItemTitle: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  notificationItemDetail: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  notificationItemTime: {
    color: '#8B968F',
    fontSize: 9,
    marginTop: 5,
  },
  notificationAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: palette.mint,
  },
  notificationActionText: {
    color: palette.forest,
    fontSize: 12,
    fontWeight: '800',
  },
  dialogEyebrow: {
    color: palette.forestLight,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
  },
  dialogTitle: {
    marginTop: 5,
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  dialogCopy: {
    marginTop: 6,
    marginBottom: 14,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  roleOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    marginTop: 8,
  },
  roleOptionSelected: {
    borderColor: palette.forestLight,
    backgroundColor: palette.mint,
  },
  roleOptionCopy: {
    flex: 1,
  },
  roleOptionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  roleOptionDescription: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 3,
  },
  checkmark: {
    color: palette.forest,
    fontSize: 18,
    fontWeight: '800',
  },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
