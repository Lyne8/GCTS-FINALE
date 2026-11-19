import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { palette } from '@/features/gcts/palette';

const symbols = {
  dashboard: { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  bins: { ios: 'trash.fill', android: 'delete', web: 'delete' },
  routes: {
    ios: 'arrow.triangle.turn.up.right.diamond.fill',
    android: 'route',
    web: 'route',
  },
  report: {
    ios: 'exclamationmark.bubble.fill',
    android: 'report_problem',
    web: 'report_problem',
  },
  recycle: { ios: 'arrow.3.trianglepath', android: 'recycling', web: 'recycling' },
  priority: {
    ios: 'exclamationmark.triangle.fill',
    android: 'report_problem',
    web: 'report_problem',
  },
  nearlyFull: {
    ios: 'circle.lefthalf.filled',
    android: 'donut_large',
    web: 'donut_large',
  },
  available: {
    ios: 'checkmark.circle.fill',
    android: 'check_circle',
    web: 'check_circle',
  },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  schedule: { ios: 'calendar', android: 'schedule', web: 'schedule' },
  notice: { ios: 'megaphone.fill', android: 'campaign', web: 'campaign' },
  notifications: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  reports: { ios: 'doc.text.fill', android: 'assignment', web: 'assignment' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  more: { ios: 'ellipsis', android: 'more_vert', web: 'more_vert' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type GctsIconName = keyof typeof symbols;

type GctsIconProps = {
  name: GctsIconName;
  size?: number;
  color?: string;
};

export function GctsIcon({ name, size = 20, color = palette.forest }: GctsIconProps) {
  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color}
      accessible={false}
    />
  );
}
