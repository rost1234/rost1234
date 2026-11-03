import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

const PAPER = require('../../assets/textures/paper.png');
const PAPER_VIGNETTE = require('../../assets/textures/paper-vignette.png');
const CHALK = require('../../assets/textures/chalk.png');
const CHALK_SMUDGE = require('../../assets/textures/chalk-smudge.png');

/** Where the binder holes sit, as fractions of the page height. */
const HOLES = [0.14, 0.38, 0.62, 0.86];

/**
 * The page behind a screen: ruled notebook paper with a red margin, binder
 * holes and pencil doodles in the margins (paper), or a smudged chalkboard with
 * half-erased formulas (chalk). Nothing in the classic look. Purely decorative;
 * put it first in a screen's root view so the content draws over it.
 */
export function Backdrop() {
  const { look, colors } = useTheme();
  if (look === 'classic') return null;
  const paper = look === 'paper';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={paper ? PAPER : CHALK} resizeMode="repeat" style={styles.fill} />
      <Image source={paper ? PAPER_VIGNETTE : CHALK_SMUDGE} resizeMode="stretch" style={styles.fill} />
      {paper ? (
        <>
          <View style={styles.margin} />
          {HOLES.map((at) => (
            <View key={at} style={[styles.hole, { top: `${at * 100}%`, backgroundColor: colors.chrome }]} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  margin: { position: 'absolute', top: 0, bottom: 0, left: 30, width: 1.5, backgroundColor: 'rgba(196,72,60,0.45)' },
  // A punched hole: the darker page beneath, with an inner shadow on its top edge.
  hole: {
    position: 'absolute',
    left: 8,
    width: 13,
    height: 13,
    borderRadius: 7,
    boxShadow: 'inset 1px 2px 2px rgba(60,40,15,0.45)',
  },
});
