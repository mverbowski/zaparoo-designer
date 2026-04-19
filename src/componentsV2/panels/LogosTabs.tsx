import {
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { logoStyles } from '../../filteredLogos';
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { type Canvas } from 'fabric';
import { ImagePanelDisplay } from './ImagePanelDisplay';
import './LogosTabs.css';
import { PanelSection } from './PanelSection';
import { RequireCards, SuggestClick, SuggestDrag } from './RequireEditing';

type StaticLogo = {
  url: string;
  name: string;
  style: string;
  category: string;
  width: number;
  height: number;
};

type LogoTabsProps = {
  canvasRef: MutableRefObject<Canvas | null>;
  isEditing: boolean;
  hasCards: boolean;
};

const logoDataCache = new Map<number, StaticLogo[]>();

export const LogoTabs = ({ canvasRef, isEditing, hasCards }: LogoTabsProps) => {
  const [value, setValue] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [logos, setLogos] = useState<StaticLogo[]>([]);
  const hasLogos = logos.length > 0;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const cached = logoDataCache.get(0);
    if (cached) {
      setLogos(cached);
      return;
    }
    logoStyles[0].getter().then((data) => {
      logoDataCache.set(0, data);
      if (isMounted.current) setLogos(data);
    });
  }, []);

  const searchHandler = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setKeyword(evt.target.value.toLocaleLowerCase());
    },
    [setKeyword],
  );

  return (
    <PanelSection
      title="Company logos"
      className={`resourcePanelSection ${!hasLogos ? 'panelLoading' : ''}`}
    >
      {hasCards && !isEditing && <SuggestDrag />}
      {hasCards && isEditing && <SuggestClick />}
      {hasCards || <RequireCards />}
      <div className="logoTools">
        <TextField
          id="filled-search"
          label="Search"
          type="search"
          variant="outlined"
          size="small"
          onChange={searchHandler}
        />
        <FormControl variant="standard">
          <InputLabel variant="outlined" size="small" id="logo-style-label">
            Style
          </InputLabel>
          <Select
            variant="outlined"
            size="small"
            labelId="logo-style-label"
            value={value}
            label="Style"
            onChange={async (event) => {
              const val = event.target.value as number;
              setValue(val);
              const cached = logoDataCache.get(val);
              if (cached) {
                setLogos(cached);
                return;
              }
              setLogos([]);
              const data = await logoStyles[val].getter();
              logoDataCache.set(val, data);
              if (isMounted.current) setLogos(data);
            }}
          >
            {logoStyles.map((_, index) => (
              <MenuItem key={logoStyles[index].style} value={index}>
                {logoStyles[index].style}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className={`resourceListAreaLogosScroll ${!hasLogos ? 'loadingArea' : ''}`}>
        {!hasLogos ? (
          <CircularProgress />
        ) : (
          <div className="resourceListAreaLogos">
            {logos.map(
              (logo) =>
                logo.name.toLowerCase().includes(keyword) && (
                  <ImagePanelDisplay
                    blocked={!hasCards}
                    key={logo.url}
                    canvasRef={canvasRef}
                    imageResult={{ url: logo.url, width: logo.width, height: logo.height }}
                  />
                ),
            )}
          </div>
        )}
      </div>
    </PanelSection>
  );
};

export default LogoTabs;
