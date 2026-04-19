import type { MutableRefObject, SetStateAction } from 'react';
import { createContext, useContext } from 'react';
import type { StaticCanvas } from 'fabric';
import type { templateTypeV2 } from '../resourcesTypedef';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';

export type PossibleFile = File | HTMLImageElement | null;

/* Match source identifier; add new source keys here as we integrate more databases. */
export type MatchSource = 'igdb' | 'steam';
export type CardMatches = Partial<Record<MatchSource, SearchResult>>;

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
});

export const useFileDropperContext = () => useContext(FileDropContext);
