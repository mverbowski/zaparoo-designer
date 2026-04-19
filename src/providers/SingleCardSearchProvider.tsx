import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import {
  INITIAL_IGDB_CACHE,
  INITIAL_STEAM_CACHE,
  SingleCardSearchContext,
  type IgdbSearchCache,
  type SteamSearchCache,
} from '../contexts/singleCardSearch';
import {
  useFileDropperContext,
  type CardData,
} from '../contexts/fileDropper';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';

const hydrateIgdbFromCard = (card: CardData): IgdbSearchCache => {
  const igdbMatch = card.matches?.igdb as SearchResult | undefined;
  if (!igdbMatch?.name) return INITIAL_IGDB_CACHE;
  return {
    ...INITIAL_IGDB_CACHE,
    searchQuery: igdbMatch.name,
    gameEntries: [igdbMatch],
  };
};

const hydrateSteamFromCard = (card: CardData): SteamSearchCache => {
  const steamMatch = card.matches?.steam as SearchResult | undefined;
  if (!steamMatch?.name) return INITIAL_STEAM_CACHE;
  const numericId = Number.parseInt(steamMatch.id, 10);
  if (!Number.isFinite(numericId)) return INITIAL_STEAM_CACHE;
  const autocompleteEntry = { id: numericId, name: steamMatch.name };
  return {
    ...INITIAL_STEAM_CACHE,
    searchQuery: steamMatch.name,
    selectedGame: autocompleteEntry,
    options: [autocompleteEntry],
    hasLoadedQuery: true,
  };
};

export const SingleCardSearchProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { editingCard } = useFileDropperContext();
  const [igdb, setIgdb] = useState<IgdbSearchCache>(INITIAL_IGDB_CACHE);
  const [steam, setSteam] = useState<SteamSearchCache>(INITIAL_STEAM_CACHE);
  const lastCardKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const currentKey = editingCard?.key ?? null;
    // Preserve cache while modal is closed so reopening the same card keeps state.
    if (currentKey === null || !editingCard) return;
    // Same card reopened — keep whatever the user had in flight.
    if (lastCardKeyRef.current === currentKey) return;

    // New card (or first card after reload) — seed caches from stored matches
    // so the search panels reflect what's already on the card.
    setIgdb(hydrateIgdbFromCard(editingCard));
    setSteam(hydrateSteamFromCard(editingCard));
    lastCardKeyRef.current = currentKey;
  }, [editingCard]);

  const value = useMemo(
    () => ({ igdb, setIgdb, steam, setSteam }),
    [igdb, steam],
  );

  return (
    <SingleCardSearchContext.Provider value={value}>
      {children}
    </SingleCardSearchContext.Provider>
  );
};
