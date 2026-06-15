import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, Grid, InputAdornment,
  Chip, Divider, CircularProgress, Alert, Tooltip, IconButton,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/RestoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAltRounded';
import SpeedIcon from '@mui/icons-material/SpeedRounded';
import FunctionsIcon from '@mui/icons-material/FunctionsRounded';
import Api from '../services/api';
import { useAppContext } from '../App';
import { palette } from '../theme/theme';

const GRUPOS = [
  { id: 'r1', title: 'r₁  Captación de glucosa / glucólisis',
    keys: ['k1l', 'K1l', 'k1h', 'K1h', 'k1e', 'K1e', 'K1i'] },
  { id: 'r2', title: 'r₂  Piruvato deshidrogenasa (Pdh)',
    keys: ['k2', 'K2', 'K2i'] },
  { id: 'r3', title: 'r₃  Piruvato descarboxilasa (Pdc)',
    keys: ['k3', 'K3'] },
  { id: 'r4', title: 'r₄  Acetaldehído deshidrogenasa (Acdh)',
    keys: ['k4', 'K4'] },
  { id: 'r5', title: 'r₅  Acetil-CoA sintetasa (Acs)',
    keys: ['k5', 'K5', 'k5e', 'K5e', 'K5i'] },
  { id: 'r6', title: 'r₆  Alcohol deshidrogenasa (Adh)',
    keys: ['k6', 'K6', 'k6r', 'K6e'] },
  { id: 'r7', title: 'r₇  Anabolismo desde glucosa',
    keys: ['k7', 'K7'] },
  { id: 'r8', title: 'r₈  Anabolismo desde acetato',
    keys: ['k8'] },
  { id: 'r9', title: 'r₉  Síntesis del compartimento Acdh',
    keys: ['k9', 'K9', 'k9e', 'K9e', 'K9i', 'k9c'] },
  { id: 'r10', title: 'r₁₀  Decaimiento del compartimento activo',
    keys: ['k10', 'K10', 'k10e', 'K10e'] },
  { id: 'r11', title: 'r₁₁  Decaimiento del compartimento Acdh',
    keys: ['k11'] },
];

export default function ParametersPage() {
  const { overrides, setOverrides, solver, setSolver, rk4Step, setRk4Step }
    = useAppContext();
  const [defaults, setDefaults] = useState(null);
  const [info, setInfo] = useState({});
  const [draft, setDraft] = useState({});
  const [bounds, setBounds] = useState({});
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([Api.parameterDefaults(), Api.parameterInfo()])
      .then(([d, i]) => {
        setDefaults(d.parameters);
        setBounds(d.bounds);
        setInfo(i);
        setDraft({ ...d.parameters, ...overrides });
      });
  }, []);

  const dirty = useMemo(() => {
    if (!defaults) return false;
    return Object.keys(defaults).some(k => Number(draft[k]) !== Number(defaults[k]));
  }, [draft, defaults]);

  const validate = (key, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return 'No es un número';
    if (num < 0) return 'Debe ser ≥ 0';
    if (bounds[key]) {
      const [lo, hi] = bounds[key];
      if (num < lo) return `Bajo el recomendado (${lo.toExponential(2)})`;
      if (num > hi) return `Sobre el recomendado (${hi.toExponential(2)})`;
    }
    return '';
  };

  const onChange = (key, value) => {
    setDraft(d => ({ ...d, [key]: value }));
    const err = validate(key, value);
    setErrors(e => ({ ...e, [key]: err }));
    setSaved(false);
  };

  const aplicar = () => {
    const blocking = Object.values(errors).some(e => e && e.startsWith('Bajo') === false && e !== '');
    if (blocking) return;
    const ov = {};
    Object.keys(defaults).forEach(k => {
      if (Number(draft[k]) !== Number(defaults[k])) ov[k] = Number(draft[k]);
    });
    setOverrides(ov);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const restaurar = () => {
    setDraft({ ...defaults });
    setOverrides({});
    setErrors({});
    setSaved(false);
  };

  if (!defaults) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  const nOverrides = Object.keys(overrides || {}).length;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between"
             alignItems={{ md: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ mt: 0.5 }}>Parámetros del Modelo</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1 }}>
            Constantes cinéticas (k) y de afinidad (K) tomadas de la Tabla 7 del artículo.
            Los cambios se propagan a todas las páginas de simulación hasta que restaures los originales.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {nOverrides > 0 && (
            <Chip
              size="small" color="warning"
              label={`${nOverrides} override${nOverrides > 1 ? 's' : ''} activo${nOverrides > 1 ? 's' : ''}`}
            />
          )}
          <Button onClick={restaurar} startIcon={<RestoreIcon />}>
            Restaurar valores del artículo
          </Button>
          <Button variant="contained" onClick={aplicar}
                  disabled={!dirty} startIcon={<SaveAltIcon />}>
            Aplicar
          </Button>
        </Stack>
      </Stack>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Overrides aplicados. Las próximas simulaciones usarán estos valores.
        </Alert>
      )}

      {/* ── Configuración del solver ─────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}
               alignItems={{ md: 'flex-end' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="text.secondary">
              <SpeedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
              MÉTODO NUMÉRICO
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Solver de las ecuaciones diferenciales
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
              Elegí cómo resolver el sistema de EDOs.  <b>LSODA</b> es adaptativo
              y muy rápido (recomendado para uso interactivo).  <b>RK4</b> es el
              clásico Runge-Kutta de 4° orden con paso fijo — más transparente
              numéricamente, pero más lento.
            </Typography>
            <ToggleButtonGroup
              value={solver} exclusive
              onChange={(_, v) => v && setSolver(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 3, py: 1, textTransform: 'none', fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: `${palette.brand}33`,
                    color: palette.brandLight,
                    borderColor: palette.brand,
                  },
                },
              }}
            >
              <ToggleButton value="lsoda">
                LSODA · adaptativo  <Chip label="por defecto" size="small"
                                          sx={{ ml: 1, height: 18, fontSize: 10 }} />
              </ToggleButton>
              <ToggleButton value="rk4">
                <FunctionsIcon sx={{ mr: 0.7, fontSize: 16 }} />
                RK4 · paso fijo
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {solver === 'rk4' && (
            <Box sx={{ minWidth: 250 }}>
              <TextField
                size="small" type="number" label="Paso h (horas)"
                fullWidth
                value={rk4Step}
                onChange={e => setRk4Step(Math.max(0.0001, Number(e.target.value)))}
                inputProps={{ step: 0.001, min: 0.0001, max: 1 }}
                helperText="Recomendado: 0.005 (por defecto). Con h ≥ 0.01 puede haber errores numéricos cerca de Dcrit por la cinética rápida del acetaldehído."
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* ── Constantes ───────────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        {GRUPOS.map(group => (
          <Grid item xs={12} md={6} key={group.id}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="overline" color="text.secondary">{group.id.toUpperCase()}</Typography>
              <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>{group.title}</Typography>
              <Grid container spacing={1.5}>
                {group.keys.map(key => {
                  const isModified = Number(draft[key]) !== Number(defaults[key]);
                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <TextField
                        size="small" type="number" fullWidth
                        label={key}
                        value={draft[key] ?? defaults[key]}
                        onChange={e => onChange(key, e.target.value)}
                        error={!!errors[key] && errors[key].startsWith('Debe')}
                        helperText={errors[key] || ' '}
                        inputProps={{ step: 'any' }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              {info[key] && (
                                <Tooltip title={info[key]}>
                                  <IconButton size="small" sx={{ p: 0.3 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.55 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </InputAdornment>
                          ),
                        }}
                        sx={isModified ? {
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.accent },
                        } : undefined}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
