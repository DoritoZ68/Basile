import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    // Sur iOS 26, pas de couleur de fond : la barre reste en Liquid Glass et se réduit au défilement.
    <NativeTabs
      backgroundColor={Platform.OS === 'android' ? colors.background : undefined}
      minimizeBehavior="onScrollDown"
      indicatorColor={colors.backgroundSelected}
      tintColor={colors.accent}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Focus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="timer" md="timer" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="taches">
        <NativeTabs.Trigger.Label>Tâches</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="fiches">
        <NativeTabs.Trigger.Label>Fiches</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="rectangle.on.rectangle.angled" md="style" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matieres">
        <NativeTabs.Trigger.Label>Matières</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical.fill" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="examens">
        <NativeTabs.Trigger.Label>Examens</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="methodes">
        <NativeTabs.Trigger.Label>Méthodes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="lightbulb" md="lightbulb" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
