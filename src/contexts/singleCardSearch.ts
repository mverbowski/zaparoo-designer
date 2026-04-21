import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';
import type { SteamAutocompleteGame } from '../utils/search';

export type SteamAssetCache = {
  entries: SearchResult[];
  page: number;
  total: number;
  hasMore: boolean;
};

export type IgdbSearchCache = {
  searchQuery: string;
  gameEntries: SearchResult[];
  page: number;
  hasMore: boolean;
  isRomHacks: boolean;
};

export type SteamSearchCache = {
  searchQuery: string;
  selectedGame: SteamAutocompleteGame | null;
  options: SteamAutocompleteGame[];
  gridState: SteamAssetCache;
  logoState: SteamAssetCache;
  tabValue: 'images' | 'logos';
  hasLoadedQuery: boolean;
  loadedGameId: number | null;
};

export const INITIAL_STEAM_ASSET_CACHE: SteamAssetCache = {
  entries: [],
  page: 1,
  total: 0,
  hasMore: false,
};

export const INITIAL_IGDB_CACHE: IgdbSearchCache = {
  searchQuery: '',
  gameEntries: [],
  page: 1,
  hasMore: false,
  isRomHacks: true,
};

export const INITIAL_STEAM_CACHE: SteamSearchCache = {
  searchQuery: '',
  selectedGame: null,
  options: [],
  gridState: INITIAL_STEAM_ASSET_CACHE,
  logoState: INITIAL_STEAM_ASSET_CACHE,
  tabValue: 'images',
  hasLoadedQuery: false,
  loadedGameId: null,
};

export type SingleCardSearchContextType = {
  igdb: IgdbSearchCache;
  setIgdb: Dispatch<SetStateAction<IgdbSearchCache>>;
  steam: SteamSearchCache;
  setSteam: Dispatch<SetStateAction<SteamSearchCache>>;
};

export const SingleCardSearchContext =
  createContext<SingleCardSearchContextType>({
    igdb: INITIAL_IGDB_CACHE,
    setIgdb: () => {},
    steam: INITIAL_STEAM_CACHE,
    setSteam: () => {},
  });

export const useSingleCardSearchContext = () =>
  useContext(SingleCardSearchContext);
