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

import { useFirebaseAuth } from '@/features/auth/hooks/use-firebase-auth';
import { GctsIcon } from '@/features/gcts/components/gcts-icon';
import { useAppState } from '@/features/gcts/state/app-state-context';
import { SettingsContent } from '@/features/gcts/components/settings-content';
import { palette } from '@/features/gcts/palette';
import { useResponsiveWidth } from '@/features/gcts/hooks/use-responsive-width';

type AppPageProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

export function AppPage({ children, eyebrow, title, subtitle }: AppPageProps) {
  const { setNotificationsVisible, setSettingsVisible, unreadCount } = useAppState();
  const { session } = useFirebaseAuth();
  const width = useResponsiveWidth();
  const role = session.status === 'signed-in' ? session.principal.role : 'resident';
  const isSignedIn = session.status === 'signed-in';
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
                {unreadCount > 0 && <View style={styles.notificationBadge} />}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isSignedIn ? `Settings (${session.principal.email ?? 'Signed in'})` : 'Settings'}
                onPress={() => setSettingsVisible(true)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <GctsIcon name="more" size={20} color={palette.forest} />
                {isSignedIn && <View style={styles.signedInDot} />}
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
    notificationsVisible,
    setNotificationsVisible,
    settingsVisible,
    setSettingsVisible,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    notificationsEnabled,
  } = useAppState();

  const notificationActionLabel =
    role === 'admin' ? 'View reports' : role === 'resident' ? 'My reports' : 'View routes';

  return (
    <>
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
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={markAllAsRead}
                  style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]}>
                  <Text style={styles.markAllButtonText}>Mark all as read</Text>
                </Pressable>
              ) : (
                <Text style={styles.notificationCount}>
                  {notificationsEnabled ? 'All caught up' : 'Paused'}
                </Text>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <GctsIcon name="available" size={32} color={palette.forestLight} />
                <Text style={styles.emptyNotificationsTitle}>
                  {notificationsEnabled ? 'No active alerts' : 'Notifications paused'}
                </Text>
                <Text style={styles.emptyNotificationsSubtitle}>
                  {notificationsEnabled
                    ? 'Key alerts like collection needs and assignments will appear here.'
                    : 'Turn notifications back on in Settings to resume alerts.'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
                {notifications.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => {
                      markAsRead(item.id);
                      setNotificationsVisible(false);
                      if (item.actionRoute) {
                        router.navigate(item.actionRoute);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.notificationItem,
                      !item.read && styles.notificationItemUnread,
                      pressed && styles.pressed,
                    ]}>
                    <View
                      style={[
                        styles.notificationItemIcon,
                        item.priority === 'high' && styles.notificationItemIconHigh,
                      ]}>
                      <GctsIcon
                        name={item.icon}
                        size={18}
                        color={item.priority === 'high' ? palette.red : palette.forest}
                      />
                    </View>
                    <View style={styles.notificationItemCopy}>
                      <View style={styles.notificationItemTopRow}>
                        <Text style={styles.notificationItemTitle}>{item.title}</Text>
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationItemDetail}>{item.detail}</Text>
                      <Text style={styles.notificationItemTime}>{item.time}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}

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

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaView style={styles.settingsModalSafeArea} edges={['top', 'left', 'right']}>
          <View style={styles.settingsModalHeader}>
            <View>
              <Text style={styles.dialogEyebrow}>ACCOUNT & PREFERENCES</Text>
              <Text style={styles.settingsModalTitle}>Settings</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={() => setSettingsVisible(false)}
              style={({ pressed }) => [styles.settingsDoneButton, pressed && styles.pressed]}>
              <Text style={styles.settingsDoneButtonText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.settingsModalScroll}
            contentContainerStyle={styles.settingsModalScrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.settingsModalContent}>
              <SettingsContent />
            </View>
          </ScrollView>
        </SafeAreaView>
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
  signedInDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.forest,
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  heading: {
    marginTop: 26,
    marginBottom: 16,
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 620,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(18, 33, 27, 0.42)',
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
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.mint,
  },
  markAllButtonText: {
    color: palette.forest,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyNotificationsTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyNotificationsSubtitle: {
    color: palette.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  notificationList: {
    maxHeight: 320,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(235, 245, 240, 0.4)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  notificationItemIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F1',
  },
  notificationItemIconHigh: {
    backgroundColor: '#FDEEE9',
  },
  notificationItemCopy: {
    flex: 1,
  },
  notificationItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.forest,
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
  settingsModalSafeArea: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.white,
  },
  settingsModalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  settingsDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: palette.mint,
  },
  settingsDoneButtonText: {
    color: palette.forest,
    fontSize: 13,
    fontWeight: '800',
  },
  settingsModalScroll: {
    flex: 1,
  },
  settingsModalScrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  settingsModalContent: {
    width: '100%',
    maxWidth: 720,
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.75,
  },
});
