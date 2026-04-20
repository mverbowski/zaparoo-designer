import { useCallback, useEffect, useRef, useState } from 'react';
import type { Canvas } from 'fabric';
import { FABRIC_CUSTOM_PROPS } from '../utils/sessionFile';

const MAX_HISTORY = 50;

type Snapshot = ReturnType<Canvas['toObject']>;

type UseCanvasHistoryArgs = {
  canvas: Canvas | null;
  ready: boolean;
};

export type CanvasHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  snapshot: () => void;
  reset: () => void;
};

export const useCanvasHistory = ({
  canvas,
  ready,
}: UseCanvasHistoryArgs): CanvasHistory => {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 1);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const capture = useCallback(
    (c: Canvas): Snapshot => c.toObject(FABRIC_CUSTOM_PROPS),
    [],
  );

  const snapshot = useCallback(() => {
    if (!canvas || isRestoringRef.current) return;
    const next = capture(canvas);
    pastRef.current.push(next);
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    refreshFlags();
  }, [canvas, capture, refreshFlags]);

  const load = useCallback(
    async (snap: Snapshot) => {
      if (!canvas) return;
      isRestoringRef.current = true;
      try {
        await canvas.loadFromJSON(snap);
        canvas.requestRenderAll();
      } finally {
        isRestoringRef.current = false;
      }
    },
    [canvas],
  );

  const undo = useCallback(() => {
    if (!canvas || pastRef.current.length < 2) return;
    const current = pastRef.current.pop()!;
    futureRef.current.push(current);
    const previous = pastRef.current[pastRef.current.length - 1];
    load(previous);
    refreshFlags();
  }, [canvas, load, refreshFlags]);

  const redo = useCallback(() => {
    if (!canvas || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(next);
    load(next);
    refreshFlags();
  }, [canvas, load, refreshFlags]);

  const reset = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    refreshFlags();
  }, [refreshFlags]);

  useEffect(() => {
    if (!canvas || !ready) return;

    pastRef.current = [capture(canvas)];
    futureRef.current = [];
    refreshFlags();

    const handleMutation = () => {
      if (isRestoringRef.current) return;
      snapshot();
    };

    canvas.on('object:added', handleMutation);
    canvas.on('object:removed', handleMutation);
    canvas.on('object:modified', handleMutation);
    canvas.on('text:changed', handleMutation);

    return () => {
      canvas.off('object:added', handleMutation);
      canvas.off('object:removed', handleMutation);
      canvas.off('object:modified', handleMutation);
      canvas.off('text:changed', handleMutation);
    };
  }, [canvas, ready, capture, refreshFlags, snapshot]);

  return { undo, redo, canUndo, canRedo, snapshot, reset };
};
