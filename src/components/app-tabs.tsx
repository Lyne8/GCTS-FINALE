import { NativeTabs } from 'expo-router/native-tabs';

import { WorkspaceOverlays } from '@/features/gcts/components/app-page';
import { useAppRole } from '@/features/gcts/state/demo-role-context';

export default function AppTabs() {
  const { role } = useAppRole();
  const resident = role === 'resident';

  return (
    <>
      <NativeTabs backgroundColor="#FFFFFF" indicatorColor="#E6F0EA">
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            md={resident ? 'home' : 'dashboard'}
            sf={resident ? 'house.fill' : 'square.grid.2x2.fill'}
          />
          <NativeTabs.Trigger.Label>{resident ? 'Services' : 'Overview'}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="bins">
          <NativeTabs.Trigger.Icon md="delete" sf="trash.fill" />
          <NativeTabs.Trigger.Label>{resident ? 'Public bins' : 'Bins'}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        {resident ? (
          <NativeTabs.Trigger name="resident">
            <NativeTabs.Trigger.Icon md="report_problem" sf="exclamationmark.bubble.fill" />
            <NativeTabs.Trigger.Label>Report issue</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ) : (
          <NativeTabs.Trigger name="routes">
            <NativeTabs.Trigger.Icon
              md="route"
              sf="arrow.triangle.turn.up.right.diamond.fill"
            />
            <NativeTabs.Trigger.Label>Routes</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        {!resident && (role === 'admin' || role === 'supervisor') && (
          <NativeTabs.Trigger name="reports">
            <NativeTabs.Trigger.Icon md="assignment" sf="doc.text.fill" />
            <NativeTabs.Trigger.Label>Reports</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        )}

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon md="settings" sf="gearshape.fill" />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <WorkspaceOverlays />
    </>
  );
}
