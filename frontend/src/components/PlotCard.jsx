import React from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, Typography, Box, Divider, useTheme } from '@mui/material';
import { plotlyLayout } from '../theme/theme';

/**
 * Normaliza el título de un eje de Plotly. Plotly 2.x acepta tanto un
 * string como un objeto {text, font, standoff}; siempre emitimos la forma
 * objeto para que la tipografía y el espaciado queden consistentes con el
 * tema de MUI.
 */
function axisTitle(t, isDark) {
  if (!t) return undefined;
  const text = typeof t === 'string' ? t : (t.text || '');
  if (!text) return undefined;
  return {
    text,
    font: {
      family: '"Inter", system-ui, sans-serif',
      size: 12,
      color: isDark ? '#b8c3cf' : '#3b4754',
      ...(typeof t === 'object' ? t.font : {}),
    },
    standoff: typeof t === 'object' && t.standoff != null ? t.standoff : 10,
  };
}

/**
 * Tarjeta reusable de Plotly. Recibe `data`, `layout`, opcionalmente
 * `title`/`subtitle` para el encabezado de la tarjeta y opcionalmente
 * `explanation` para renderizar una pequeña descripción en cursiva dentro
 * de la misma tarjeta (debajo del gráfico).
 */
export default function PlotCard({
  data, layout, title, subtitle, height = 320, config, explanation,
  sx = {},
}) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const base = plotlyLayout(isDark);

  // Mezcla el layout del usuario con los valores por defecto del tema, y
  // luego *fuerza* la normalización del título de los ejes para que las
  // etiquetas siempre se rendericen con la tipografía consistente con MUI.
  const userX = layout?.xaxis || {};
  const userY = layout?.yaxis || {};
  const userY2 = layout?.yaxis2;

  const mergedLayout = {
    ...base,
    ...layout,
    autosize: true,
    height,
    xaxis: {
      ...base.xaxis,
      ...userX,
      title: axisTitle(userX.title, isDark),
    },
    yaxis: {
      ...base.yaxis,
      ...userY,
      title: axisTitle(userY.title, isDark),
    },
    ...(userY2 ? {
      yaxis2: {
        ...base.yaxis,
        ...userY2,
        title: axisTitle(userY2.title, isDark),
      },
    } : {}),
    legend: { ...base.legend, ...(layout?.legend || {}) },
    // Margen inferior un poco mayor para que el título del eje x no se recorte
    margin: { ...base.margin, b: 56, ...(layout?.margin || {}) },
  };

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', ...sx }}>
      {(title || subtitle) && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
          {title && <Typography variant="overline" color="text.secondary">{title}</Typography>}
          {subtitle && <Typography variant="body2" sx={{ mt: 0.2 }}>{subtitle}</Typography>}
        </Box>
      )}
      <CardContent sx={{ pt: 1, pb: explanation ? 1 : '12px !important', flexGrow: 1 }}>
        <Plot
          data={data}
          layout={mergedLayout}
          style={{ width: '100%', height: `${height}px` }}
          useResizeHandler
          config={{
            displaylogo: false,
            responsive: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
            ...config,
          }}
        />
      </CardContent>
      {explanation && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', lineHeight: 1.55 }}>
              {explanation}
            </Typography>
          </Box>
        </>
      )}
    </Card>
  );
}
