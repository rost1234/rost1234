import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

const PAPER = require('../../assets/textures/paper.png');
const PAPER_VIGNETTE = require('../../assets/textures/paper-vignette.png');
const CHALK = require('../../assets/textures/chalk.png');
const CHALK_SMUDGE = require('../../assets/textures/chalk-smudge.png');

/**
 * The page behind a screen: ruled notebook paper with a red margin (light) or
 * a smudged chalkboard (dark). Purely decorative; put it first in a screen's
 * root view so the content draws over it.
 */
export function Backdrop() {
  const { texture } = useTheme();
  const paper = texture === 'paper';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={paper ? PAPER : CHALK} resizeMode="repeat" style={styles.fill} />
      <Image source={paper ? PAPER_VIGNETTE : CHALK_SMUDGE} resizeMode="stretch" style={styles.fill} />
      {paper ? <View style={styles.margin} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  margin: { position: 'absolute', top: 0, bottom: 0, left: 30, width: 1.5, backgroundColor: 'rgba(196,72,60,0.45)' },
});
