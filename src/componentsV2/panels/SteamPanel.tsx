import {
  Autocomplete,
  CircularProgress,
  Tab,
  TextField,
  Tabs,
  Typography,
} from '@mui/material';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
  type SyntheticEvent,
} from 'react';
import { type Canvas } from 'fabric';
import { useInView } from 'react-intersection-observer';
import type { SearchResult } from '../../../netlify/apiProviders/types.mts';
import { useFileDropperContext } from '../../contexts/fileDropper';
import {
  useSingleCardSearchContext,
  type SteamAssetCache,
  type SteamSearchCache,
  INITIAL_STEAM_ASSET_CACHE,
} from '../../contexts/singleCardSearch';
import { PanelSection } from './PanelSection';
import {
  fetchSteamAutocomplete,
  fetchSteamGridsByGameId,
  fetchSteamLogosByGameId,
  type SteamAutocompleteGame,
} from '../../utils/search';
import {
  buildSteamSearchResult,
  crossFillIgdbFromSteam,
} from '../../utils/crossSearch';
import { SearchResultCard } from './SearchResultCard';
import { applySearchResultToCards } from './searchResultActions';
import './SteamPanel.css';
import './HardwareResourcesPanel.css';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 500;

type SteamAssetTab = 'images' | 'logos';

export default function SteamPanel({
  editingCanvasRef,
  isEditing = false,
  onSelectGame,
}: {
  editingCanvasRef?: MutableRefObject<Canvas | null>;
  isEditing?: boolean;
  onSelectGame?: () => void;
}) {
  const { addFiles, editingCard, cards, swapGameAtIndex, setMatchAtIndex } =
    useFileDropperContext();
  const { steam, setSteam, setIgdb } = useSingleCardSearchContext();
  const {
    searchQuery,
    selectedGame,
    options,
    gridState,
    logoState,
    tabValue,
    hasLoadedQuery,
    loadedGameId,
  } = steam;
  const updateSteam = useCallback(
    (patch: Partial<SteamSearchCache>) =>
      setSteam((prev) => ({ ...prev, ...patch })),
    [setSteam],
  );
  const setAssetCache = useCallback(
    (
      assetType: SteamAssetTab,
      updater: (prev: SteamAssetCache) => SteamAssetCache,
    ) =>
      setSteam((prev) => ({
        ...prev,
        [assetType === 'logos' ? 'logoState' : 'gridState']: updater(
          assetType === 'logos' ? prev.logoState : prev.gridState,
        ),
      })),
    [setSteam],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [tooltipGameId, setTooltipGameId] = useState<string | null>(null);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gridStateRef = useRef(gridState);
  const logoStateRef = useRef(logoState);
  const requestIdsRef = useRef<Record<SteamAssetTab, number>>({
    images: 0,
    logos: 0,
  });
  const { ref: loaderRef, inView } = useInView({
    threshold: 0.9,
  });

  useEffect(() => {
    gridStateRef.current = gridState;
  }, [gridState]);

  useEffect(() => {
    logoStateRef.current = logoState;
  }, [logoState]);

  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    updateSteam({ tabValue: newValue as 'images' | 'logos' });
  };

  const getAssetState = (assetType: SteamAssetTab) =>
    assetType === 'logos' ? logoStateRef.current : gridStateRef.current;

  const getAssetLoading = (assetType: SteamAssetTab) =>
    assetType === 'logos' ? isLogoLoading : isGridLoading;

  const loadAssetPage = useCallback(
    (
      assetType: SteamAssetTab,
      game: SteamAutocompleteGame,
      page: number,
      {
        reset = false,
        signal,
      }: {
        reset?: boolean;
        signal?: AbortSignal;
      } = {},
    ) => {
      const setLoading =
        assetType === 'logos' ? setIsLogoLoading : setIsGridLoading;
      const fetchAssets =
        assetType === 'logos'
          ? fetchSteamLogosByGameId
          : fetchSteamGridsByGameId;
      const requestId = requestIdsRef.current[assetType] + 1;
      requestIdsRef.current[assetType] = requestId;

      setLoading(true);
      if (reset) {
        setAssetCache(assetType, () => INITIAL_STEAM_ASSET_CACHE);
      }

      void fetchAssets(game.id, game.name, { page, signal })
        .then(({ games, count, hasMore }) => {
          if (requestIdsRef.current[assetType] !== requestId) {
            return;
          }

          setAssetCache(assetType, (prev) => ({
            entries: reset ? games : [...prev.entries, ...games],
            total: count,
            hasMore,
            page: hasMore ? page + 1 : page,
          }));
          setLoading(false);
        })
        .catch((err) => {
          if (requestIdsRef.current[assetType] !== requestId) {
            return;
          }

          if (err instanceof DOMException && err.name === 'AbortError') {
            setLoading(false);
            return;
          }

          console.error(err);
          setLoading(false);
        });
    },
    [setAssetCache],
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => setTooltipGameId(null);
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => container.removeEventListener('scroll', handleScroll);
  }, [gridState.entries.length, logoState.entries.length, tabValue]);

  useEffect(() => {
    if (deferredQuery.length < MIN_QUERY_LENGTH) {
      updateSteam({ options: [], hasLoadedQuery: false });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      void fetchSteamAutocomplete(deferredQuery, controller.signal)
        .then((results) => {
          updateSteam({ options: results, hasLoadedQuery: true });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery, updateSteam]);

  useEffect(() => {
    if (!selectedGame) {
      updateSteam({
        gridState: INITIAL_STEAM_ASSET_CACHE,
        logoState: INITIAL_STEAM_ASSET_CACHE,
        loadedGameId: null,
      });
      setTooltipGameId(null);
      return;
    }

    // Skip refetch if cache was already populated for this game (e.g. restored
    // after switching away and back to the Steam panel).
    if (loadedGameId === selectedGame.id) {
      return;
    }

    const controller = new AbortController();
    setTooltipGameId(null);
    updateSteam({ loadedGameId: selectedGame.id });
    loadAssetPage('images', selectedGame, 0, {
      reset: true,
      signal: controller.signal,
    });
    loadAssetPage('logos', selectedGame, 0, {
      reset: true,
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
    // loadedGameId is intentionally read but not a dep: mutating it inside
    // the effect would re-trigger and abort the fetch we just started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAssetPage, selectedGame, updateSteam]);

  useEffect(() => {
    if (!inView || !selectedGame) {
      return;
    }

    const assetType = tabValue === 'logos' ? 'logos' : 'images';
    const assetState = getAssetState(assetType);
    const assetLoading = getAssetLoading(assetType);

    if (!assetState.hasMore || assetLoading) {
      return;
    }

    const controller = new AbortController();
    loadAssetPage(assetType, selectedGame, assetState.page, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, loadAssetPage, selectedGame, tabValue]);

  const activeAssetState = tabValue === 'logos' ? logoState : gridState;
  const activeAssetLoading = tabValue === 'logos' ? isLogoLoading : isGridLoading;
  const visibleEntries = activeAssetState.entries;
  const isLoadingAssets = activeAssetLoading && visibleEntries.length === 0;

  const addImage = (
    e: MouseEvent<HTMLImageElement>,
    url: string,
    gridEntry: SearchResult,
  ) => {
    const target = e.target as HTMLImageElement;
    setLoadingGameId(gridEntry.id);

    // The Steam grid is only an image — the actual match is the SGDB game
    // the user picked from autocomplete. Build a SearchResult around that.
    const steamMatch = selectedGame
      ? buildSteamSearchResult(selectedGame, gridEntry.cover)
      : gridEntry;

    void applySearchResultToCards({
      addFiles,
      cards: cards.current,
      editingCard: isEditing ? editingCard : null,
      editingCanvas: editingCanvasRef?.current ?? null,
      game: steamMatch,
      source: 'steam',
      onSelectGame,
      previewSrc: target.src,
      swapGameAtIndex,
      url,
    }).finally(() => {
      setLoadingGameId(null);
    });

    // Cross-fill IGDB only if the card doesn't already have an IGDB match.
    const targetCard = isEditing
      ? editingCard
      : cards.current.find((c) => c.isSelected) ?? null;
    const hasExistingIgdbMatch = !!targetCard?.matches?.igdb;
    if (!hasExistingIgdbMatch && selectedGame) {
      void crossFillIgdbFromSteam(selectedGame.name, setIgdb)
        .then((topIgdbGame) => {
          if (!topIgdbGame || !targetCard) return;
          const idx = cards.current.indexOf(targetCard);
          if (idx === -1) return;
          setMatchAtIndex('igdb', topIgdbGame, idx);
        })
        .catch((err) => console.error(err));
    }
  };

  return (
    <PanelSection title="SteamGrid search" className="steamPanel">
      <Autocomplete
        className="steamAutocomplete"
        options={options}
        loading={isLoading}
        value={selectedGame}
        inputValue={searchQuery}
        onInputChange={(_event, value) => updateSteam({ searchQuery: value })}
        onChange={(_event, value) => updateSteam({ selectedGame: value })}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => option.name}
        noOptionsText={
          deferredQuery.length < MIN_QUERY_LENGTH
            ? 'Type at least 2 characters'
            : 'No SteamGridDB matches'
        }
        renderInput={(params) => (
          <TextField
            {...params}
            color="primary"
            className="textField"
            size="small"
            autoComplete="off"
            label="SteamGridDB game"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? (
                      <CircularProgress color="secondary" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { ...optionProps } = props;
          return (
            <li {...optionProps} key={option.id}>
              <Typography color="secondary">{option.name}</Typography>
            </li>
          );
        }}
      />
      <div className="horizontalStack tabs steamTabs">
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Images" value="images" />
          <Tab label="Logos" value="logos" />
        </Tabs>
      </div>
      {isLoadingAssets && (
        <div className="steamLoading">
          <CircularProgress color="secondary" size={24} />
        </div>
      )}
      {!isLoadingAssets && visibleEntries.length > 0 && (
        <div
          className="searchResultsContainer horizontalStack"
          ref={scrollContainerRef}
        >
          {visibleEntries.map((gameEntry) => (
            <SearchResultCard
              key={`steam-${tabValue}-${gameEntry.id}`}
              description={gameEntry.summary}
              gameEntry={gameEntry}
              source="steam"
              imgSource={gameEntry.cover}
              addImage={addImage}
              loading={loadingGameId === gameEntry.id}
              tooltipOpen={tooltipGameId === gameEntry.id}
              onTooltipOpen={() => setTooltipGameId(gameEntry.id)}
              onTooltipClose={() => setTooltipGameId(null)}
            />
          ))}
          {activeAssetState.hasMore && (
            <div className="loader" ref={loaderRef}>
              <CircularProgress color="secondary" size={24} />
            </div>
          )}
        </div>
      )}
      {!isLoadingAssets && selectedGame && visibleEntries.length === 0 && (
        <Typography
          variant="body2"
          color="secondary"
          className="steamSelectedGame"
        >
          No {tabValue === 'logos' ? 'logos' : 'images'} found for this game.
        </Typography>
      )}
      {!selectedGame && hasLoadedQuery && options.length > 0 && (
        <Typography
          variant="body2"
          color="secondary"
          className="steamSelectedGame"
        >
          Pick a SteamGridDB match from the dropdown.
        </Typography>
      )}
    </PanelSection>
  );
}
