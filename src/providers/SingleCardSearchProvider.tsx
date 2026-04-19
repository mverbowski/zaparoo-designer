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
import { useFileDropperContext } from '../contexts/fileDropper';

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
    if (currentKey === null) return;
    if (
      lastCardKeyRef.current !== null &&
      lastCardKeyRef.current !== currentKey
    ) {
      setIgdb(INITIAL_IGDB_CACHE);
      setSteam(INITIAL_STEAM_CACHE);
    }
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
