import {
  Button,
  FormControlLabel,
  IconButton,
  Popover,
  Slider,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  DEFAULT_GRID_SETTINGS,
  type GridSettings,
  type Guide,
  type GuideOrientation,
} from '../contexts/fileDropper';
import { createFabricObjectId } from '../utils/createFabricObjectId';
import './GridSettingsPopover.css';

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  settings: GridSettings;
  onChange: (next: GridSettings) => void;
  templateDefault?: Partial<GridSettings>;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const GridSettingsPopover = ({
  anchorEl,
  open,
  onClose,
  settings,
  onChange,
  templateDefault,
}: Props) => {
  const patch = (delta: Partial<GridSettings>) => {
    onChange({ ...settings, ...delta });
  };

  const addGuide = (orientation: GuideOrientation) => {
    const guide: Guide = {
      id: createFabricObjectId(),
      orientation,
      position: 0,
    };
    patch({ guides: [...settings.guides, guide] });
  };

  const updateGuidePosition = (id: string, position: number) => {
    patch({
      guides: settings.guides.map((g) =>
        g.id === id ? { ...g, position } : g,
      ),
    });
  };

  const removeGuide = (id: string) => {
    patch({ guides: settings.guides.filter((g) => g.id !== id) });
  };

  const resetToDefault = () => {
    onChange({ ...DEFAULT_GRID_SETTINGS, ...(templateDefault ?? {}) });
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { className: 'gridSettingsPopover' } }}
    >
      <div className="gridSettingsPopoverContent">
        <FormControlLabel
          control={
            <Switch
              checked={settings.enabled}
              onChange={(_, checked) => patch({ enabled: checked })}
            />
          }
          label="Show grid"
        />
        <div className="gridSettingsRow">
          <TextField
            label="Spacing"
            type="number"
            size="small"
            value={settings.spacing}
            onChange={(e) =>
              patch({ spacing: clampNumber(Number(e.target.value) || 0, 1, 1024) })
            }
            inputProps={{ min: 1, max: 1024, step: 1 }}
          />
          <TextField
            label="Subdivisions"
            type="number"
            size="small"
            value={settings.subdivisions}
            onChange={(e) =>
              patch({
                subdivisions: clampNumber(Number(e.target.value) || 1, 1, 32),
              })
            }
            inputProps={{ min: 1, max: 32, step: 1 }}
          />
        </div>
        <FormControlLabel
          control={
            <Switch
              checked={settings.snapEnabled}
              onChange={(_, checked) => patch({ snapEnabled: checked })}
            />
          }
          label="Snap to grid / guides"
        />
        <TextField
          label="Snap tolerance"
          type="number"
          size="small"
          value={settings.snapTolerance}
          onChange={(e) =>
            patch({
              snapTolerance: clampNumber(Number(e.target.value) || 0, 0, 64),
            })
          }
          inputProps={{ min: 0, max: 64, step: 1 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.showGuides}
              onChange={(_, checked) => patch({ showGuides: checked })}
            />
          }
          label="Show guides"
        />
        <div className="gridSettingsAppearance">
          <Typography variant="caption" className="gridSettingsSectionLabel">
            Appearance
          </Typography>
          <div className="gridSettingsAppearanceRow">
            <label className="gridSettingsColorControl">
              <span>Grid color</span>
              <input
                type="color"
                value={settings.gridColor}
                onChange={(e) => patch({ gridColor: e.target.value })}
              />
            </label>
            <div className="gridSettingsOpacityControl">
              <span>Grid opacity</span>
              <Slider
                size="small"
                min={0}
                max={1}
                step={0.05}
                value={settings.gridOpacity}
                onChange={(_, value) =>
                  patch({ gridOpacity: Array.isArray(value) ? value[0] : value })
                }
              />
            </div>
          </div>
          <div className="gridSettingsAppearanceRow">
            <label className="gridSettingsColorControl">
              <span>Guide color</span>
              <input
                type="color"
                value={settings.guideColor}
                onChange={(e) => patch({ guideColor: e.target.value })}
              />
            </label>
            <div className="gridSettingsOpacityControl">
              <span>Guide opacity</span>
              <Slider
                size="small"
                min={0}
                max={1}
                step={0.05}
                value={settings.guideOpacity}
                onChange={(_, value) =>
                  patch({
                    guideOpacity: Array.isArray(value) ? value[0] : value,
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="gridSettingsGuides">
          <Typography variant="caption" className="gridSettingsGuidesLabel">
            Guides
          </Typography>
          <div className="gridSettingsGuidesActions">
            <Button size="small" onClick={() => addGuide('horizontal')}>
              Add horizontal
            </Button>
            <Button size="small" onClick={() => addGuide('vertical')}>
              Add vertical
            </Button>
          </div>
          {settings.guides.length === 0 ? (
            <Typography variant="caption" className="gridSettingsGuidesEmpty">
              No guides yet.
            </Typography>
          ) : (
            <ul className="gridSettingsGuidesList">
              {settings.guides.map((guide) => (
                <li key={guide.id} className="gridSettingsGuideRow">
                  <span className="gridSettingsGuideOrientation">
                    {guide.orientation === 'horizontal' ? 'H' : 'V'}
                  </span>
                  <TextField
                    type="number"
                    size="small"
                    value={guide.position}
                    onChange={(e) =>
                      updateGuidePosition(guide.id, Number(e.target.value) || 0)
                    }
                    inputProps={{ step: 1 }}
                  />
                  <Tooltip title="Remove guide">
                    <IconButton
                      size="small"
                      onClick={() => removeGuide(guide.id)}
                      aria-label="Remove guide"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="gridSettingsFooter">
          <Button size="small" onClick={resetToDefault}>
            Reset to default
          </Button>
        </div>
      </div>
    </Popover>
  );
};

export default GridSettingsPopover;
