import {
  Button,
  TextField,
  Typography,
  Checkbox,
  CircularProgress,
} from '@mui/material';

import {
  useState,
  type MouseEvent,
  useTransition,
  useEffect,
  useRef,
  Fragment,
  useCallback,
  type MutableRefObject,
} from 'react';
import { useFileDropperContext } from '../../contexts/fileDropper';
import {
  useSingleCardSearchContext,
  type IgdbSearchCache,
} from '../../contexts/singleCardSearch';
import {
  buildSteamSearchResult,
  crossFillSteamFromIgdb,
} from '../../utils/crossSearch';

import { boxShadow } from '../../constants';
import { useInView } from 'react-intersection-observer';

import './SearchPanel.css';
import { fetchGameList } from '../../utils/search';
import { PlatformResult } from '../../../netlify/apiProviders/types.mts';
// import { PlatformDropdown } from './PlatformDropdown';
import type { SearchResult } from '../../../netlify/apiProviders/types.mts';
import { PanelSection } from './PanelSection';
import SearchIcon from '@mui/icons-material/Search';
import { SearchResultCard } from './SearchResultCard';
import { applySearchResultToCards } from './searchResultActions';
import { type Canvas } from 'fabric';

export default function ImageSearchPanel({
  editingCanvasRef,
  isEditing = false,
  onSelectGame,
}: {
  editingCanvasRef?: MutableRefObject<Canvas | null>;
  isEditing: boolean;
  onSelectGame?: () => void;
}) {
  const { addFiles, editingCard, cards, swapGameAtIndex, setMatchAtIndex } =
    useFileDropperContext();
  const { igdb, setIgdb, setSteam } = useSingleCardSearchContext();
  const { searchQuery, gameEntries, page, hasMore, isRomHacks } = igdb;
  const updateIgdb = useCallback(
    (patch: Partial<IgdbSearchCache>) =>
      setIgdb((prev) => ({ ...prev, ...patch })),
    [setIgdb],
  );
  const [searching, setSearching] = useState<boolean>(false);
  const [platform] = useState<PlatformResult>({
    id: 0,
    name: 'All',
    abbreviation: 'All',
  });
  const [openGameId] = useState<SearchResult['id']>('0');
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [tooltipGameId, setTooltipGameId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timerRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const SEARCH_THROTTLING = 1000;

  const { ref, inView } = useInView({
    /* Optional options */
    threshold: 0.9,
  });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => setTooltipGameId(null);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.getElementById(`sub-${openGameId}`)?.scrollIntoView(true);
  }, [openGameId]);

  useEffect(() => {
    updateIgdb({ page: 1, hasMore: false });
  }, [platform, isRomHacks, updateIgdb]);

  const addImage = useCallback(
    (e: MouseEvent<HTMLImageElement>, url: string, game: SearchResult) => {
      const target = e.target as HTMLImageElement;
      setLoadingGameId(game.id);
      void applySearchResultToCards({
        addFiles,
        cards: cards.current,
        editingCard: isEditing ? editingCard : null,
        editingCanvas: editingCanvasRef?.current ?? null,
        game,
        source: 'igdb',
        onSelectGame,
        previewSrc: target.src,
        scheduleAddFiles: startTransition,
        swapGameAtIndex,
        url,
      }).finally(() => {
        setLoadingGameId(null);
      });

      // Cross-fill Steam only if the card doesn't already have a Steam match.
      const targetCard = isEditing
        ? editingCard
        : cards.current.find((c) => c.isSelected) ?? null;
      const hasExistingSteamMatch = !!targetCard?.matches?.steam;
      if (!hasExistingSteamMatch) {
        void crossFillSteamFromIgdb(game, setSteam)
          .then((topSteamGame) => {
            if (!topSteamGame || !targetCard) return;
            const idx = cards.current.indexOf(targetCard);
            if (idx === -1) return;
            // provisional Steam match: game identity only, no cover yet
            setMatchAtIndex(
              'steam',
              buildSteamSearchResult(topSteamGame, targetCard.game?.cover),
              idx,
            );
          })
          .catch((err) => console.error(err));
      }
    },
    [
      addFiles,
      isEditing,
      editingCard,
      cards,
      swapGameAtIndex,
      setMatchAtIndex,
      setSteam,
      onSelectGame,
      editingCanvasRef,
    ],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeSearchWithReset = (e: any) => {
    e.preventDefault();
    updateIgdb({ page: 1 });
    setSearching(true);
    executeSearch(searchQuery, 1, platform, isRomHacks, false);
  };

  const executeSearch = (
    searchQuery: string,
    page: number,
    platform: PlatformResult,
    isRomHacks: boolean,
    queueResults: boolean = true,
  ) => {
    const now = performance.now();
    if (timerRef.current > now - SEARCH_THROTTLING) {
      return;
    }
    timerRef.current = now;
    fetchGameList(searchQuery, platform, page.toString(), isRomHacks)
      .then(({ games, hasMore }) => {
        setIgdb((prev) => ({
          ...prev,
          gameEntries: queueResults
            ? [...prev.gameEntries, ...games]
            : games,
          page: hasMore ? page + 1 : prev.page,
          hasMore,
        }));
        setSearching(false);
      })
      .catch((e) => {
        console.log(e);
      });
  };

  useEffect(() => {
    if (inView) {
      executeSearch(searchQuery, page, platform, isRomHacks, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  // const disclaimer = (
  //   <div className="horizontalStack disclaimer" key="disclaimer">
  //     <Typography color="secondary">
  //       Search results and images provided by{' '}
  //       <a href="https://www.igdb.com/" target="_blank">
  //         IGDB
  //       </a>
  //     </Typography>
  //   </div>
  // );

  return (
    <PanelSection title="Search" className="searchPanel">
      <div className="horizontalStack searchHeader" key="search-header">
        <TextField
          color="primary"
          className="textField"
          size="small"
          autoComplete="off"
          label="Game name"
          value={searchQuery}
          onChange={(evt) => updateIgdb({ searchQuery: evt.target.value })}
          style={{ fontWeight: 400, fontSize: 14 }}
          onKeyDown={(e: React.KeyboardEvent) => {
            e.key === 'Enter' && executeSearchWithReset(e);
          }}
        />
        <Button
          variant="contained"
          size="small"
          sx={{
            boxShadow,
            fontSize: '0.9375rem',
            height: '44px',
            minWidth: '44px',
          }}
          onClick={executeSearchWithReset}
        >
          {searching ? (
            <CircularProgress color="secondary" size={24} />
          ) : (
            <SearchIcon width="24" height="24" />
          )}
        </Button>
      </div>
      <div className="horizontalStack">
        {/* <PlatformDropdown setPlatform={setPlatform} platform={platform} /> */}
        <Typography display="flex" alignItems="center" color="secondary">
          <Checkbox
            color="secondary"
            checked={isRomHacks}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              const isSelectedCheckbox = (e.target as HTMLInputElement).checked;
              updateIgdb({ isRomHacks: isSelectedCheckbox });
            }}
          />
          Fanmade
        </Typography>
      </div>
      <div
        className="searchResultsContainer horizontalStack"
        key="container"
        ref={scrollContainerRef}
      >
        {gameEntries.map((gameEntry: SearchResult) => (
          <Fragment key={`game-${gameEntry.id}`}>
            {gameEntry.id !== openGameId && (
              <SearchResultCard
                description={`${gameEntry.name} - ${gameEntry.platforms
                  ?.map((p) => p.abbreviation)
                  .join(', ')}`}
                gameEntry={gameEntry}
                source="igdb"
                imgSource={gameEntry.cover}
                addImage={addImage}
                loading={loadingGameId === gameEntry.id}
                tooltipOpen={tooltipGameId === gameEntry.id}
                onTooltipOpen={() => setTooltipGameId(gameEntry.id)}
                onTooltipClose={() => setTooltipGameId(null)}
              >
                <Typography variant="h6" color="secondary">
                  + {gameEntry.extra_images} images
                </Typography>
              </SearchResultCard>
            )}
          </Fragment>
        ))}
        {hasMore && (
          <div className="loader" ref={ref}>
            <CircularProgress color="secondary" size={24} />
          </div>
        )}
      </div>
    </PanelSection>
  );
}
