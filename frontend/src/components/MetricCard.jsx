import React from 'react';
import { Card, CardContent, Box, Typography, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * Tarjeta compacta de métrica usada en los dashboards.
 */
export default function MetricCard({ label, value, unit, info, accent }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {label}
          </Typography>
          {info && (
            <Tooltip title={info} placement="top">
              <IconButton size="small" sx={{ p: 0.25 }}>
                <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.5 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.25 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
              color: accent || 'text.primary',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
              {unit}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
