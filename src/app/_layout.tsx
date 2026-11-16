import AppTabs from '@/components/app-tabs';
import { DemoRoleProvider } from '@/features/gcts/state/demo-role-context';

export default function TabLayout() {
  return (
    <DemoRoleProvider>
      <AppTabs />
    </DemoRoleProvider>
  );
}
