import { type CardData, useFileDropperContext } from '../contexts/fileDropper';
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Canvas, FabricObject } from 'fabric';
import { fixImageInsideCanvas } from '../utils/fixImageInsideCanvas';
import { getMainImage } from '../utils/templateHandling';
import { type TemplateEdit } from '../resourcesTypedef';
import { createFabricObjectId } from '../utils/createFabricObjectId';
import { FABRIC_CUSTOM_PROPS } from '../utils/sessionFile';
import { useCanvasHistory, type CanvasHistory } from './useCanvasHistory';

type useEditableCanvasArgs = {
  setReady: React.Dispatch<boolean>;
  setCurrentResource: React.Dispatch<
    [TemplateEdit | undefined, FabricObject | undefined]
  >;
  setCurrentEditingCanvas?: React.Dispatch<MutableRefObject<Canvas>>;
  setCurrentSelectedLayer: React.Dispatch<FabricObject | undefined >;
  centeredScalingMode?: boolean;
};

type useEditableCanvasReturnType = {
  confirmAndSave: () => void;
  isImageAdjust: boolean;
  isObjectAdjust: boolean;
  editableCanvas: MutableRefObject<Canvas | null>;
  selectedCard: CardData | null;
  canvasElement: MutableRefObject<HTMLCanvasElement | null>;
  history: CanvasHistory;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
};

export const useEditableCanvas = ({
  setReady,
  setCurrentResource,
  setCurrentEditingCanvas,
  setCurrentSelectedLayer,
  centeredScalingMode = false,
}: useEditableCanvasArgs): useEditableCanvasReturnType => {
  const { cards, editingCard } = useFileDropperContext();
  const editableCanvas = useRef<Canvas | null>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const [isImageAdjust, setImageAdjust] = useState<boolean>(false);
  const [isObjectAdjust, setIsObjectAdjust] = useState<boolean>(false);
  const [canvasInstance, setCanvasInstance] = useState<Canvas | null>(null);
  const clipboardRef = useRef<FabricObject | null>(null);
  const altHeldRef = useRef<boolean>(false);
  const centeredScalingModeRef = useRef<boolean>(centeredScalingMode);

  useEffect(() => {
    centeredScalingModeRef.current = centeredScalingMode;
  }, [centeredScalingMode]);

  const selectedCard = editingCard;

  const history = useCanvasHistory({
    canvas: canvasInstance,
    ready: canvasInstance !== null,
  });

  const confirmAndSave = useCallback(async () => {
    if (!selectedCard) return;
    const canvas = editableCanvas.current!;
    const data = canvas.toObject(FABRIC_CUSTOM_PROPS);
    const targetCanvas = selectedCard.canvas!;
    targetCanvas.clear();
    await targetCanvas.loadFromJSON(data);
    targetCanvas.requestRenderAll();
  }, [editableCanvas, selectedCard]);

  useEffect(() => {
    // mount, we duplicate a card
    if (!!selectedCard && canvasElement.current) {
      const canvas = new Canvas(canvasElement.current, {
        selection: false,
        preserveObjectStacking: true,
      });
      // this is not great but we do not care for now
      editableCanvas.current = canvas;
      setCurrentEditingCanvas?.(editableCanvas as MutableRefObject<Canvas>);
      if (selectedCard.canvas) {
        const jsonData = selectedCard.canvas.toObject(FABRIC_CUSTOM_PROPS);
        canvas.loadFromJSON(jsonData).then(() => {
          // Safety: ensure every object has a unique id. Legacy state may
          // include the same object serialized twice (an old insertAt bug
          // meant mainImage could end up in _objects twice), so drop any
          // subsequent object that matches an id we've already seen.
          const seenIds = new Set<string>();
          canvas.getObjects().slice().forEach((obj) => {
            if (obj.id && seenIds.has(obj.id)) {
              canvas.remove(obj);
              return;
            }
            if (!obj.id) {
              obj.id = createFabricObjectId();
            }
            seenIds.add(obj.id);
          });
          canvas.on('object:added', ({ target }) => {
            if (!target) return;
            if (!target.id) {
              target.id = createFabricObjectId();
            }
            const mode = centeredScalingModeRef.current || altHeldRef.current;
            if (target !== getMainImage(canvas)) {
              target.centeredScaling = mode;
            }
          });

          const mainImage = getMainImage(canvas);
          if (mainImage) {
            mainImage.hasControls = false;
            mainImage.hasBorders = false;
            mainImage.strokeWidth = 0;
            mainImage.imageSmoothing = false;
          }

          canvas.on('selection:created', ({ selected }) => {
            setCurrentSelectedLayer(selected[0]);
            if (selected[0] === mainImage) {
              setImageAdjust(true);
              setIsObjectAdjust(false);
              setCurrentResource([undefined, undefined]);
            } else {
              setIsObjectAdjust(true);
              setImageAdjust(false);
            }
          });
          canvas.on('selection:cleared', ({ deselected }) => {
            setCurrentSelectedLayer(undefined);
            if (deselected.length) {
              setImageAdjust(false);
              setIsObjectAdjust(false);
            }
          });
          canvas.on('selection:updated', ({ selected }) => {
            setCurrentSelectedLayer(selected[0]);
            if (selected[0] === mainImage) {
              setImageAdjust(true);
              setIsObjectAdjust(false);
              setCurrentResource([undefined, undefined]);
            } else {
              setImageAdjust(false);
              setIsObjectAdjust(true);
            }
          });
          canvas.on('object:moving', ({ target }) => {
            if (target === mainImage) {
              fixImageInsideCanvas(mainImage);
            }
          });
          setCanvasInstance(canvas);
          setReady(true);
        });
      }
      return () => {
        canvas && canvas.dispose();
        setCanvasInstance(null);
      };
    }
  }, [
    cards,
    selectedCard,
    setCurrentEditingCanvas,
    setCurrentResource,
    setReady,
    setCurrentSelectedLayer,
  ]);

  // Propagate the centered-scaling toggle onto every object (except the main
  // image, which has no controls). Also re-apply on any newly added object via
  // the `object:added` handler above.
  useEffect(() => {
    const canvas = canvasInstance;
    if (!canvas) return;
    const mainImage = getMainImage(canvas);
    canvas.getObjects().forEach((obj) => {
      if (obj === mainImage) return;
      obj.centeredScaling = centeredScalingMode || altHeldRef.current;
    });
  }, [canvasInstance, centeredScalingMode]);

  useEffect(() => {
    const applyScalingMode = (value: boolean) => {
      const canvas = editableCanvas.current;
      if (!canvas) return;
      const mainImage = getMainImage(canvas);
      canvas.getObjects().forEach((obj) => {
        if (obj === mainImage) return;
        obj.centeredScaling = value;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = editableCanvas.current;
      if (!canvas) return;

      // Track Alt for transient center-scaling.
      if (e.key === 'Alt') {
        if (!altHeldRef.current) {
          altHeldRef.current = true;
          applyScalingMode(true);
        }
      }

      if (isEditableTarget(e.target)) return;
      const activeObject = canvas.getActiveObject();
      if (activeObject && 'isEditing' in activeObject && activeObject.isEditing) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const mainImage = getMainImage(canvas);

      if (ctrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        history.undo();
        return;
      }
      if (
        ctrl &&
        ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
          e.key === 'y' ||
          e.key === 'Y')
      ) {
        e.preventDefault();
        history.redo();
        return;
      }

      if (!activeObject) return;

      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        if (activeObject === mainImage) return;
        e.preventDefault();
        activeObject.clone(FABRIC_CUSTOM_PROPS).then((cloned: FabricObject) => {
          clipboardRef.current = cloned;
        });
        return;
      }
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        const clip = clipboardRef.current;
        if (!clip) return;
        e.preventDefault();
        clip.clone(FABRIC_CUSTOM_PROPS).then((cloned: FabricObject) => {
          cloned.left = (cloned.left ?? 0) + 10;
          cloned.top = (cloned.top ?? 0) + 10;
          cloned.id = createFabricObjectId();
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        });
        return;
      }
      if (ctrl && (e.key === 'd' || e.key === 'D')) {
        if (activeObject === mainImage) return;
        e.preventDefault();
        activeObject.clone(FABRIC_CUSTOM_PROPS).then((cloned: FabricObject) => {
          cloned.left = (cloned.left ?? 0) + 10;
          cloned.top = (cloned.top ?? 0) + 10;
          cloned.id = createFabricObjectId();
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        });
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObject === mainImage) return;
        e.preventDefault();
        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
      }

      let moved = false;
      switch (e.key) {
        case 'ArrowUp':
          activeObject.top = (activeObject.top ?? 0) - 1;
          moved = true;
          break;
        case 'ArrowDown':
          activeObject.top = (activeObject.top ?? 0) + 1;
          moved = true;
          break;
        case 'ArrowLeft':
          activeObject.left = (activeObject.left ?? 0) - 1;
          moved = true;
          break;
        case 'ArrowRight':
          activeObject.left = (activeObject.left ?? 0) + 1;
          moved = true;
          break;
      }

      if (activeObject === mainImage) {
        fixImageInsideCanvas(mainImage);
      }

      if (moved) {
        e.preventDefault();
        activeObject.setCoords();
        canvas.requestRenderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && altHeldRef.current) {
        altHeldRef.current = false;
        applyScalingMode(centeredScalingModeRef.current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [history]);

  return {
    confirmAndSave,
    isImageAdjust,
    isObjectAdjust,
    editableCanvas,
    selectedCard,
    canvasElement,
    history,
  };
};
