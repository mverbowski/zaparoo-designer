import { useState, useMemo, useCallback, useRef } from 'react';
import type { FC, JSX } from 'react';
import {
  type CardData,
  FileDropContext,
  type MatchSource,
  type PossibleFile,
  type contextType,
} from '../contexts/fileDropper';
import { SearchResult } from '../../netlify/apiProviders/types.mts';
import {
  downloadSession,
  loadSessionFromFile,
} from '../utils/sessionFile';
import {
  fileToUserFont,
  registerUserFont,
  type UserFont,
} from '../utils/userFonts';
import { registerUserFontForPdf } from '../extensions/pdfFontCache';

type FileDropperProps = {
  children: JSX.Element | JSX.Element[];
};

export const FileDropperContextProvider: FC<FileDropperProps> = ({
  children,
}) => {
  const [files, setFilesImpl] = useState<PossibleFile[]>([]);
  const cards = useRef<CardData[]>([]);
  // the selection state needs to be refactored.
  const [selectedCardsCount, setSelectedCardsCount] = useState<number>(0);
  const [editingCard, setEditingCardImpl] = useState<CardData | null>(null);
  const [userFonts, setUserFonts] = useState<UserFont[]>([]);

  const addFiles = useCallback(
    (newFiles: PossibleFile[], games: CardData['game'][] = []) => {
      setFilesImpl([...files, ...newFiles]);
      cards.current.push(
        ...newFiles.map<CardData>((file, index) => ({
          file,
          game: games[index] || {},
          matches: {},
          key: `${
            (file as File)?.name || (file as HTMLImageElement)?.src || 'empty'
          }-${Date.now()}`,
          canvas: undefined,
          template: undefined,
          isSelected: false,
          colors: [],
          originalColors: [],
        })),
      );
    },
    [files, setFilesImpl],
  );

  const setEditingCard = useCallback(
    (index: number) => {
      setEditingCardImpl(cards.current[index]);
    },
    [setEditingCardImpl],
  );

  const setFiles = useCallback(
    (totalFiles: PossibleFile[], games: CardData['game'][] = []) => {
      let newFiles: PossibleFile[] = [];
      if (totalFiles.length > files.length) {
        newFiles = totalFiles.slice(files.length - totalFiles.length);
      }
      setFilesImpl(totalFiles);
      cards.current.push(
        ...newFiles.map<CardData>((file, index) => ({
          file,
          game: games[index] || {},
          matches: {},
          key: `${
            (file as File)?.name || (file as HTMLImageElement)?.src || 'empty'
          }-${Date.now()}`,
          canvas: undefined,
          template: undefined,
          isSelected: false,
          colors: [],
          originalColors: [],
        })),
      );
    },
    [files, cards],
  );

  const removeCards = useCallback(() => {
    const indexToRemove: number[] = [];
    cards.current = cards.current.filter((card, index) => {
      if (card.isSelected) {
        indexToRemove.push(index);
        return false;
      }
      return true;
    });
    setFilesImpl(
      files.filter((_, index) => {
        return !indexToRemove.includes(index);
      }),
    );
    setSelectedCardsCount(0);
  }, [files]);

  const deleteCardByIndex = useCallback(
    (index: number) => {
      const cardToDelete = cards.current[index];
      if (!cardToDelete) return;
      cards.current = cards.current.filter(
        (_, cardIndex) => cardIndex !== index,
      );
      setFilesImpl(files.filter((_, fileIndex) => fileIndex !== index));
      if (cardToDelete.isSelected) {
        setSelectedCardsCount((prev) => Math.max(0, prev - 1));
      }
      if (editingCard?.key === cardToDelete.key) {
        setEditingCardImpl(null);
      }
    },
    [files, editingCard, setSelectedCardsCount, setEditingCardImpl],
  );

  const duplicateCardByIndex = useCallback(
    async (index: number) => {
      const cardToDuplicate = cards.current[index];
      if (!cardToDuplicate) return;
      const duplicatedCanvas = await cardToDuplicate.canvas!.clone([]);
      duplicatedCanvas.viewportTransform = [
        ...cardToDuplicate.canvas!.viewportTransform,
      ];
      duplicatedCanvas.requestRenderAll();
      const duplicatedCard: CardData = {
        ...cardToDuplicate,
        colors: [...cardToDuplicate.colors],
        originalColors: [...cardToDuplicate.originalColors],
        canvas: duplicatedCanvas,
        isSelected: false,
        key: `${cardToDuplicate.key}-${Date.now()}`,
      };
      cards.current = [
        ...cards.current.slice(0, index + 1),
        duplicatedCard,
        ...cards.current.slice(index + 1),
      ];
      setFilesImpl([
        ...files.slice(0, index + 1),
        cardToDuplicate.file,
        ...files.slice(index + 1),
      ]);
    },
    [files],
  );

  const swapGameAtIndex = useCallback(
    async (
      file: PossibleFile,
      game: SearchResult,
      index: number,
      source: MatchSource,
    ) => {
      files[index] = file;
      const card = cards.current[index];
      if (card) {
        card.game = game;
        card.matches = { ...card.matches, [source]: game };
        card.primarySource = source;
      }
      setFilesImpl([...files]);
    },
    [files],
  );

  const setMatchAtIndex = useCallback(
    (source: MatchSource, game: SearchResult, index: number) => {
      const card = cards.current[index];
      if (!card) return;
      card.matches = { ...card.matches, [source]: game };
    },
    [],
  );

  const addUserFont = useCallback(async (file: File) => {
    const font = await fileToUserFont(file);
    await registerUserFont(font);
    registerUserFontForPdf(font);
    setUserFonts((prev) => {
      if (
        prev.some(
          (f) =>
            f.family === font.family &&
            f.weight === font.weight &&
            f.style === font.style,
        )
      ) {
        return prev;
      }
      return [...prev, font];
    });
    return font;
  }, []);

  const saveSession = useCallback(() => {
    downloadSession(cards.current, userFonts);
  }, [cards, userFonts]);

  const loadSession = useCallback(async () => {
    const loaded = await loadSessionFromFile();
    await Promise.all(
      loaded.userFonts.map(async (font) => {
        await registerUserFont(font);
        registerUserFontForPdf(font);
      }),
    );
    cards.current = loaded.cards;
    setFilesImpl(loaded.cards.map((card) => card.file));
    setUserFonts(loaded.userFonts);
    setSelectedCardsCount(0);
    setEditingCardImpl(null);
  }, [cards]);

  const contextValue = useMemo<contextType>(
    () => ({
      files,
      addFiles,
      setFiles,
      cards,
      removeCards,
      deleteCardByIndex,
      duplicateCardByIndex,
      selectedCardsCount,
      setSelectedCardsCount,
      editingCard,
      setEditingCard,
      swapGameAtIndex,
      setMatchAtIndex,
      saveSession,
      loadSession,
      userFonts,
      addUserFont,
    }),
    [
      files,
      addFiles,
      setFiles,
      removeCards,
      deleteCardByIndex,
      duplicateCardByIndex,
      selectedCardsCount,
      editingCard,
      setEditingCard,
      swapGameAtIndex,
      setMatchAtIndex,
      saveSession,
      loadSession,
      userFonts,
      addUserFont,
    ],
  );

  return (
    <FileDropContext.Provider value={contextValue}>
      {children}
    </FileDropContext.Provider>
  );
};
