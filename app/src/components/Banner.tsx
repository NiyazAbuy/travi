import { Image } from 'expo-image';
import { useId, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { tornEdgePath } from '@/lib/tornEdge';
import { colors, listLayout, paperEdge, shadow, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useLayoutSize } from './PaperShape';
import { Sprig } from './Sprig';

/** Поле вокруг картины внутри SVG — под тень, px. */
const PAD = 10;

export interface BannerProps {
  /** Картина (`BANNER.source`). */
  source: number;
  /** Надпись на картине. */
  title: string;
  /** Описание картины для экранного диктора. */
  accessibilityLabel: string;
  onPress: () => void;
  /** Ключ рваного края. */
  seed: string;
}

/**
 * Баннер-картина главной (макет 02): картина с рваным краем и мягкой тенью, надпись — на светлом небе
 * со «сиянием» бумаги под ней (тёмный текст читается на любом месте картины) и веточками-украшением.
 * Край — бумажная «маска»: полоса цвета фона между прямоугольником картины и рваным контуром.
 */
export function Banner({ source, title, accessibilityLabel, onPress, seed }: BannerProps) {
  const { size, onLayout } = useLayoutSize();
  // id для clipPath в SVG: только буквы и цифры (у useId есть двоеточия)
  const clipId = `banner${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shape = useMemo(
    () =>
      size
        ? tornEdgePath(seed, size.width, size.height, {
            depth: paperEdge.banner.depth,
            radius: paperEdge.banner.radius,
            offset: PAD,
          })
        : null,
    [seed, size],
  );

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${accessibilityLabel}`}
      style={({ pressed }) => ({ aspectRatio: 1 / listLayout.bannerRatio, opacity: pressed ? 0.85 : 1 })}
    >
      <Image source={source} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />

      {size && shape ? (
        <>
          {/* сияние бумаги под надписью — у верхнего края, где на картине светлое небо */}
          <Svg width={size.width} height={size.height} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <RadialGradient id={`${clipId}glow`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={colors.background} stopOpacity={listLayout.bannerGlow} />
                <Stop offset="0.6" stopColor={colors.background} stopOpacity={listLayout.bannerGlow * 0.6} />
                <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={size.width / 2}
              cy={size.height * 0.24}
              rx={size.width * 0.5}
              ry={size.height * 0.3}
              fill={`url(#${clipId}glow)`}
            />
          </Svg>

          {/* рваный край: вне контура — бумага фона и тень, по контуру — светлая кромка */}
          <View
            style={{ position: 'absolute', left: -PAD, top: -PAD, width: size.width + PAD * 2, height: size.height + PAD * 2, pointerEvents: 'none' }}
          >
            <Svg width={size.width + PAD * 2} height={size.height + PAD * 2}>
              <Defs>
                <ClipPath id={clipId}>
                  <Path
                    d={`M0 0H${size.width + PAD * 2}V${size.height + PAD * 2}H0Z${shape}`}
                    clipRule="evenodd"
                  />
                </ClipPath>
              </Defs>
              <G clipPath={`url(#${clipId})`}>
                <Rect x={PAD} y={PAD} width={size.width} height={size.height} fill={colors.background} />
                <G transform={`translate(0 ${shadow.paper.offsetY * 1.5})`}>
                  <Path
                    d={shape}
                    fill={shadow.paper.color}
                    fillOpacity={shadow.paper.opacity / 2}
                    stroke={shadow.paper.color}
                    strokeOpacity={shadow.paper.opacity / 2}
                    strokeWidth={shadow.paper.blur}
                    strokeLinejoin="round"
                  />
                </G>
                <G transform={`translate(0 ${shadow.paper.offsetY})`}>
                  <Path d={shape} fill={shadow.paper.color} fillOpacity={shadow.paper.opacity} />
                </G>
              </G>
              <Path d={shape} fill="none" stroke={colors.cardEdge} strokeWidth={2} strokeLinejoin="round" />
            </Svg>
          </View>
        </>
      ) : null}

      {/* position: relative — на вебе, чтобы надпись была над слоями SVG, а не под ними */}
      <View style={{ position: 'relative', alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.lg }}>
        <AppText variant="section" numberOfLines={2} style={{ textAlign: 'center' }}>
          {title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }} importantForAccessibility="no-hide-descendants">
          <Sprig width={listLayout.titleSprig} color={colors.ink} flip />
          <Icon name="leaf" size={spacing.lg} color={colors.ink} />
          <Sprig width={listLayout.titleSprig} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}
