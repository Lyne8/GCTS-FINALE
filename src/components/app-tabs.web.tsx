import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabListProps,
} from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { Platform, Text, View, StyleSheet } from 'react-native';

import { GctsIcon, type GctsIconName } from '@/features/gcts/components/gcts-icon';
import { WorkspaceOverlays } from '@/features/gcts/components/app-page';
import { palette } from '@/features/gcts/palette';
import { useResponsiveWidth } from '@/features/gcts/hooks/use-responsive-width';
import { useAppState } from '@/features/gcts/state/app-state-context';

type AppRoute = '/' | '/bins' | '/routes' | '/resident' | '/reports' | '/settings';

type NavigationItem = {
  name: string;
  href: AppRoute;
  icon: GctsIconName;
  label: string;
};

export default function AppTabs() {
  const { role } = useAppState();
  const width = useResponsiveWidth();
  const resident = role === 'resident';
  const desktopAdmin = Platform.OS === 'web' && role === 'admin' && width >= 1100;
  const pathname = usePathname();
  const items: NavigationItem[] = [
    { name: 'overview', href: '/', icon: resident ? 'home' : 'dashboard', label: resident ? 'Services' : 'Overview' },
    { name: 'bins', href: '/bins', icon: 'bins', label: resident ? 'Public bins' : 'Bins' },
    resident
      ? { name: 'resident', href: '/resident', icon: 'report', label: 'Report issue' }
      : { name: 'routes', href: '/routes', icon: 'routes', label: 'Routes' },
  ];
  if (role === 'admin' || role === 'supervisor') {
    items.push({ name: 'reports', href: '/reports', icon: 'reports', label: 'Reports' });
  }

  return (
    <>
      <Tabs>
        <TabSlot style={styles.slot} />
        <TabList asChild>
          <CustomTabList desktopAdmin={desktopAdmin}>
            {items.map((item) => {
              const selected = pathname === item.href;
              return (
                <TabTrigger
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.tabButton,
                    role === 'admin' && styles.denseTabButton,
                    desktopAdmin && styles.desktopTabButton,
                    selected && styles.tabButtonSelected,
                    desktopAdmin && selected && styles.desktopTabButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <GctsIcon
                    name={item.icon}
                    size={19}
                    color={desktopAdmin ? '#E6F1EA' : selected ? palette.forest : palette.muted}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      role === 'admin' && styles.denseTabLabel,
                      desktopAdmin && styles.desktopTabLabel,
                      selected && styles.tabLabelSelected,
                      desktopAdmin && selected && styles.desktopTabLabelSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TabTrigger>
              );
            })}
          </CustomTabList>
        </TabList>
      </Tabs>
      <WorkspaceOverlays />
    </>
  );
}

export function CustomTabList({
  desktopAdmin,
  children,
  style,
  ...props
}: TabListProps & { desktopAdmin: boolean }) {
  return (
    <View
      {...props}
      style={[
        style,
        styles.tabListContainer,
        desktopAdmin && styles.sidebarContainer,
      ]}>
      {desktopAdmin && (
        <>
          <View style={styles.sidebarBrand}>
            <View style={styles.sidebarBrandMark}>
              <GctsIcon name="recycle" size={22} color={palette.white} />
            </View>
            <View>
              <Text style={styles.sidebarBrandName}>GCTS</Text>
              <Text style={styles.sidebarBrandLocation}>Fort Portal Tourism City</Text>
            </View>
          </View>
          <Text style={styles.sidebarSectionLabel}>CITY WORKSPACE</Text>
        </>
      )}
      <View style={[styles.innerContainer, desktopAdmin && styles.innerContainerDesktop]}>
        {children}
      </View>
      {desktopAdmin && (
        <View style={styles.sidebarFooter}>
          <Text style={styles.sidebarFooterTitle}>City operations</Text>
          <Text style={styles.sidebarFooterCopy}>Central and North Divisions</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(248, 250, 247, 0.96)',
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  sidebarContainer: {
    top: 0,
    right: undefined,
    bottom: 0,
    left: 0,
    width: 252,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 22,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    flexDirection: 'column',
    backgroundColor: palette.forest,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#285247',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 8,
    paddingBottom: 34,
  },
  sidebarBrandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#287259',
  },
  sidebarBrandName: {
    color: palette.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  sidebarBrandLocation: {
    color: '#B9CDC3',
    fontSize: 10,
    marginTop: 2,
  },
  sidebarSectionLabel: {
    color: '#A8C1B5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  innerContainer: {
    padding: 4,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 520,
    backgroundColor: palette.white,
  },
  innerContainerDesktop: {
    flex: 1,
    maxWidth: undefined,
    width: '100%',
    padding: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: 7,
    backgroundColor: 'transparent',
  },
  sidebarFooter: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#204D40',
  },
  sidebarFooterTitle: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sidebarFooterCopy: {
    color: '#B9CDC3',
    fontSize: 10,
    marginTop: 4,
  },
  tabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 80,
    paddingHorizontal: 8,
    gap: 3,
    borderRadius: 16,
  },
  tabButtonSelected: {
    backgroundColor: palette.mint,
  },
  denseTabButton: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: 3,
  },
  desktopTabButton: {
    width: '100%',
    minWidth: undefined,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 13,
    gap: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  desktopTabButtonSelected: {
    backgroundColor: '#285A4B',
    borderLeftWidth: 3,
    borderLeftColor: '#59B88C',
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  denseTabLabel: {
    fontSize: 10,
  },
  tabLabelSelected: {
    color: palette.forest,
    fontWeight: '700',
  },
  desktopTabLabel: {
    color: '#C8D8D0',
    fontSize: 13,
    textAlign: 'left',
  },
  desktopTabLabelSelected: {
    color: palette.white,
  },
  pressed: {
    opacity: 0.75,
  },
});
