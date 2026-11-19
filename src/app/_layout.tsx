import AppTabs from '@/components/app-tabs';
import { AppStateProvider } from '@/features/gcts/state/app-state-context';

export default function TabLayout() {
  return (
    <AppStateProvider>
      <AppTabs />
    </AppStateProvider>
  );
}
