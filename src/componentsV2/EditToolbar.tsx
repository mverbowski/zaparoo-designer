import { IconButton, Tooltip, Divider } from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { type MutableRefObject } from 'react';
import { type Canvas, Ellipse, Rect, Textbox, type FabricObject } from 'fabric';
import { createFabricObjectId } from '../utils/createFabricObjectId';
import { getMainImage } from '../utils/templateHandling';
import { FABRIC_CUSTOM_PROPS } from '../utils/sessionFile';
import {
  DEFAULT_USER_TEXT,
  getUserTextboxOptions,
} from './panels/userTextLayer';
import type { CanvasHistory } from '../hooks/useCanvasHistory';
import './EditToolbar.css';

type Props = {
  canvasRef: MutableRefObject<Canvas | null>;
  history: CanvasHistory;
  centeredScalingMode: boolean;
  onToggleCenteredScaling: () => void;
};

const DEFAULT_SHAPE_FILL = '#e0e0e0';
const DEFAULT_SHAPE_STROKE = '#222222';
const DEFAULT_SHAPE_STROKE_WIDTH = 2;

export const EditToolbar = ({
  canvasRef,
  history,
  centeredScalingMode,
  onToggleCenteredScaling,
}: Props) => {
  const withCanvas = (fn: (canvas: Canvas) => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fn(canvas);
  };

  const addText = () =>
    withCanvas((canvas) => {
      const text = new Textbox(
        DEFAULT_USER_TEXT,
        getUserTextboxOptions(canvas.getWidth(), canvas.getHeight()),
      );
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    });

  const addRectangle = () =>
    withCanvas((canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      const size = Math.min(w, h) * 0.3;
      const rect = new Rect({
        left: w / 2,
        top: h / 2,
        width: size,
        height: size,
        fill: DEFAULT_SHAPE_FILL,
        stroke: DEFAULT_SHAPE_STROKE,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.requestRenderAll();
    });

  const addEllipse = () =>
    withCanvas((canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      const rx = Math.min(w, h) * 0.15;
      const ellipse = new Ellipse({
        left: w / 2,
        top: h / 2,
        rx,
        ry: rx,
        fill: DEFAULT_SHAPE_FILL,
        stroke: DEFAULT_SHAPE_STROKE,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      });
      canvas.add(ellipse);
      canvas.setActiveObject(ellipse);
      canvas.requestRenderAll();
    });

  const duplicateActive = () =>
    withCanvas((canvas) => {
      const active = canvas.getActiveObject();
      if (!active || active === getMainImage(canvas)) return;
      active.clone(FABRIC_CUSTOM_PROPS).then((cloned: FabricObject) => {
        cloned.left = (cloned.left ?? 0) + 10;
        cloned.top = (cloned.top ?? 0) + 10;
        cloned.id = createFabricObjectId();
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
      });
    });

  const deleteActive = () =>
    withCanvas((canvas) => {
      const active = canvas.getActiveObject();
      if (!active || active === getMainImage(canvas)) return;
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    });

  const deselect = () =>
    withCanvas((canvas) => {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    });

  return (
    <div className="editToolbar" role="toolbar" aria-label="Editor toolbar">
      <div className="editToolbarZone editToolbarZoneLeft">
        <Tooltip title="Add text (T)">
          <IconButton size="small" onClick={addText} aria-label="Add text">
            <TextFieldsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add rectangle">
          <IconButton
            size="small"
            onClick={addRectangle}
            aria-label="Add rectangle"
          >
            <CropSquareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add ellipse">
          <IconButton
            size="small"
            onClick={addEllipse}
            aria-label="Add ellipse"
          >
            <CircleOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="Duplicate (Ctrl+D)">
          <IconButton
            size="small"
            onClick={duplicateActive}
            aria-label="Duplicate selected"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete (Del)">
          <IconButton
            size="small"
            onClick={deleteActive}
            aria-label="Delete selected"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="Scale from center (hold Alt for transient)">
          <IconButton
            size="small"
            onClick={onToggleCenteredScaling}
            aria-label="Toggle scale from center"
            className={
              centeredScalingMode
                ? 'editToolbarToggle editToolbarToggleActive'
                : 'editToolbarToggle'
            }
          >
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      <div className="editToolbarZone editToolbarZoneMiddle" />
      <div className="editToolbarZone editToolbarZoneRight">
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton
              size="small"
              onClick={history.undo}
              disabled={!history.canUndo}
              aria-label="Undo"
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Shift+Z)">
          <span>
            <IconButton
              size="small"
              onClick={history.redo}
              disabled={!history.canRedo}
              aria-label="Redo"
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="Deselect (Esc)">
          <IconButton
            size="small"
            onClick={deselect}
            aria-label="Deselect"
          >
            <HighlightOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

export default EditToolbar;
