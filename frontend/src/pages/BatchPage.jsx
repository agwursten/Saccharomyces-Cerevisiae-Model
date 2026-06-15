import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, Button, TextField, CircularProgress, Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import PlotCard from '../components/PlotCard';
import MetricCard from '../components/MetricCard';
import Api from '../services/api';
import { useAppContext } from '../App';
import { variableColor, palette } from '../theme/theme';

const CAMPOS = [
  { key: 's_glu',     label: 'Glucosa inicial (g/L)',     default: 15.0,   min: 0,  max: 200 },
  { key: 'x',         label: 'Biomasa inicial (g/L)',     default: 0.002,  min: 0,  max: 50,  step: 0.001 },
  { key: 'Xa',        label: 'Xa inicial (g/g)',           default: 0.1,    min: 0,  max: 1,   step: 0.01 },
  { key: 'XAcdh',     label: 'X_Acdh inicial (g/g)',       default: 0.0075, min: 0,  max: 0.5, step: 0.001 },
];

const GRUPOS = [
  { title: 'Sustratos',        keys: ['s_glu', 's_EtOH'],                yLabel: 'concentración (g/L)' },
  { title: 'Ramificación',     keys: ['s_pyr', 's_acetald', 's_acetate'], yLabel: 'concentración (g/L)' },
  { title: 'Biomasa y comp.',  keys: ['x', 'Xa', 'XAcdh'],                yLabel: 'x (g/L) · Xa, X_Acdh (g/g)' },
];

const ETIQUETAS_VAR = {
  s_glu:     'Glucosa (g/L)',
  s_pyr:     'Piruvato (g/L)',
  s_acetald: 'Acetaldehído (g/L)',
  s_acetate: 'Acetato (g/L)',
  s_EtOH:    'Etanol (g/L)',
  x:         'Biomasa (g/L)',
  Xa:        'Xa  (g/g)',
  XAcdh:     'X_Acdh  (g/g)',
};

const fmt = (v, d = 3) =>
  v === undefined || v === null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);

export default function BatchPage() {
  const { overrides, solver, rk4Step } = useAppContext();
  const [ic, setIc] = useState(() =>
    Object.fromEntries(CAMPOS.map(f => [f.key, f.default])));
  const [tEnd, setTEnd] = useState(35);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const resetear = () => {
    setIc(Object.fromEntries(CAMPOS.map(f => [f.key, f.default])));
    setTEnd(35); setResult(null); setError('');
  };

  const correr = async () => {
    setRunning(true); setError(''); setResult(null);
    try {
      const r = await Api.batchSimulate({
        t_end: tEnd, n_points: 600,
        initial_conditions: ic,
        overrides, solver, rk4_step: rk4Step,
      });
      setResult(r);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally { setRunning(false); }
  };

  return (
    <Box>
      {/* ── Header con imagen del reactor batch ──────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Box>
            <Typography variant="h3" sx={{ mb: 1 }}>Simulación Batch</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 700 }}>
              Corré un cultivo aerobio en frasco cerrado con condiciones iniciales arbitrarias
              y examiná la serie temporal completa de cada variable de estado del modelo.
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{
            p: 1.5, height: '100%', display: 'flex',
            flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.92)',
          }}>
            <Box component="img" src="/batch_diagram.png"
                 alt="Esquema de reactor batch"
                 sx={{ height: 150, width: 'auto', objectFit: 'contain' }} />
            <Typography variant="caption" color="rgba(0,0,0,0.6)"
                        sx={{ mt: 0.5, fontWeight: 500, letterSpacing: '0.05em' }}>
              REACTOR BATCH · SIN ALIMENTACIÓN NI SALIDA
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="overline" color="text.secondary">CONDICIONES INICIALES</Typography>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              {CAMPOS.map(f => (
                <TextField
                  key={f.key} size="small" type="number" label={f.label}
                  value={ic[f.key]}
                  onChange={e => setIc({ ...ic, [f.key]: Math.max(f.min, Number(e.target.value)) })}
                  inputProps={{ min: f.min, max: f.max, step: f.step ?? 0.1 }}
                  fullWidth
                />
              ))}
              <Divider />
              <TextField
                size="small" type="number" label="Tiempo de simulación (h)"
                value={tEnd}
                onChange={e => setTEnd(Math.max(0.1, Number(e.target.value)))}
                inputProps={{ min: 0.1, max: 200, step: 1 }}
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <Button onClick={resetear} startIcon={<RestartAltIcon />}>Resetear</Button>
                <Button
                  variant="contained" fullWidth
                  onClick={correr} disabled={running}
                  startIcon={running ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                >
                  Simular
                </Button>
              </Stack>
              {error && <Typography color="error" variant="caption">{error}</Typography>}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {result ? (
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <MetricCard label="Biomasa máxima" value={fmt(result.metrics.x_max, 3)} unit="g/L"
                            accent={palette.brand}
                            info={`alcanzada en t ≈ ${fmt(result.metrics.t_x_max, 1)} h`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard label="Etanol máximo" value={fmt(result.metrics.EtOH_max, 3)} unit="g/L"
                            accent={palette.accent} />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard label="Agotamiento glucosa" value={fmt(result.metrics.t_glu_depl, 2)} unit="h"
                            info="tiempo al que Sglu ≤ 1% del valor inicial" />
              </Grid>
              <Grid item xs={6} md={3}>
                <MetricCard label="Duración" value={fmt(tEnd, 1)} unit="h" />
              </Grid>
              <Grid item xs={12}>
                <PlotCard
                  title="RESUMEN"
                  subtitle="Concentraciones extracelulares + biomasa"
                  height={360}
                  data={[
                    { x: result.t, y: result.s_glu,   name: ETIQUETAS_VAR.s_glu,
                      line: { color: variableColor.s_glu, width: 2 } },
                    { x: result.t, y: result.s_EtOH,  name: ETIQUETAS_VAR.s_EtOH,
                      line: { color: variableColor.s_EtOH, width: 2 } },
                    { x: result.t, y: result.x,      name: ETIQUETAS_VAR.x,
                      line: { color: variableColor.x, width: 2 } },
                  ]}
                  layout={{
                    xaxis: { title: 'tiempo (h)' },
                    yaxis: { title: 'g/L' },
                    legend: { orientation: 'h', y: -0.18 },
                  }}
                />
              </Grid>
            </Grid>
          ) : (
            <Paper sx={{ p: 4, height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
                <Typography variant="h6" gutterBottom>Sin simulación todavía</Typography>
                <Typography color="text.secondary">
                  Ajustá las condiciones iniciales a la izquierda y apretá <b>Simular</b>.
                  Los valores por defecto reproducen la Fig. 5 del artículo.
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {result && (
        <Grid container spacing={2}>
          {GRUPOS.map(group => (
            <Grid item xs={12} md={4} key={group.title}>
              <PlotCard
                title={group.title.toUpperCase()}
                subtitle="Evolución temporal"
                data={group.keys.map(k => ({
                  x: result.t, y: result[k], name: ETIQUETAS_VAR[k],
                  line: { color: variableColor[k], width: 2 },
                }))}
                layout={{
                  xaxis: { title: 'tiempo (h)' },
                  yaxis: { title: group.yLabel },
                  legend: { orientation: 'h', y: -0.25 },
                }}
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <PlotCard
              title="INTERCAMBIO GASEOSO" subtitle="qO₂ y qCO₂"
              data={[
                { x: result.t, y: result.qO2,  name: 'qO₂',
                  line: { color: variableColor.qO2, width: 2 } },
                { x: result.t, y: result.qCO2, name: 'qCO₂',
                  line: { color: variableColor.qCO2, width: 2 } },
              ]}
              layout={{
                xaxis: { title: 'tiempo (h)' },
                yaxis: { title: 'mmol g⁻¹ h⁻¹' },
              }}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
