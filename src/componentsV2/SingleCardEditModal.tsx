import { Modal, Button, Typography } from '@mui/material';
import './SingleCardEditModal.css';
import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { useRealTimeResize } from '../hooks/useRealtimeResize';
import { useEditableCanvas } from '../hooks/useEditableCanvas';
import { useFileDropperContext } from '../contexts/fileDropper';
import { noop } from '../utils/utils';
import { type FabricObject, type Canvas } from 'fabric';

type SingleCardEditSpaceProps = {
  onClose: () => void;
  onShowGamePanel?: () => void;
  setCurrentEditingCanvas: (canvas: MutableRefObject<Canvas>) => void;
  setCurrentSelectedLayer: React.Dispatch<FabricObject | undefined>;
};

type SingleCardEditModalProps = SingleCardEditSpaceProps & {
  isOpen: boolean;
};

export const ModalInternalComponent = ({
  onClose,
  onShowGamePanel,
  setCurrentEditingCanvas,
  setCurrentSelectedLayer,
}: SingleCardEditSpaceProps) => {
  const [ready, setReady] = useState(false);
  const padderRef = useRef<HTMLDivElement>(null);
  const { editingCard } = useFileDropperContext();

  const { selectedCard, editableCanvas, confirmAndSave, canvasElement } =
    useEditableCanvas({
      setReady,
      setCurrentResource: noop,
      setCurrentEditingCanvas,
      setCurrentSelectedLayer,
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

  const game = editingCard?.game;
  const gameName = game?.name;
  const platformLabel = game?.platforms?.length
    ? game.platforms.map((p) => p.abbreviation).join(', ')
    : null;
  const hasGame = !!gameName;

  return (
    <>
      <div className="verticalStack editSpace" ref={padderRef}>
        <canvas key="doNotChangePlease" ref={canvasElement} />
      </div>
      <div
        className={`currentGameBar ${hasGame ? 'currentGameBar-clickable' : ''}`}
        role={hasGame ? 'button' : undefined}
        tabIndex={hasGame ? 0 : -1}
        onClick={hasGame ? onShowGamePanel : undefined}
        onKeyDown={
          hasGame
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onShowGamePanel?.();
                }
              }
            : undefined
        }
      >
        <Typography variant="caption" className="currentGameLabel">
          Current game
        </Typography>
        {hasGame ? (
          <Typography className="currentGameName">
            {gameName}
            {platformLabel ? (
              <span className="currentGamePlatform"> · {platformLabel}</span>
            ) : null}
          </Typography>
        ) : (
          <Typography className="currentGameEmpty">
            None selected — search IGDB or Steam to pick one
          </Typography>
        )}
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
  onShowGamePanel,
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
            onShowGamePanel={onShowGamePanel}
          />
        )}
      </div>
    </Modal>
  );
};

export default SingleCardEditModal;
