import { Modal, Button, Typography } from '@mui/material';
import './SingleCardEditModal.css';
import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { useRealTimeResize } from '../hooks/useRealtimeResize';
import { useEditableCanvas } from '../hooks/useEditableCanvas';
import {
  useFileDropperContext,
  type MatchSource,
} from '../contexts/fileDropper';
import { noop } from '../utils/utils';
import { type FabricObject, type Canvas } from 'fabric';
import type { SearchResult } from '../../netlify/apiProviders/types.mts';
import { IgdbSourceIcon, SteamGridDbSourceIcon } from './SourceIcons';
import { EditToolbar } from './EditToolbar';

type SingleCardEditSpaceProps = {
  onClose: () => void;
  onShowSourcePanel?: (source: MatchSource) => void;
  setCurrentEditingCanvas: (canvas: MutableRefObject<Canvas>) => void;
  setCurrentSelectedLayer: React.Dispatch<FabricObject | undefined>;
};

const SOURCE_LABEL: Record<MatchSource, string> = {
  igdb: 'IGDB',
  steam: 'SteamGridDB',
};

const SOURCE_ICON: Record<MatchSource, JSX.Element> = {
  igdb: <IgdbSourceIcon />,
  steam: <SteamGridDbSourceIcon />,
};

const platformLabelOf = (game: Partial<SearchResult> | undefined) =>
  game?.platforms?.length
    ? game.platforms.map((p) => p.abbreviation).join(', ')
    : null;

type MatchSlotProps = {
  source: MatchSource;
  game: Partial<SearchResult> | undefined;
  onClick?: () => void;
  isPrimary: boolean;
};

const MatchSlot = ({ source, game, onClick, isPrimary }: MatchSlotProps) => {
  const hasGame = !!game?.name;
  const platformLabel = platformLabelOf(game);
  return (
    <div
      className={`matchSlot ${hasGame ? 'matchSlot-filled' : 'matchSlot-empty'} ${
        isPrimary ? 'matchSlot-primary' : ''
      }`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="matchSlotHeader">
        <span className="matchSlotIcon">{SOURCE_ICON[source]}</span>
        <Typography variant="caption" className="currentGameLabel">
          {SOURCE_LABEL[source]}
          {isPrimary ? ' · image source' : ''}
        </Typography>
      </div>
      {hasGame ? (
        <Typography className="currentGameName">
          {game!.name}
          {platformLabel ? (
            <span className="currentGamePlatform"> · {platformLabel}</span>
          ) : null}
        </Typography>
      ) : (
        <Typography className="currentGameEmpty">
          No match — search {SOURCE_LABEL[source]}
        </Typography>
      )}
    </div>
  );
};

type SingleCardEditModalProps = SingleCardEditSpaceProps & {
  isOpen: boolean;
};

export const ModalInternalComponent = ({
  onClose,
  onShowSourcePanel,
  setCurrentEditingCanvas,
  setCurrentSelectedLayer,
}: SingleCardEditSpaceProps) => {
  const [ready, setReady] = useState(false);
  const [centeredScalingMode, setCenteredScalingMode] = useState(false);
  const padderRef = useRef<HTMLDivElement>(null);
  const { editingCard } = useFileDropperContext();

  const {
    selectedCard,
    editableCanvas,
    confirmAndSave,
    canvasElement,
    history,
  } = useEditableCanvas({
    setReady,
    setCurrentResource: noop,
    setCurrentEditingCanvas,
    setCurrentSelectedLayer,
    centeredScalingMode,
  });

  useRealTimeResize({
    fabricCanvas: editableCanvas.current,
    layout: selectedCard!.template!.layout,
    media: selectedCard!.template!.media,
    ready,
    padderRef,
    throttleMs: 100,
  });

  const confirmAndClose = useCallback(() => {
    confirmAndSave();
    onClose();
  }, [confirmAndSave, onClose]);

  const matches = editingCard?.matches ?? {};
  const primarySource = editingCard?.primarySource;

  return (
    <>
      <EditToolbar
        canvasRef={editableCanvas}
        history={history}
        centeredScalingMode={centeredScalingMode}
        onToggleCenteredScaling={() => setCenteredScalingMode((v) => !v)}
      />
      <div className="verticalStack editSpace" ref={padderRef}>
        <canvas key="doNotChangePlease" ref={canvasElement} />
      </div>
      <div className="currentGameBar">
        <MatchSlot
          source="igdb"
          game={matches.igdb}
          onClick={
            onShowSourcePanel ? () => onShowSourcePanel('igdb') : undefined
          }
          isPrimary={primarySource === 'igdb'}
        />
        <MatchSlot
          source="steam"
          game={matches.steam}
          onClick={
            onShowSourcePanel ? () => onShowSourcePanel('steam') : undefined
          }
          isPrimary={primarySource === 'steam'}
        />
      </div>
      <div className="horizontalStack confirmButtons">
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={onClose}
          disableElevation={true}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={confirmAndClose}
          disableElevation={true}
        >
          Confirm
        </Button>
      </div>
    </>
  );
};

export const SingleCardEditModal = ({
  isOpen,
  onClose,
  onShowSourcePanel,
  setCurrentEditingCanvas,
  setCurrentSelectedLayer,
}: SingleCardEditModalProps) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      disableEnforceFocus
      disableEscapeKeyDown
      disableAutoFocus
      disableRestoreFocus
      hideBackdrop
      slotProps={{
        root: {
          style: {
            left: 'calc(var(--left-panel-width) + var(--action-bar-width))',
            top: 'var(--header-height)',
          },
        },
      }}
    >
      <div className="cardEditModal verticalStack" tabIndex={-1}>
        {isOpen && (
          <ModalInternalComponent
            setCurrentSelectedLayer={setCurrentSelectedLayer}
            setCurrentEditingCanvas={setCurrentEditingCanvas}
            onClose={onClose}
            onShowSourcePanel={onShowSourcePanel}
          />
        )}
      </div>
    </Modal>
  );
};

export default SingleCardEditModal;
