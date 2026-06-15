import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, Slider, Button, Stepper, Step, StepLabel,
  CircularProgress, TextField, Chip, Divider, Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import PlotCard from '../components/PlotCard';
import MetricCard from '../components/MetricCard';
import Api from '../services/api';
import { useAppContext } from '../App';
import { variableColor, variableLabel, palette } from '../theme/theme';

const GRUPOS_ESTADO = [
  { title: 'Sustratos',     keys: ['s_glu', 's_EtOH'],                yLabel: 'concentración (g/L)' },
  { title: 'Ramificación',  keys: ['s_pyr', 's_acetald', 's_acetate'], yLabel: 'concentración (g/L)' },
  { title: 'Biomasa',       keys: ['x', 'Xa', 'XAcdh'],                yLabel: 'x (g/L) · Xa, X_Acdh (g/g)' },
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

const isValid = (v) => v !== null && v !== undefined && !Number.isNaN(v);

const fmt = (v, d = 3) =>
  isValid(v) ? Number(v).toFixed(d) : '—';

export default function ChemostatPage() {
  const { overrides, solver, rk4Step } = useAppContext();
  const [step, setStep] = useState(0);

  // Paso 1
  const [Sf, setSf] = useState(30);

  // Paso 2
  const [analyzing, setAnalyzing] = useState(false);
  const [sweep, setSweep] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Paso 4
  const [D, setD] = useState(0.30);
  const [tEnd, setTEnd] = useState(50);
  const [dynRun, setDynRun] = useState(false);
  const [dynamic, setDynamic] = useState(null);

  const analizar = async () => {
    setAnalyzing(true);
    setSweep(null);
    try {
      const r = await Api.chemostatSweep({
        Sf, D_min: 0.02, D_max: 0.55, n: 60,
        overrides, solver, rk4_step: rk4Step,
      });
      setSweep(r.sweep);
      setMetrics(r.metrics);
      if (isValid(r.metrics.Dcrit)) {
        setD(Math.max(0.05, r.metrics.Dcrit - 0.05));
      }
      setStep(1);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const correrDinamica = async () => {
    setDynRun(true);
    setDynamic(null);
    try {
      const r = await Api.chemostatDynamic({
        D, Sf, t_end: tEnd, n_points: 500,
        overrides, solver, rk4_step: rk4Step,
      });
      setDynamic(r);
      setStep(3);
    } catch (e) { console.error(e); } finally { setDynRun(false); }
  };

  const resetear = () => {
    setSweep(null); setMetrics(null); setDynamic(null); setStep(0);
  };

  // Formas verticales para los plots de estado estacionario
  const regionShapes = useMemo(() => {
    if (!metrics || !sweep) return [];
    const { Dcrit, Dwashout } = metrics;
    const Dmax = Math.max(...sweep.D);
    const shapes = [];
    if (isValid(Dcrit)) {
      shapes.push({
        type: 'rect', xref: 'x', yref: 'paper',
        x0: 0, x1: Dcrit, y0: 0, y1: 1,
        fillcolor: `${palette.brand}1c`, line: { width: 0 },
        layer: 'below',
      });
    }
    if (isValid(Dcrit) && isValid(Dwashout)) {
      shapes.push({
        type: 'rect', xref: 'x', yref: 'paper',
        x0: Dcrit, x1: Dwashout, y0: 0, y1: 1,
        fillcolor: `${palette.accent}1f`, line: { width: 0 },
        layer: 'below',
      });
    }
    if (isValid(Dwashout)) {
      shapes.push({
        type: 'rect', xref: 'x', yref: 'paper',
        x0: Dwashout, x1: Dmax, y0: 0, y1: 1,
        fillcolor: `rgba(224,112,96,0.18)`, line: { width: 0 },
        layer: 'below',
      });
    }
    if (isValid(metrics.D_opt_biomass)) {
      shapes.push({
        type: 'line', xref: 'x', yref: 'paper',
        x0: metrics.D_opt_biomass, x1: metrics.D_opt_biomass, y0: 0, y1: 1,
        line: { color: palette.brand, width: 2.5, dash: 'dot' },
        layer: 'above',
      });
    }
    if (isValid(metrics.D_opt_prod)) {
      shapes.push({
        type: 'line', xref: 'x', yref: 'paper',
        x0: metrics.D_opt_prod, x1: metrics.D_opt_prod, y0: 0, y1: 1,
        line: { color: palette.accent, width: 2.5, dash: 'dot' },
        layer: 'above',
      });
    }
    return shapes;
  }, [metrics, sweep]);

  // Marcas Dcrit/Dwashout para el slider del paso 4 — con valor numérico
  const sliderMarks = useMemo(() => {
    if (!metrics) return false;
    const marks = [];
    if (isValid(metrics.Dcrit)) {
      marks.push({
        value: metrics.Dcrit,
        label: `Dcrit (${metrics.Dcrit.toFixed(2)})`,
      });
    }
    if (isValid(metrics.Dwashout)) {
      marks.push({
        value: metrics.Dwashout,
        label: `Dwo (${metrics.Dwashout.toFixed(2)})`,
      });
    }
    return marks.length ? marks : false;
  }, [metrics]);

  return (
    <Box>
      {/* ── Header con imagen del reactor ────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Box>
            <Typography variant="h3" sx={{ mb: 1 }}>Simulador de Quimiostato</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Elegí una concentración de glucosa de alimentación, ejecutá un análisis
              automático del régimen de operación y luego explorá la evolución temporal
              para cualquier punto de operación individual.
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
            <Box component="img" src="/chemostat_diagram.png"
                 alt="Esquema de quimiostato"
                 sx={{ height: 150, width: 'auto', objectFit: 'contain' }} />
            <Typography variant="caption" color="rgba(0,0,0,0.6)"
                        sx={{ mt: 0.5, fontWeight: 500, letterSpacing: '0.05em' }}>
              CSTR · ALIMENTACIÓN Y SALIDA CONTINUAS
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── ¿Qué es D? ───────────────────────────────────────────────────── */}
      <Paper sx={{ p: 2.5, mb: 3, borderLeft: `3px solid ${palette.brand}` }}>
        <Typography variant="overline" color="text.secondary">¿QUÉ ES LA TASA DE DILUCIÓN D?</Typography>
        <Grid container spacing={2} sx={{ mt: 0.2 }} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              En un quimiostato continuo la velocidad a la que se renueva el contenido
              del reactor se mide con la <b>tasa de dilución</b> D. Es el caudal
              volumétrico que atraviesa el reactor (alimentación que entra = efluente
              que sale, porque el volumen se mantiene constante) dividido por el
              volumen útil del biorreactor. En estado estacionario D coincide
              numéricamente con la velocidad específica de crecimiento de la población
              (μ = D), por lo que controlar D equivale a fijar μ — uno de los motivos
              por los que el quimiostato es tan usado para estudiar metabolismo
              microbiano.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 1.5, p: 2, borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1.4rem',
            }}>
              <Box component="span">D&nbsp;=</Box>
              {/* Fraction F/V using inline-grid: row 1 numerator, row 2 bar, row 3 denominator */}
              <Box sx={{
                display: 'inline-grid',
                gridTemplateRows: 'auto auto auto',
                justifyItems: 'center',
                rowGap: 0,
                lineHeight: 1.05,
              }}>
                <Box sx={{ px: 1 }}>F</Box>
                <Box sx={{
                  height: '1.5px',
                  width: '100%',
                  bgcolor: 'currentColor',
                  my: '3px',
                }} />
                <Box sx={{ px: 1 }}>V</Box>
              </Box>
              <Box component="span" sx={{ ml: 1, fontSize: '0.85rem',
                                          color: 'text.secondary' }}>
                [ h⁻¹ ]
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', mt: 1.2,
                              maxWidth: 360, mx: 'auto' }}>
              F: caudal volumétrico de operación, L/h (igual a la entrada y a la salida)<br />
              V: volumen útil del reactor, L
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        <Step><StepLabel>Elegí Sf</StepLabel></Step>
        <Step><StepLabel>Análisis de régimen</StepLabel></Step>
        <Step><StepLabel>Mapa de régimen</StepLabel></Step>
        <Step><StepLabel>Simulación dinámica</StepLabel></Step>
      </Stepper>

      {/* ── Paso 1: Slider de Sf ─────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="text.secondary">PASO 1</Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Glucosa de alimentación  Sf = {Sf.toFixed(1)} g/L
            </Typography>
            <Slider
              value={Sf}
              min={5} max={150} step={1}
              onChange={(_, v) => setSf(v)}
              valueLabelDisplay="auto"
              marks={[
                { value: 15, label: '15' }, { value: 30, label: '30' },
                { value: 50, label: '50' }, { value: 100, label: '100' },
              ]}
              sx={{ maxWidth: 600 }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={resetear} startIcon={<RestartAltIcon />}>Resetear</Button>
            <Button
              variant="contained" size="large"
              onClick={analizar}
              disabled={analyzing}
              startIcon={analyzing ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            >
              Analizar régimen
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Paso 2: Sweep + métricas + gráficas ──────────────────────────── */}
      {sweep && metrics && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <MetricCard label="Dcrit" value={fmt(metrics.Dcrit)} unit="h⁻¹"
                          accent={palette.accent}
                          info="Aparición de fermentación alcohólica aerobia" />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard label="Dwashout" value={fmt(metrics.Dwashout)} unit="h⁻¹"
                          accent={palette.danger}
                          info="Lavado: μmax superado por D" />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard label="D para máx. biomasa" value={fmt(metrics.D_opt_biomass)} unit="h⁻¹"
                          accent={palette.brand}
                          info={`x = ${fmt(metrics.x_max, 2)} g/L`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard label="D para máx. productividad" value={fmt(metrics.D_opt_prod)} unit="h⁻¹"
                          accent={palette.brandLight}
                          info={`Prod. = ${fmt(metrics.productivity_max, 2)} g L⁻¹ h⁻¹`} />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <PlotCard
                title="ESTADO ESTACIONARIO"
                subtitle="Biomasa vs tasa de dilución"
                data={[
                  { x: sweep.D, y: sweep.x, name: 'Biomasa',
                    line: { color: variableColor.x, width: 2 } },
                ]}
                layout={{
                  xaxis: { title: 'D (h⁻¹)' },
                  yaxis: { title: 'x (g/L)' },
                  shapes: regionShapes,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <PlotCard
                title="ESTADO ESTACIONARIO"
                subtitle="Productividad volumétrica (D · x)"
                data={[
                  { x: sweep.D, y: sweep.productivity, name: 'Productividad',
                    line: { color: palette.brandLight, width: 2 } },
                ]}
                layout={{
                  xaxis: { title: 'D (h⁻¹)' },
                  yaxis: { title: 'D · x (g L⁻¹ h⁻¹)' },
                  shapes: regionShapes,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <PlotCard
                title="ESTADO ESTACIONARIO"
                subtitle="Etanol vs tasa de dilución"
                data={[
                  { x: sweep.D, y: sweep.s_EtOH, name: 'Etanol',
                    line: { color: variableColor.s_EtOH, width: 2 } },
                ]}
                layout={{
                  xaxis: { title: 'D (h⁻¹)' },
                  yaxis: { title: 'Etanol (g/L)' },
                  shapes: regionShapes,
                }}
              />
            </Grid>
          </Grid>

          {/* ── Paso 3: Retrato de fase ──────────────────────────────────── */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="overline" color="text.secondary">PASO 3</Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>Régimen de operación</Typography>
            <Stack direction="row" spacing={1.2} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" label="OXIDATIVO  D < Dcrit"
                    sx={{ bgcolor: `${palette.brand}22`, color: palette.brandLight }} />
              <Chip size="small" label="OXIDO-REDUCTIVO  Dcrit < D < Dwashout"
                    sx={{ bgcolor: `${palette.accent}22`, color: palette.accent }} />
              <Chip size="small" label="LAVADO  D > Dwashout"
                    sx={{ bgcolor: `${palette.danger}22`, color: palette.danger }} />
              <Chip size="small" variant="outlined"
                    sx={{ borderColor: palette.brand, color: palette.brand }}
                    label="• • D para máx. biomasa" />
              <Chip size="small" variant="outlined"
                    sx={{ borderColor: palette.accent, color: palette.accent }}
                    label="• • D para máx. productividad" />
            </Stack>
            <PlotCard
              title="MAPA DE RÉGIMEN"
              subtitle="Biomasa · etanol · glucosa superpuestos"
              height={340}
              data={[
                { x: sweep.D, y: sweep.x,      name: 'Biomasa', yaxis: 'y',
                  line: { color: variableColor.x, width: 2.5 } },
                { x: sweep.D, y: sweep.s_EtOH, name: 'Etanol', yaxis: 'y',
                  line: { color: variableColor.s_EtOH, width: 2.5 } },
                { x: sweep.D, y: sweep.s_glu,  name: 'Glucosa', yaxis: 'y2',
                  line: { color: variableColor.s_glu, dash: 'dot' } },
              ]}
              layout={{
                xaxis: { title: 'D (h⁻¹)' },
                yaxis: { title: 'Biomasa / Etanol (g/L)' },
                yaxis2: { title: 'Glucosa (g/L)', overlaying: 'y', side: 'right' },
                shapes: regionShapes,
                annotations: [
                  ...(metrics && isValid(metrics.D_opt_biomass) ? [{
                    x: metrics.D_opt_biomass, xref: 'x', yref: 'paper', y: 1.03,
                    text: 'D para máx. biomasa', showarrow: false,
                    font: { color: palette.brand, size: 11 },
                  }] : []),
                  ...(metrics && isValid(metrics.D_opt_prod) ? [{
                    x: metrics.D_opt_prod, xref: 'x', yref: 'paper', y: 0.95,
                    text: 'D para máx. productividad', showarrow: false,
                    font: { color: palette.accent, size: 11 },
                  }] : []),
                ],
                legend: { orientation: 'h', y: -0.18 },
              }}
            />
          </Paper>

          {/* ── Paso 4: Simulación dinámica ──────────────────────────────── */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="overline" color="text.secondary">PASO 4</Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Elegí un valor de D y observá la evolución del quimiostato
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  D = <Box component="span" className="mono">{D.toFixed(3)}</Box> h⁻¹
                  &nbsp;·&nbsp; Sf = <Box component="span" className="mono">{Sf}</Box> g/L
                </Typography>
                <Box sx={{ pb: 3.5 }}>
                  <Slider
                    value={D} min={0.02} max={0.55} step={0.005}
                    onChange={(_, v) => setD(v)}
                    marks={sliderMarks}
                    sx={{
                      maxWidth: 600,
                      '& .MuiSlider-mark': {
                        backgroundColor: palette.accent,
                        width: 3, height: 14,
                        transform: 'translate(-50%, -50%)',
                      },
                      '& .MuiSlider-markLabel': {
                        fontSize: 11,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: palette.accent,
                        whiteSpace: 'nowrap',
                      },
                    }}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
              <Box sx={{ minWidth: 220 }}>
                <TextField
                  size="small" label="Tiempo de simulación (h)" type="number"
                  value={tEnd} onChange={e => setTEnd(Math.max(1, Number(e.target.value)))}
                  inputProps={{ min: 1, max: 1000 }} fullWidth sx={{ mb: 1 }}
                />
                <Button
                  variant="contained" fullWidth
                  onClick={correrDinamica} disabled={dynRun}
                  startIcon={dynRun ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                >
                  Simular
                </Button>
              </Box>
            </Stack>
          </Paper>

          {dynamic && (
            <Grid container spacing={2}>
              {GRUPOS_ESTADO.map(group => (
                <Grid item xs={12} md={4} key={group.title}>
                  <PlotCard
                    title={group.title.toUpperCase()}
                    subtitle="Evolución temporal"
                    data={group.keys.map(k => ({
                      x: dynamic.t, y: dynamic[k], name: ETIQUETAS_VAR[k],
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
                  title="INTERCAMBIO GASEOSO"
                  subtitle="qO₂ y qCO₂ en el tiempo"
                  data={[
                    { x: dynamic.t, y: dynamic.qO2,  name: 'qO₂',
                      line: { color: variableColor.qO2,  width: 2 } },
                    { x: dynamic.t, y: dynamic.qCO2, name: 'qCO₂',
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
        </>
      )}

      {!sweep && !analyzing && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          Apretá <b>Analizar régimen</b> para calcular los estados estacionarios a lo largo
          de D e identificar Dcrit, Dwashout y los puntos óptimos de operación.
        </Alert>
      )}
    </Box>
  );
}
