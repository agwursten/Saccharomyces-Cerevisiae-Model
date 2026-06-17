import { createTheme } from '@mui/material/styles';

/**
 * La paleta se construye en torno a un verde eucalipto / bosque profundo
 * que alude al tema de levaduras / laboratorio, con un amarillo ámbar
 * saturado usado de manera contenida como único acento para los
 * destacados de "fermentación alcohólica".
 *
 * Se exponen tanto la variante clara como la oscura. La variante oscura
 * es la predeterminada — es la que la mayoría del tooling científico
 * (Plotly Dash, estudios de COMSOL, etc.) tiende a lucir mejor.
 */
const colors = {
  // Marca
  brand:       '#3aa37a',   // eucalipto
  brandDark:   '#1f6d4d',
  brandLight:  '#7cd3ad',
  accent:      '#f0b441',   // ámbar etanol
  accentDeep:  '#c78a1f',
  danger:      '#e07060',
  warning:     '#e0b04a',

  // Superficies oscuras
  bgDark:      '#0b1117',
  surfaceDark: '#141c25',
  panelDark:   '#1b2531',
  borderDark:  'rgba(255,255,255,0.08)',

  // Superficies claras
  bgLight:      '#f7f6f1',
  surfaceLight: '#ffffff',
  panelLight:   '#fbfaf6',
  borderLight:  'rgba(0,0,0,0.08)',
};

export const buildTheme = (mode = 'dark') => {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary:   { main: colors.brand,  dark: colors.brandDark, light: colors.brandLight },
      secondary: { main: colors.accent, dark: colors.accentDeep },
      error:     { main: colors.danger },
      warning:   { main: colors.warning },
      background: {
        default: isDark ? colors.bgDark      : colors.bgLight,
        paper:   isDark ? colors.surfaceDark : colors.surfaceLight,
      },
      divider: isDark ? colors.borderDark : colors.borderLight,
      text: {
        primary:   isDark ? '#e8edf1' : '#1c2530',
        secondary: isDark ? '#9aa6b2' : '#5a6772',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      h1: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.02em' },
      h2: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.015em' },
      h3: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
      overline: { letterSpacing: '0.12em', fontWeight: 600, fontSize: '0.72rem' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${isDark ? colors.borderDark : colors.borderLight}`,
            backgroundColor: isDark ? colors.panelDark : colors.panelLight,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, paddingLeft: 16, paddingRight: 16 },
          containedPrimary: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? colors.panelDark : colors.panelLight,
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            color: isDark ? '#e8edf1' : '#1c2530',
            borderBottom: `1px solid ${isDark ? colors.borderDark : colors.borderLight}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 12,
            backgroundColor: '#1c2530',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e8edf1',
          },
        },
      },
    },
  });
};

export const palette = colors;

/**
 * Helpers de layout y paleta de Plotly, mantenidos en sintonía con MUI.
 */
export const plotlyLayout = (isDark) => ({
  paper_bgcolor:  'rgba(0,0,0,0)',
  plot_bgcolor:   'rgba(0,0,0,0)',
  font: {
    family: 'Inter, system-ui, sans-serif',
    color:  isDark ? '#e8edf1' : '#1c2530',
    size:   12,
  },
  colorway: [
    colors.brand,        // verde    (biomasa)
    colors.accent,       // ámbar    (etanol)
    '#5b9bd5',           // azul     (glucosa)
    '#b56fc8',           // violeta  (acetaldehído)
    '#e07060',           // rojo     (piruvato)
    '#62c9bd',           // turquesa (acetato)
    '#d09cf0',           // lavanda  (Xa)
    '#e8c44e',           // dorado   (XAcdh)
  ],
  margin: { l: 55, r: 16, t: 36, b: 44 },
  xaxis: {
    gridcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    zerolinecolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    linecolor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
  },
  yaxis: {
    gridcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    zerolinecolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    linecolor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    bordercolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  },
  hoverlabel: {
    bgcolor: isDark ? '#1c2530' : '#ffffff',
    bordercolor: colors.brand,
    font: { family: 'JetBrains Mono, monospace', size: 11 },
  },
});

export const variableColor = {
  s_glu:     '#5b9bd5',
  s_pyr:     '#e07060',
  s_acetald: '#b56fc8',
  s_acetate: '#62c9bd',
  s_EtOH:    colors.accent,
  x:         colors.brand,
  Xa:        '#d09cf0',
  XAcdh:     '#e8c44e',
  qO2:       '#7cd3ad',
  qCO2:      '#9aa6b2',
};

export const variableLabel = {
  s_glu:     'Glucose (g/L)',
  s_pyr:     'Pyruvate (g/L)',
  s_acetald: 'Acetaldehyde (g/L)',
  s_acetate: 'Acetate (g/L)',
  s_EtOH:    'Ethanol (g/L)',
  x:         'Biomass (g/L)',
  Xa:        'Xa  (g/g)',
  XAcdh:     'X_Acdh  (g/g)',
  qO2:       'qO₂  (mmol/g·h)',
  qCO2:      'qCO₂  (mmol/g·h)',
};
