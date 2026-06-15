import React from 'react';
import { AppBar, Toolbar, Box, Tabs, Tab, IconButton, Tooltip, Typography } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import { palette } from '../theme/theme';

const NAV = [
  { to: '/',           label: 'Teoría y Reproducción' },
  { to: '/chemostat',  label: 'Quimiostato' },
  { to: '/batch',      label: 'Batch' },
  { to: '/parameters', label: 'Parámetros' },
];

export default function NavigationBar({ mode, onToggleMode }) {
  const location = useLocation();
  const idx = Math.max(0, NAV.findIndex(n => n.to === location.pathname));

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 3, minHeight: '60px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 30, height: 30, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${palette.brandLight}, ${palette.brandDark})`,
              boxShadow: `0 0 0 2px ${palette.brand}22`,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 8, left: 7,
                width: 7, height: 7, borderRadius: '50%',
                background: palette.accent,
                opacity: 0.9,
              },
            }}
          />
          <Box>
            <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1, fontSize: 16, fontStyle: 'italic' }}>
              Saccharomyces Cerevisiae Model
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5, letterSpacing: '0.05em' }}>
              LEI · ROTBØLL · JØRGENSEN · 2001
            </Typography>
          </Box>
        </Box>

        <Tabs
          value={idx}
          variant="scrollable"
          sx={{ flexGrow: 1, ml: 4, minHeight: 60 }}
          TabIndicatorProps={{ sx: { height: 2, background: palette.brand } }}
        >
          {NAV.map((n, i) => (
            <Tab
              key={n.to}
              label={n.label}
              component={NavLink}
              to={n.to}
              sx={{
                minHeight: 60,
                fontSize: 13.5,
                fontWeight: 500,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'text.primary' },
              }}
            />
          ))}
        </Tabs>

        <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
          <IconButton onClick={onToggleMode} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
