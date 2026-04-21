import {
  Divider,
  IconButton,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Textbox, type Canvas } from 'fabric';
import { useRef, useState, type MutableRefObject } from 'react';
import { CANVAS_FONT_FAMILIES } from '../utils/canvasFonts';
import { useFileDropperContext } from '../contexts/fileDropper';
import './TextFormatToolbar.css';

type Props = {
  canvasRef: MutableRefObject<Canvas | null>;
  target: Textbox;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  if (/^#([0-9a-fA-F]{3})$/.test(trimmed)) {
    const s = trimmed.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  return fallback;
};

export const TextFormatToolbar = ({ canvasRef, target }: Props) => {
  const [, forceUpdate] = useState(0);
  const { userFonts, addUserFont } = useFileDropperContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const writeAndRender = (changes: Record<string, unknown>) => {
    target.set(changes);
    canvasRef.current?.requestRenderAll();
    forceUpdate((v) => v + 1);
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const font = await addUserFont(file);
      writeAndRender({ fontFamily: font.family });
    } catch (err) {
      console.error('Failed to load font', err);
    }
  };

  const userFontFamilies = Array.from(new Set(userFonts.map((f) => f.family)));
  const allFamilies = Array.from(
    new Set([...CANVAS_FONT_FAMILIES, ...userFontFamilies]),
  );

  const fontFamily = (target.fontFamily as string) || CANVAS_FONT_FAMILIES[0];
  const fontSize = (target.fontSize as number) || 32;
  const fontWeight = target.fontWeight === 'bold' || target.fontWeight === 700;
  const fontItalic = target.fontStyle === 'italic';
  const underline = !!target.underline;
  const textAlign = (target.textAlign as string) || 'left';
  const fillHex = toHexColor(target.fill, '#000000');
  const strokeHex = toHexColor(target.stroke, '#000000');
  const strokeWidth = Number(target.strokeWidth ?? 0);
  const lineHeight = Number(target.lineHeight ?? 1.2);
  const charSpacing = Number(target.charSpacing ?? 0);

  const styleValues: string[] = [];
  if (fontWeight) styleValues.push('bold');
  if (fontItalic) styleValues.push('italic');
  if (underline) styleValues.push('underline');

  return (
    <div className="textFormatToolbar" role="toolbar" aria-label="Text formatting">
      <Select
        size="small"
        value={allFamilies.includes(fontFamily) ? fontFamily : ''}
        displayEmpty
        onChange={(e) => writeAndRender({ fontFamily: e.target.value })}
        className="textFormatFont"
      >
        {!allFamilies.includes(fontFamily) && fontFamily && (
          <MenuItem value="" disabled>
            {fontFamily} (missing)
          </MenuItem>
        )}
        {allFamilies.map((family) => (
          <MenuItem key={family} value={family} style={{ fontFamily: family }}>
            {family}
            {userFontFamilies.includes(family) ? ' ·' : ''}
          </MenuItem>
        ))}
      </Select>
      <Tooltip title="Upload font (.ttf, .otf, .woff)">
        <IconButton
          size="small"
          onClick={handleUploadClick}
          aria-label="Upload font"
        >
          <UploadFileIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/*"
        onChange={handleFileSelected}
        hidden
      />
      <TextField
        size="small"
        type="number"
        value={fontSize}
        onChange={(e) =>
          writeAndRender({
            fontSize: clamp(Number(e.target.value) || 1, 1, 512),
          })
        }
        inputProps={{ min: 1, max: 512, step: 1 }}
        className="textFormatSize"
        aria-label="Font size"
      />
      <Divider orientation="vertical" flexItem />
      <ToggleButtonGroup
        size="small"
        value={styleValues}
        onChange={(_, next: string[]) => {
          writeAndRender({
            fontWeight: next.includes('bold') ? 'bold' : 'normal',
            fontStyle: next.includes('italic') ? 'italic' : 'normal',
            underline: next.includes('underline'),
          });
        }}
        aria-label="Text style"
      >
        <ToggleButton value="bold" aria-label="Bold">
          <Tooltip title="Bold">
            <FormatBoldIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="italic" aria-label="Italic">
          <Tooltip title="Italic">
            <FormatItalicIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="underline" aria-label="Underline">
          <Tooltip title="Underline">
            <FormatUnderlinedIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={textAlign}
        onChange={(_, next: string | null) => {
          if (!next) return;
          writeAndRender({ textAlign: next });
        }}
        aria-label="Text align"
      >
        <ToggleButton value="left" aria-label="Align left">
          <Tooltip title="Align left">
            <FormatAlignLeftIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="center" aria-label="Align center">
          <Tooltip title="Align center">
            <FormatAlignCenterIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="right" aria-label="Align right">
          <Tooltip title="Align right">
            <FormatAlignRightIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="justify" aria-label="Justify">
          <Tooltip title="Justify">
            <FormatAlignJustifyIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem />
      <label className="textFormatColor">
        <span>Fill</span>
        <input
          type="color"
          value={fillHex}
          onChange={(e) => writeAndRender({ fill: e.target.value })}
        />
      </label>
      <label className="textFormatColor">
        <span>Stroke</span>
        <input
          type="color"
          value={strokeHex}
          onChange={(e) => writeAndRender({ stroke: e.target.value })}
        />
      </label>
      <TextField
        size="small"
        type="number"
        label="Stroke"
        value={strokeWidth}
        onChange={(e) =>
          writeAndRender({
            strokeWidth: clamp(Number(e.target.value) || 0, 0, 32),
          })
        }
        inputProps={{ min: 0, max: 32, step: 0.5 }}
        className="textFormatNumber"
      />
      <Divider orientation="vertical" flexItem />
      <TextField
        size="small"
        type="number"
        label="Line"
        value={lineHeight}
        onChange={(e) =>
          writeAndRender({
            lineHeight: clamp(Number(e.target.value) || 1, 0.5, 4),
          })
        }
        inputProps={{ min: 0.5, max: 4, step: 0.05 }}
        className="textFormatNumber"
      />
      <TextField
        size="small"
        type="number"
        label="Spacing"
        value={charSpacing}
        onChange={(e) =>
          writeAndRender({
            charSpacing: clamp(Number(e.target.value) || 0, -200, 800),
          })
        }
        inputProps={{ min: -200, max: 800, step: 10 }}
        className="textFormatNumber"
      />
    </div>
  );
};

export default TextFormatToolbar;
