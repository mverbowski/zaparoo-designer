import {
  useEffect,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import {
  Chip,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { type Canvas } from 'fabric';
import type { CardData, MatchSource } from '../../contexts/fileDropper';
import type { SearchResult } from '../../../netlify/apiProviders/types.mts';
import { PanelSection } from './PanelSection';
import { ImagePanelDisplay } from './ImagePanelDisplay';
import { NoGameData, SuggestClick } from './RequireEditing';
import { IgdbSourceIcon, SteamGridDbSourceIcon } from '../SourceIcons';
import './GameResourcesPanel.css';

type Props = {
  canvasRef: MutableRefObject<Canvas | null>;
  card?: CardData | null;
};

const SOURCE_LABEL: Record<MatchSource, string> = {
  igdb: 'IGDB',
  steam: 'SteamGridDB',
};

const renderSourceIcon = (source: MatchSource) =>
  source === 'igdb' ? (
    <IgdbSourceIcon fontSize="small" />
  ) : (
    <SteamGridDbSourceIcon fontSize="small" />
  );

const buildSourceUrl = (
  source: MatchSource,
  match: SearchResult,
): string | null => {
  if (source === 'igdb') {
    return match.slug ? `https://www.igdb.com/games/${match.slug}` : null;
  }
  if (source === 'steam') {
    const numericId = Number.parseInt(match.id, 10);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    return `https://www.steamgriddb.com/game/${numericId}`;
  }
  return null;
};

const hasAssets = (match: SearchResult): boolean =>
  !!(
    match.cover?.url ||
    match.artworks?.length ||
    match.screenshots?.length ||
    match.platforms?.length ||
    match.involved_companies?.length
  );

export function GameResourcesPanel({ canvasRef, card }: Props) {
  const matches = card?.matches ?? {};
  const availableSources = (Object.keys(matches) as MatchSource[]).filter(
    (src) => matches[src]?.name,
  );
  const primarySource = card?.primarySource;
  const defaultSource =
    primarySource && matches[primarySource]
      ? primarySource
      : availableSources[0];

  const [selectedSource, setSelectedSource] = useState<MatchSource | undefined>(
    defaultSource,
  );

  useEffect(() => {
    setSelectedSource(defaultSource);
  }, [card?.key, defaultSource]);

  const match = selectedSource ? matches[selectedSource] : undefined;
  const sourceUrl =
    selectedSource && match ? buildSourceUrl(selectedSource, match) : null;

  if (!card || availableSources.length === 0 || !match || !selectedSource) {
    return (
      <PanelSection title="Game info" className="gameResourcesPanel">
        <NoGameData />
      </PanelSection>
    );
  }

  const isPrimary = primarySource === selectedSource;

  const sections: ReactNode[] = [];
  if (match.cover?.url) {
    sections.push(
      <PanelSection key="cover" title="Cover" className="panelSectionFlush">
        <div className="gameResourcesCover">
          <ImagePanelDisplay canvasRef={canvasRef} imageResult={match.cover} />
        </div>
      </PanelSection>,
    );
  }
  if (match.artworks?.length) {
    sections.push(
      <PanelSection
        key="artworks"
        title="Artwork"
        className="panelSectionFlush"
      >
        <div className="resourceListAreaLogos">
          {match.artworks.map((artwork) => (
            <ImagePanelDisplay
              key={artwork.id}
              canvasRef={canvasRef}
              imageResult={artwork}
            />
          ))}
        </div>
      </PanelSection>,
    );
  }
  if (match.screenshots?.length) {
    sections.push(
      <PanelSection
        key="screenshots"
        title="Screenshots"
        className="panelSectionFlush"
      >
        <div className="resourceListAreaLogos">
          {match.screenshots.map((screen) => (
            <ImagePanelDisplay
              key={screen.id}
              canvasRef={canvasRef}
              imageResult={screen}
            />
          ))}
        </div>
      </PanelSection>,
    );
  }
  if (match.platforms?.length) {
    const seen = new Set<number>();
    const logos = match.platforms
      .flatMap((p) => p.logos ?? [])
      .filter((logo) => {
        if (seen.has(logo.id)) return false;
        seen.add(logo.id);
        return true;
      });
    if (logos.length) {
      sections.push(
        <PanelSection
          key="platforms"
          title="Platforms"
          className="panelSectionFlush"
        >
          <div className="resourceListAreaLogos">
            {logos.map((logo) => (
              <ImagePanelDisplay
                key={logo.id}
                canvasRef={canvasRef}
                imageResult={logo}
              />
            ))}
          </div>
        </PanelSection>,
      );
    }
  }
  if (match.involved_companies?.length) {
    const seen = new Set<number>();
    const logos = match.involved_companies
      .map((c) => c.company?.logo)
      .filter((logo): logo is NonNullable<typeof logo> => !!logo)
      .filter((logo) => {
        if (seen.has(logo.id)) return false;
        seen.add(logo.id);
        return true;
      });
    if (logos.length) {
      sections.push(
        <PanelSection
          key="companies"
          title="Company logos"
          className="panelSectionFlush"
        >
          <div className="resourceListAreaLogos">
            {logos.map((logo) => (
              <ImagePanelDisplay
                key={logo.id}
                canvasRef={canvasRef}
                imageResult={logo}
              />
            ))}
          </div>
        </PanelSection>,
      );
    }
  }
  if (match.summary) {
    sections.push(
      <PanelSection
        key="summary"
        title="Summary"
        className="panelSectionFlush"
      >
        <Typography color="secondary" className="gameResourcesBody">
          {match.summary}
        </Typography>
      </PanelSection>,
    );
  }
  if (match.storyline) {
    sections.push(
      <PanelSection
        key="storyline"
        title="Storyline"
        className="panelSectionFlush"
      >
        <Typography color="secondary" className="gameResourcesBody">
          {match.storyline}
        </Typography>
      </PanelSection>,
    );
  }

  const platformAbbreviations =
    match.platforms
      ?.map((p) => p.abbreviation || p.name)
      .filter(Boolean) ?? [];

  return (
    <PanelSection title="Game info" className="gameResourcesPanel">
      <div className="gameResourcesHeader">
        <div className="gameResourcesSourceRow">
          <Select
            size="small"
            value={selectedSource}
            onChange={(event: SelectChangeEvent<MatchSource>) =>
              setSelectedSource(event.target.value as MatchSource)
            }
            className="gameResourcesSourceSelect"
            renderValue={(value) => (
              <span className="gameResourcesSourceValue">
                {renderSourceIcon(value as MatchSource)}
                {SOURCE_LABEL[value as MatchSource]}
              </span>
            )}
          >
            {availableSources.map((src) => (
              <MenuItem key={src} value={src}>
                <span className="gameResourcesSourceValue">
                  {renderSourceIcon(src)}
                  {SOURCE_LABEL[src]}
                  {primarySource === src ? ' (image source)' : ''}
                </span>
              </MenuItem>
            ))}
          </Select>
          {sourceUrl && (
            <Tooltip title={`Open on ${SOURCE_LABEL[selectedSource]}`}>
              <IconButton
                size="small"
                color="secondary"
                component="a"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <Typography variant="h2" color="secondary" className="gameResourcesTitle">
          {match.name}
        </Typography>
        {(isPrimary || platformAbbreviations.length > 0) && (
          <div className="gameResourcesChips">
            {isPrimary && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label="Image source"
              />
            )}
            {platformAbbreviations.slice(0, 6).map((abbr) => (
              <Chip
                key={abbr}
                size="small"
                variant="outlined"
                color="secondary"
                label={abbr}
              />
            ))}
          </div>
        )}
      </div>
      {hasAssets(match) ? (
        <>
          <div className="gameResourcesHint">
            <SuggestClick />
          </div>
          <div className="gameResourcesScroll">{sections}</div>
        </>
      ) : (
        <div className="gameResourcesHint">
          <NoGameData />
        </div>
      )}
    </PanelSection>
  );
}

export default GameResourcesPanel;
