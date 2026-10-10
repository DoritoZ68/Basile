import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const LIQUID_GLASS = isLiquidGlassAvailable();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Teinte du verre (bouton principal, puce sélectionnée…). */
  tint?: ColorValue;
  /** Réagit au toucher (reflet natif d'iOS 26). */
  interactive?: boolean;
  /** `clear` : verre plus transparent, pour les éléments posés sur un contenu riche. */
  variant?: 'regular' | 'clear';
};

/**
 * Liquid Glass d'iOS 26 quand il est disponible ; ailleurs (iOS plus ancien, Android, web),
 * un verre dépoli : fond translucide, flou d'arrière-plan sur le web et liseré lumineux.
 *
 * Ne jamais mettre d'`opacity` sur ce composant ni sur ses parents : le verre natif ne
 * s'afficherait plus.
 */
export function Glass({ children, style, tint, interactive, variant = 'regular' }: Props) {
  const theme = useTheme();

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle={variant}
        tintColor={tint}
        isInteractive={interactive}
        style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: tint ?? theme.glass,
          borderColor: tint ? 'rgba(255,255,255,0.28)' : theme.glassEdge,
          borderWidth: 1,
          boxShadow: '0 8px 24px rgba(20, 30, 25, 0.10)',
        },
        Platform.OS === 'web' && webBlur,
        style,
      ]}>
      {children}
    </View>
  );
}

// `backdropFilter` n'existe que sur le web : on le passe tel quel à react-native-web.
const webBlur = { backdropFilter: 'blur(22px) saturate(170%)' } as unknown as ViewStyle;
