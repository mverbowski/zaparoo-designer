import { IconButton, Tooltip, Typography } from '@mui/material';
import { PanelSection } from './PanelSection';
import './LayersPanel.css';
import { MutableRefObject, useCallback, useEffect, useState } from 'react';
import {
  type TFiller,
  type Canvas,
  FabricObject,
  StaticCanvas,
} from 'fabric';
import { RequireCards } from './RequireEditing';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { ColorSwatch } from './ColorSwatch';

const TOOLTIP_ENTER_DELAY = 1500;
const TOOLTIP_ENTER_NEXT_DELAY = 1500;

type LayersPanelProps = {
  canvasRef: MutableRefObject<Canvas | null>;
  hasCards: boolean;
  currentLayer?: FabricObject;
};

type LayerRow = {
  id: string;
  type: string;
  text?: string;
  fill?: string;
  stroke?: string;
  visible: boolean;
  locked: boolean;
  isTemplate: boolean;
};

const isPlaceholder = (object: FabricObject) =>
  !!object['zaparoo-placeholder'];

const isLocked = (object: FabricObject) =>
  object['zaparoo-locked'] === true || object.selectable === false;

const isTemplateLayer = (object: FabricObject) =>
  object['zaparoo-template-layer'] === true;

// Fabric's getObjects returns bottom-to-top. We display top-to-bottom
// (Photoshop order), so the first row in the list is the object rendered on
// top of the canvas. Placeholders are filtered out — they are invisible
// guides that represent the same content as the main image.
const getLayersTopDown = (canvas: StaticCanvas): LayerRow[] =>
  canvas
    .getObjects()
    .filter((object) => !isPlaceholder(object))
    .slice()
    .reverse()
    .map((object) => ({
      id: object.id,
      type: object.type,
      text: 'text' in object ? (object.text as string | undefined) : undefined,
      fill: (object.fill as string | undefined) ?? undefined,
      stroke: (object.stroke as string | undefined) ?? undefined,
      visible: object.visible !== false,
      locked: isLocked(object),
      isTemplate: isTemplateLayer(object),
    }));

export const LayersPanel = ({
  canvasRef,
  hasCards,
  currentLayer,
}: LayersPanelProps) => {
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [openSwatchKey, setOpenSwatchKey] = useState<string | null>(null);

  const getSwatchKey = useCallback(
    (id: string, property: 'fill' | 'stroke') => `${id}:${property}`,
    [],
  );

  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setLayers([]);
      return;
    }
    setLayers(getLayersTopDown(canvas));
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    refreshLayers();
    // Keep the list in sync with canvas mutations. Fabric fires these events
    // for add/remove/modify, but not for z-order changes — those we refresh
    // manually after the action in this panel.
    canvas.on('object:added', refreshLayers);
    canvas.on('object:removed', refreshLayers);
    canvas.on('object:modified', refreshLayers);
    return () => {
      canvas.off('object:added', refreshLayers);
      canvas.off('object:removed', refreshLayers);
      canvas.off('object:modified', refreshLayers);
    };
  }, [canvasRef, refreshLayers]);

  const findLayer = useCallback(
    (id: string) =>
      canvasRef.current?.getObjects().find((obj) => obj.id === id),
    [canvasRef],
  );

  const selectOnCanvas = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      if (isLocked(layer)) return;
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
    },
    [canvasRef, findLayer],
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      layer.visible = layer.visible === false ? true : false;
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const toggleLock = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      const nextLocked = !isLocked(layer);
      layer['zaparoo-locked'] = nextLocked;
      layer.selectable = !nextLocked;
      layer.evented = !nextLocked;
      if (nextLocked && canvas.getActiveObject() === layer) {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const deleteLayerById = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      if (canvas.getActiveObject() === layer) {
        canvas.discardActiveObject();
      }
      canvas.remove(layer);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  // In the reversed (top-down) display: "move up" = bring closer to front.
  const moveLayerUp = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      canvas.bringObjectForward(layer);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      canvas.sendObjectBackwards(layer);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const moveLayerToFront = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      canvas.bringObjectToFront(layer);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const moveLayerToBack = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      canvas.sendObjectToBack(layer);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  const onColorSelect = useCallback(
    (id: string, nextColor: string, property: 'fill' | 'stroke') => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const layer = findLayer(id);
      if (!layer) return;
      layer.set(property, nextColor);
      canvas.requestRenderAll();
      refreshLayers();
    },
    [canvasRef, findLayer, refreshLayers],
  );

  return (
    <PanelSection
      className="layersContainer"
      title="Layers"
      helpText="Click a layer to select it on the canvas"
    >
      {hasCards || <RequireCards />}
      <div className="layers-list">
        {layers.map((layer) => {
          const isSelected = currentLayer?.id === layer.id;
          const nameLabel =
            layer.text || (layer.type ?? 'layer');
          return (
            <div
              className={`layers-row ${isSelected ? 'selected' : ''} ${
                layer.locked ? 'locked' : ''
              } ${layer.isTemplate ? 'template' : ''}`}
              onClick={() => selectOnCanvas(layer.id)}
              key={layer.id}
            >
              <Tooltip
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                enterDelay={TOOLTIP_ENTER_DELAY}
                enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
              >
                <IconButton
                  size="small"
                  aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                  className="layers-row-visibility"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleVisibility(layer.id);
                  }}
                >
                  {layer.visible ? (
                    <VisibilityIcon fontSize="inherit" />
                  ) : (
                    <VisibilityOffIcon fontSize="inherit" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                enterDelay={TOOLTIP_ENTER_DELAY}
                enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
              >
                <IconButton
                  size="small"
                  aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  className="layers-row-lock"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleLock(layer.id);
                  }}
                >
                  {layer.locked ? (
                    <LockIcon fontSize="inherit" />
                  ) : (
                    <LockOpenIcon fontSize="inherit" />
                  )}
                </IconButton>
              </Tooltip>
              <Typography
                variant="body2"
                color="text.secondary"
                className="layers-row-text"
                title={nameLabel}
              >
                {nameLabel}
              </Typography>
              <div className="layers-row-actions">
                {layer.type !== 'image' && (
                  <div onClick={(event) => event.stopPropagation()}>
                    <ColorSwatch
                      onColorSelect={onColorSelect}
                      property="fill"
                      id={layer.id}
                      color={
                        layer.fill &&
                        !(layer.fill as unknown as TFiller)?.toLive
                          ? layer.fill
                          : 'transparent'
                      }
                      ariaLabel="fill color"
                      isOpen={openSwatchKey === getSwatchKey(layer.id, 'fill')}
                      onOpenChange={(nextOpen) => {
                        setOpenSwatchKey(
                          nextOpen ? getSwatchKey(layer.id, 'fill') : null,
                        );
                      }}
                    />
                  </div>
                )}
                {layer.type !== 'image' && (
                  <div onClick={(event) => event.stopPropagation()}>
                    <ColorSwatch
                      onColorSelect={onColorSelect}
                      property="stroke"
                      id={layer.id}
                      color={
                        layer.stroke &&
                        !(layer.stroke as unknown as TFiller)?.toLive
                          ? layer.stroke
                          : 'transparent'
                      }
                      ariaLabel="stroke color"
                      isOpen={openSwatchKey === getSwatchKey(layer.id, 'stroke')}
                      onOpenChange={(nextOpen) => {
                        setOpenSwatchKey(
                          nextOpen ? getSwatchKey(layer.id, 'stroke') : null,
                        );
                      }}
                    />
                  </div>
                )}
                <Tooltip
                  title="Move forward"
                  enterDelay={TOOLTIP_ENTER_DELAY}
                  enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
                >
                  <IconButton
                    size="small"
                    aria-label="Move layer forward"
                    className="layers-row-icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLayerUp(layer.id);
                    }}
                  >
                    <ArrowUpwardIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title="Move backward"
                  enterDelay={TOOLTIP_ENTER_DELAY}
                  enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
                >
                  <IconButton
                    size="small"
                    aria-label="Move layer backward"
                    className="layers-row-icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLayerDown(layer.id);
                    }}
                  >
                    <ArrowDownwardIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title="Bring to front"
                  enterDelay={TOOLTIP_ENTER_DELAY}
                  enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
                >
                  <IconButton
                    size="small"
                    aria-label="Bring layer to front"
                    className="layers-row-icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLayerToFront(layer.id);
                    }}
                  >
                    <VerticalAlignTopIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title="Send to back"
                  enterDelay={TOOLTIP_ENTER_DELAY}
                  enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
                >
                  <IconButton
                    size="small"
                    aria-label="Send layer to back"
                    className="layers-row-icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLayerToBack(layer.id);
                    }}
                  >
                    <VerticalAlignBottomIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title="Delete layer"
                  enterDelay={TOOLTIP_ENTER_DELAY}
                  enterNextDelay={TOOLTIP_ENTER_NEXT_DELAY}
                >
                  <IconButton
                    size="small"
                    aria-label={`Delete ${layer.type ?? 'layer'}`}
                    className="layers-row-icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLayerById(layer.id);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
};

export default LayersPanel;
