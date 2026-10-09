/** Colors for printed sheets. Black-and-white uses only black, white and grey, so meaning never depends on color. */
export interface PrintPalette {
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Table and box lines. */
  line: string;
  /** Header cells. */
  headBg: string;
  headFg: string;
  /** Header cells of Friday and Saturday. */
  weekendHead: string;
  /** Friday and Saturday columns. */
  weekend: string;
  /** Hatching on days a habit isn't scheduled. */
  offStripe: string;
  /** Light panels (stat boxes, cards). */
  soft: string;
  done: string;
  partial: string;
  freeze: string;
  /** One accent per habit, cycling; used to tell rows and boxes apart. */
  accents: readonly string[];
  isColor: boolean;
}

const BLACK_AND_WHITE: PrintPalette = {
  ink: '#000000',
  muted: '#000000',
  line: '#000000',
  headBg: '#ffffff',
  headFg: '#000000',
  weekendHead: '#e4e4e4',
  weekend: '#e4e4e4',
  offStripe: '#d0d0d0',
  soft: '#ffffff',
  done: '#000000',
  partial: '#000000',
  freeze: '#000000',
  accents: ['#000000'],
  isColor: false,
};

/** The app's Calm light tokens, every pair checked against white at 4.5:1 or better. */
const COLOR: PrintPalette = {
  ink: '#12312f',
  muted: '#4f6868',
  line: '#4f6868',
  headBg: '#2d6a9f',
  headFg: '#ffffff',
  weekendHead: '#1f5685',
  weekend: '#e6efee',
  offStripe: '#c4d6d4',
  soft: '#f2f7f6',
  done: '#2a7048',
  partial: '#2d6a9f',
  freeze: '#0b6a89',
  accents: ['#2d6a9f', '#2a7048', '#8f5200', '#6554c0', '#0b6a89', '#a5307a', '#4e5d78', '#7a4b8c'],
  isColor: true,
};

export const printPalette = (color: boolean): PrintPalette => (color ? COLOR : BLACK_AND_WHITE);

/** The accent for the n-th habit (always black in black-and-white). */
export const accentFor = (palette: PrintPalette, index: number): string => palette.accents[index % palette.accents.length] ?? palette.ink;
