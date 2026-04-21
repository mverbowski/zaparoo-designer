import type { Dispatch, SetStateAction } from 'react';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';
import type {
  IgdbSearchCache,
  SteamSearchCache,
} from '../contexts/singleCardSearch';
import { INITIAL_STEAM_ASSET_CACHE } from '../contexts/singleCardSearch';
import {
  fetchGameList,
  fetchSteamAutocomplete,
  type SteamAutocompleteGame,
} from './search';

/**
 * Fire a Steam autocomplete using the picked game's name and populate the
 * SingleCardSearch Steam slice so the tab is ready when the user switches.
 * Top result is auto-selected as the provisional match; user can override.
 */
export const crossFillSteamFromIgdb = (
  game: SearchResult,
  setSteam: Dispatch<SetStateAction<SteamSearchCache>>,
  signal?: AbortSignal,
): Promise<SteamAutocompleteGame | null> => {
  const query = game.name?.trim();
  if (!query) return Promise.resolve(null);

  setSteam((prev) => ({ ...prev, searchQuery: query, hasLoadedQuery: false }));

  return fetchSteamAutocomplete(query, signal).then((options) => {
    const top = options[0] ?? null;
    setSteam((prev) => ({
      ...prev,
      options,
      hasLoadedQuery: true,
      // only auto-select if the user hasn't already picked Steam themselves
      selectedGame: prev.selectedGame ?? top,
      // reset paging caches when provisional game changes
      gridState:
        prev.selectedGame || !top ? prev.gridState : INITIAL_STEAM_ASSET_CACHE,
      logoState:
        prev.selectedGame || !top ? prev.logoState : INITIAL_STEAM_ASSET_CACHE,
      loadedGameId: prev.selectedGame ? prev.loadedGameId : null,
    }));
    return top;
  });
};

/**
 * Fire an IGDB search using the picked Steam game's name and populate the
 * SingleCardSearch IGDB slice so the tab is ready when the user switches.
 * Returns the top IGDB result or null.
 */
export const crossFillIgdbFromSteam = (
  gameName: string,
  setIgdb: Dispatch<SetStateAction<IgdbSearchCache>>,
): Promise<SearchResult | null> => {
  const query = gameName.trim();
  if (!query) return Promise.resolve(null);

  setIgdb((prev) => ({ ...prev, searchQuery: query, page: 1 }));

  return fetchGameList(
    query,
    { id: 0, name: 'All', abbreviation: 'All' },
    '1',
    false,
  ).then(({ games, hasMore }) => {
    setIgdb((prev) => ({
      ...prev,
      gameEntries: games,
      page: hasMore ? 2 : 1,
      hasMore,
    }));
    return games[0] ?? null;
  });
};

/**
 * Build a SearchResult-shaped object for a Steam match given the SGDB game +
 * the currently picked cover image. Used both as the canvas `game` metadata
 * and as `card.matches.steam`.
 */
export const buildSteamSearchResult = (
  steamGame: SteamAutocompleteGame,
  cover: SearchResult['cover'] | undefined,
): SearchResult => ({
  id: `${steamGame.id}`,
  name: steamGame.name,
  storyline: '',
  summary: '',
  artworks: cover ? [cover] : [],
  screenshots: [],
  cover: cover ?? {
    url: '',
    thumb: '',
    width: 0,
    height: 0,
    image_id: 'none',
    id: 0,
  },
  platforms: [],
  involved_companies: [],
  extra_images: 0,
});
