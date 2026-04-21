import type { MutableRefObject, SetStateAction } from 'react';
import { createContext, useContext } from 'react';
import type { StaticCanvas } from 'fabric';
import type { templateTypeV2 } from '../resourcesTypedef';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';
import type { UserFont } from '../utils/userFonts';

export type PossibleFile = File | HTMLImageElement | null;

/* Match source identifier; add new source keys here as we integrate more databases. */
export type MatchSource = 'igdb' | 'steam';
export type CardMatches = Partial<Record<MatchSource, SearchResult>>;

export type GuideOrientation = 'horizontal' | 'vertical';

export type Guide = {
  id: string;
  orientation: GuideOrientation;
  /* position in canvas base coords (pre-zoom) */
  position: number;
};

export type GridSettings = {
  enabled: boolean;
  /* spacing between minor lines in canvas base coords */
  spacing: number;
  /* number of minor subdivisions between major lines */
  subdivisions: number;
  showGuides: boolean;
  guides: Guide[];
  snapEnabled: boolean;
  /* snap tolerance in canvas base coords — zone in which a drag will latch */
  snapTolerance: number;
  /* line color applied to minor + major grid lines, hex (#rrggbb) */
  gridColor: string;
  /* 0..1 opacity applied to minor lines; major lines scale up */
  gridOpacity: number;
  /* line color for user guide lines, hex */
  guideColor: string;
  /* 0..1 opacity for guide lines */
  guideOpacity: number;
  /* snap rotation to a fixed angle increment while rotating an object */
  rotationSnapEnabled: boolean;
  /* angle step in degrees (e.g. 15, 45, 90) */
  rotationSnapIncrement: number;
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  enabled: false,
  spacing: 32,
  subdivisions: 4,
  showGuides: true,
  guides: [],
  snapEnabled: true,
  snapTolerance: 8,
  gridColor: '#ffffff',
  gridOpacity: 0.35,
  guideColor: '#53d6ff',
  guideOpacity: 0.9,
  rotationSnapEnabled: false,
  rotationSnapIncrement: 15,
};

export type CardData = {
  /* the source of the main image */
  file: PossibleFile;
  game: Partial<SearchResult>;
  /* All known matches for this card, keyed by source. Each is optional. */
  matches: CardMatches;
  /* Which source provided the image currently applied to the canvas. */
  primarySource?: MatchSource;
  canvas?: StaticCanvas;
  /* serialized canvas JSON, used to restore canvas state on load */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasJSON?: Record<string, any>;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasViewportTransform?: number[];
  template?: templateTypeV2;
  isSelected: boolean;
  colors: string[];
  originalColors: string[];
  key: string;
  gridSettings?: GridSettings;
};

export type contextType = {
  files: PossibleFile[];
  addFiles: (files: PossibleFile[], games?: SearchResult[]) => void;
  setFiles: (files: PossibleFile[]) => void;
  cards: MutableRefObject<CardData[]>;
  removeCards: () => void;
  deleteCardByIndex: (index: number) => void;
  duplicateCardByIndex: (index: number) => void;
  selectedCardsCount: number;
  setSelectedCardsCount: (value: SetStateAction<number>) => void;
  editingCard: CardData | null;
  setEditingCard: (index: number) => void;
  swapGameAtIndex: (
    file: PossibleFile,
    game: SearchResult,
    index: number,
    source: MatchSource,
  ) => void;
  /* Update only a card's match for a given source (no file/image change). */
  setMatchAtIndex: (
    source: MatchSource,
    game: SearchResult,
    index: number,
  ) => void;
  saveSession: () => void;
  loadSession: () => Promise<void>;
  userFonts: UserFont[];
  addUserFont: (file: File) => Promise<UserFont>;
};

export const FileDropContext = createContext<contextType>({
  files: [],
  cards: {
    current: [],
  },
  addFiles: () => {},
  setFiles: () => {},
  removeCards: () => {},
  deleteCardByIndex: () => {},
  duplicateCardByIndex: () => {},
  selectedCardsCount: 0,
  setSelectedCardsCount: () => {},
  editingCard: null,
  setEditingCard: () => {},
  swapGameAtIndex: () => {},
  setMatchAtIndex: () => {},
  saveSession: () => {},
  loadSession: async () => {},
  userFonts: [],
  addUserFont: async () => {
    throw new Error('addUserFont not provided');
  },
});

export const useFileDropperContext = () => useContext(FileDropContext);
