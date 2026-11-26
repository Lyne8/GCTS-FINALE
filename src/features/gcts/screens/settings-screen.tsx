import { AppPage } from '@/features/gcts/components/app-page';
import { SettingsContent } from '@/features/gcts/components/settings-content';

export { SettingsContent };

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
