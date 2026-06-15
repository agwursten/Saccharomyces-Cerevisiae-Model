import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Stack, Chip,
  Accordion, AccordionSummary, AccordionDetails, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, CircularProgress, Divider,
  LinearProgress, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import PlotCard from '../components/PlotCard';
import Api from '../services/api';
import { variableColor, palette } from '../theme/theme';

const REACCIONES = [
  ['r₁',  'Glucólisis',                     'Sglu → Spyr + 0.33 NADH'],
  ['r₂',  'Pdh — oxidación de piruvato',    'Spyr → CO₂ + 1.67 NADH'],
  ['r₃',  'Pdc — piruvato a acetaldehído',  'Spyr → 0.67 Sacetald + 0.33 CO₂'],
  ['r₄',  'Acdh — acetaldehído a acetato',  'Sacetald → Sacetate + 0.5 NADH'],
  ['r₅',  'Acs — respiración de acetato',   'Sacetate → CO₂ + 2 NADH'],
  ['r₆',  'Adh — formación de etanol',      'Sacetald + 0.5 NADH ⇌ SEtOH'],
  ['r₇',  'Anabolismo desde glucosa',       'Sglu → 0.913 Xa + 0.087 CO₂ + 0.119 NADH'],
  ['r₈',  'Anabolismo desde acetato',       'Sacetate → 0.778 Xa + 0.222 CO₂ + 0.401 NADH'],
  ['r₉',  'Síntesis compartimento Acdh',    'Xa → X_Acdh'],
  ['r₁₀', 'Decaimiento compartimento Xa',   'Xa → ∅'],
  ['r₁₁', 'Decaimiento compartimento Acdh', 'X_Acdh → ∅'],
  ['r₁₂', 'Fosforilación oxidativa',        'NADH + ½ O₂ → ATP'],
];

const VARIABLES = [
  ['Sglu',     'Concentración extracelular de glucosa (g/L)'],
  ['Spyr',     'Concentración extracelular de piruvato (g/L)'],
  ['Sacetald', 'Concentración extracelular de acetaldehído (g/L)'],
  ['Sacetate', 'Concentración extracelular de acetato (g/L)'],
  ['SEtOH',    'Concentración extracelular de etanol (g/L)'],
  ['x',        'Concentración de biomasa en peso seco (g/L)'],
  ['Xa',       'Compartimento activo — RNA / ribosomas / enzimas por unidad de biomasa'],
  ['X_Acdh',   'Compartimento de la acetaldehído-deshidrogenasa por unidad de biomasa'],
  ['Dcrit',    'Tasa de dilución crítica donde comienza la fermentación alcohólica'],
  ['Dwashout', 'Tasa de dilución a la que la biomasa se lava del reactor'],
];

const BALANCES = `
ds_glu/dt     = (−r1 − r7) · x + (Sf − s_glu) · D
ds_pyr/dt     = ( r1 − r2 − r3 ) · x − s_pyr · D
ds_acetald/dt = ( 0.5·r3 − r4 − r6 ) · x − s_acetald · D
ds_acetate/dt = ( 1.363·r4 − r5 − r8 ) · x − s_acetate · D
ds_EtOH/dt    = 1.045·r6 · x − s_EtOH · D
dx/dt         = ( 0.732·r7 + 0.619·r8 − D ) · x
dXa/dt        = 0.732·r7 + 0.619·r8 − r9 − r10 − μ·Xa
dXAcdh/dt     = r9 − r11 − μ·XAcdh
`;

const SUPUESTOS_BIOTICOS = [
  'Todas las células del biorreactor son fisiológicamente idénticas (representación de célula promedio).',
  'El interior celular se agrupa en dos compartimentos funcionales: un compartimento activo Xa (ribosomas, RNA, enzimas glucolíticas) y un compartimento de acetaldehído-deshidrogenasa X_Acdh que captura la capacidad limitante del bypass acetaldehído → acetato.',
  'El acetaldehído actúa como señal metabólica: cuando la capacidad intracelular de Acdh se satura, el acetaldehído se acumula y dispara el flujo glucolítico excesivo (r₁ᵉ).',
  'La biomasa tiene composición elemental constante CH₁.₆₁O₀.₅₂N₀.₁₅ (Roels, 1983).',
  'Las reacciones catabólicas y anabólicas pueden tratarse por separado, sin balance explícito de ATP — la demanda energética está implícita en la estequiometría.',
  'Se desprecian efectos a nivel poblacional como las fases de lag o la sincronización del ciclo celular.',
];

const SUPUESTOS_ABIOTICOS = [
  'El biorreactor se comporta como un CSTR perfectamente mezclado — no hay gradientes espaciales de concentración.',
  'La operación es totalmente aeróbica; el oxígeno disuelto nunca es limitante (no aparecen términos de transferencia de O₂ en los balances).',
  'Condiciones de operación constantes: temperatura, pH y velocidad de agitación se mantienen en el setpoint experimental.',
  'El volumen del reactor permanece constante durante la operación (quimiostato o batch).',
  'La alimentación es estéril y contiene únicamente glucosa como fuente de carbono.',
  'No hay crecimiento sobre las paredes, no hay formación de espuma y la evaporación de especies volátiles (etanol, acetaldehído) es despreciable.',
];

export default function TheoryPage() {
  const [loading, setLoading] = useState({ active: false, step: 0, total: 5 });
  const [error, setError] = useState('');
  const [figs, setFigs] = useState({});

  const reproducir = async () => {
    setError('');
    setFigs({});
    setLoading({ active: true, step: 0, total: 5 });
    const pasos = [
      { key: 'fig3',   label: 'Figura 3 — estado estacionario en quimiostato',  fn: Api.fig3 },
      { key: 'fig5',   label: 'Figura 5 — simulación batch',                    fn: Api.fig5 },
      { key: 'fig10A', label: 'Figura 10A — diagrama de bifurcación',           fn: Api.fig10A },
      { key: 'fig10B', label: 'Figura 10B — región de multiplicidad',           fn: Api.fig10B },
      { key: 'fig11',  label: 'Figura 11 — acetaldehído vs D',                  fn: Api.fig11 },
    ];
    try {
      for (let i = 0; i < pasos.length; i++) {
        setLoading({ active: true, step: i, total: pasos.length, label: pasos[i].label });
        const data = await pasos[i].fn();
        setFigs(prev => ({ ...prev, [pasos[i].key]: data }));
      }
    } catch (e) {
      setError(e?.message || 'Error al reproducir las figuras del artículo');
    } finally {
      setLoading({ active: false, step: 0, total: 5 });
    }
  };

  return (
    <Box>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-end' }}
             justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ mt: 0.5 }}>Teoría y Reproducción</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1 }}>
            Modelo bioquímicamente estructurado del crecimiento aerobio de
            <i> Saccharomyces cerevisiae</i> sobre glucosa y etanol —
            construido en torno al metabolismo de desborde (overflow) en los puntos de ramificación del piruvato y el acetaldehído.
          </Typography>
        </Box>
        <Button
          variant="contained" size="large"
          startIcon={loading.active
            ? <CircularProgress size={18} color="inherit" />
            : <ScienceOutlinedIcon />}
          onClick={reproducir} disabled={loading.active}
        >
          Reproducir figuras del artículo
        </Button>
      </Stack>

      {/* ── Barra de progreso ────────────────────────────────────────────── */}
      {loading.active && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {loading.label}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(loading.step / loading.total) * 100}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {loading.step + 1}/{loading.total}
            </Typography>
          </Stack>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Mapa metabólico (imagen del paper) ───────────────────────────── */}
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">MAPA METABÓLICO</Typography>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Puntos de ramificación de piruvato y acetaldehído
        </Typography>
        <Box sx={{
          display: 'flex', justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.95)',
          borderRadius: 1, p: 2,
        }}>
          <Box
            component="img"
            src="/metabolic_map.png"
            alt="Mapa metabólico del modelo estructurado (Lei et al., 2001)"
            sx={{ maxWidth: '100%', height: 'auto', maxHeight: 300 }}
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip size="small" label="Catabolismo — lóbulo izquierdo"
                sx={{ bgcolor: `${palette.brand}22`, color: palette.brandLight }} />
          <Chip size="small" label="Anabolismo — lóbulo derecho"
                sx={{ bgcolor: `${palette.accent}22`, color: palette.accent }} />
          <Chip size="small" label="r₉ enlaza Xa → X_Acdh" variant="outlined" />
          <Chip size="small" label="r₁₀, r₁₁ son decaimientos" variant="outlined" />
        </Stack>
      </Paper>

      {/* ── Regímenes ────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Crecimiento oxidativo (D < Dcrit)', body: 'La glucosa se respira completamente. La biomasa y el CO₂ son los principales productos. El etanol es indetectable.' },
          { title: 'Transición de Crabtree (D ≈ Dcrit)', body: 'El acetaldehído se acumula y dispara la glucólisis en exceso. El bypass de Acdh se satura y aparece etanol por desborde.' },
          { title: 'Oxido-reductivo (D > Dcrit)',  body: 'El flujo glucolítico excede la capacidad respiratoria. Se produce etanol significativo incluso con aireación total.' },
          { title: 'Lavado (D > Dwashout)',  body: 'La velocidad específica de crecimiento cae por debajo de D. La glucosa se acumula y la biomasa colapsa.' },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="overline" color="text.secondary">RÉGIMEN</Typography>
              <Typography variant="h6" sx={{ mt: 0.5, mb: 1, fontSize: '0.98rem' }}>
                {c.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">{c.body}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Supuestos ────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="overline" color="text.secondary">SUPUESTOS BIÓTICOS</Typography>
            <Typography variant="h6" sx={{ mb: 1.5, mt: 0.5 }}>
              Sobre las células
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
              {SUPUESTOS_BIOTICOS.map((a, i) => (
                <Typography component="li" variant="body2" color="text.secondary"
                            key={i} sx={{ mb: 1.1 }}>
                  {a}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="overline" color="text.secondary">SUPUESTOS ABIÓTICOS</Typography>
            <Typography variant="h6" sx={{ mb: 1.5, mt: 0.5 }}>
              Sobre el biorreactor
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
              {SUPUESTOS_ABIOTICOS.map((a, i) => (
                <Typography component="li" variant="body2" color="text.secondary"
                            key={i} sx={{ mb: 1.1 }}>
                  {a}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Acordeones ───────────────────────────────────────────────────── */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Ecuaciones de balance de masa</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="pre" className="mono"
               sx={{ p: 2, m: 0, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', overflow: 'auto' }}>
            {BALANCES}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            μ es la <b>velocidad específica de crecimiento</b> (h⁻¹) de la biomasa,
            definida en este modelo como μ = 0.732·r₇ + 0.619·r₈; los coeficientes
            0.732 y 0.619 son los rendimientos estequiométricos de biomasa por unidad
            de glucosa (r₇) y de acetato (r₈) consumidos para anabolismo.
            El sistema de EDOs se resuelve numéricamente (por defecto con LSODA
            adaptativo, opcionalmente con Runge-Kutta clásico de 4° orden de paso fijo
            configurable en la sección de Parámetros).
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Reacciones</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>id</TableCell>
                  <TableCell>nombre</TableCell>
                  <TableCell>estequiometría</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {REACCIONES.map(([id, name, stoich]) => (
                  <TableRow key={id} hover>
                    <TableCell className="mono">{id}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell className="mono">{stoich}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Variables de estado y cantidades clave</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {VARIABLES.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="mono" sx={{ width: 140 }}>{k}</TableCell>
                    <TableCell>{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* ── Figuras reproducidas ─────────────────────────────────────────── */}
      {Object.keys(figs).length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }}>
            <Chip label="FIGURAS DEL ARTÍCULO REPRODUCIDAS" variant="outlined" />
          </Divider>

          <Grid container spacing={2}>
            {figs.fig3 && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 3" subtitle="Estado estacionario en quimiostato — Sf = 15 g/L"
                  data={[
                    { x: figs.fig3.D, y: figs.fig3.x,      name: 'Biomasa',  line: { color: variableColor.x,     width: 2 } },
                    { x: figs.fig3.D, y: figs.fig3.s_EtOH, name: 'Etanol',   line: { color: variableColor.s_EtOH,width: 2 } },
                    { x: figs.fig3.D, y: figs.fig3.s_glu,  name: 'Glucosa',  line: { color: variableColor.s_glu, width: 2 } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'g/L' } }}
                  explanation={<>
                    <b>Lectura:</b> debajo de Dcrit (~0.37 h⁻¹) la levadura crece en régimen
                    puramente oxidativo: la glucosa que entra al reactor se respira
                    completamente, no aparece etanol y la biomasa se mantiene cerca de
                    7.4 g/L. A partir de Dcrit el flujo glucolítico excede la capacidad
                    respiratoria y aparece etanol por desborde; cerca de Dwashout
                    (~0.48 h⁻¹) la biomasa colapsa y la glucosa se acumula.
                  </>}
                />
              </Grid>
            )}
            {figs.fig3 && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 3 (bis)" subtitle="Intercambio gaseoso específico"
                  data={[
                    { x: figs.fig3.D, y: figs.fig3.qO2,  name: 'qO₂',  line: { color: variableColor.qO2, width: 2 } },
                    { x: figs.fig3.D, y: figs.fig3.qCO2, name: 'qCO₂', line: { color: variableColor.qCO2, width: 2 } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'mmol g⁻¹ h⁻¹' } }}
                  explanation={<>
                    <b>Lectura:</b> en régimen oxidativo qO₂ y qCO₂ crecen casi linealmente
                    con D porque toda la glucosa va a la TCA. Al cruzar Dcrit qO₂ se aplana
                    (la respiración satura) mientras qCO₂ se dispara: el CO₂ extra proviene
                    de la fermentación alcohólica.
                  </>}
                />
              </Grid>
            )}

            {figs.fig3 && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 4" subtitle="Metabolitos intracelulares"
                  data={[
                    { x: figs.fig3.D, y: figs.fig3.s_pyr,     name: 'Piruvato',     line: { color: variableColor.s_pyr } },
                    { x: figs.fig3.D, y: figs.fig3.s_acetald, name: 'Acetaldehído', line: { color: variableColor.s_acetald } },
                    { x: figs.fig3.D, y: figs.fig3.s_acetate, name: 'Acetato',      line: { color: variableColor.s_acetate } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'g/L' } }}
                  explanation={<>
                    <b>Lectura:</b> el acetaldehído es el regulador clave del modelo.
                    Antes de Dcrit, las isoenzimas Acdh lo mantienen casi en cero. En la
                    transición de Crabtree se acumula bruscamente y dispara la captación
                    excesiva de glucosa (r₁ᵉ). El piruvato sigue una pauta similar pero
                    con un orden de Hill mayor, y el acetato actúa como pool intermedio
                    entre acetaldehído y biomasa.
                  </>}
                />
              </Grid>
            )}
            {figs.fig3 && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 4 (compartimentos)" subtitle="Xa y X_Acdh vs D"
                  data={[
                    { x: figs.fig3.D, y: figs.fig3.Xa,    name: 'Xa',     line: { color: variableColor.Xa, width: 2 } },
                    { x: figs.fig3.D, y: figs.fig3.XAcdh, name: 'X_Acdh', line: { color: variableColor.XAcdh, width: 2 } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'g g⁻¹' } }}
                  explanation={<>
                    <b>Lectura:</b> el compartimento activo Xa (enzimas, ribosomas) crece
                    con D porque la célula necesita más maquinaria a tasas de crecimiento
                    altas. El compartimento X_Acdh (acetaldehído-deshidrogenasa) tiene
                    el comportamiento opuesto: cae cuando aparece la fermentación porque
                    la represión por glucosa frena su síntesis.
                  </>}
                />
              </Grid>
            )}

            {figs.fig5 && (
              <Grid item xs={12} md={8}>
                <PlotCard
                  title="Figura 5" subtitle="Simulación batch, Sglu0 = 15 g/L — escala g/L"
                  height={360}
                  data={[
                    { x: figs.fig5.t, y: figs.fig5.s_glu,    name: 'Glucosa',
                      line: { color: variableColor.s_glu, width: 2 } },
                    { x: figs.fig5.t, y: figs.fig5.s_EtOH,   name: 'Etanol',
                      line: { color: variableColor.s_EtOH, width: 2 } },
                    { x: figs.fig5.t, y: figs.fig5.x,        name: 'Biomasa',
                      line: { color: variableColor.x, width: 2 } },
                  ]}
                  layout={{ xaxis: { title: 'tiempo (h)' }, yaxis: { title: 'g/L' } }}
                  explanation={<>
                    <b>Lectura:</b> cultivo en frasco cerrado partiendo de inóculo bajo
                    (x₀ = 2 mg/L). Mientras hay glucosa abundante (fase exponencial), el
                    crecimiento es alto y se acumula etanol por desborde — fenómeno Crabtree.
                    Una vez agotada la glucosa (~18 h), las células consumen el etanol
                    acumulado en una segunda fase (diauxia) en la que la biomasa sigue
                    creciendo pero el etanol cae. El modelo reproduce naturalmente este
                    cambio de sustrato porque incluye el bypass de acetato.
                  </>}
                />
              </Grid>
            )}
            {figs.fig5 && (
              <Grid item xs={12} md={4}>
                <PlotCard
                  title="Figura 5 (intermedios)"
                  subtitle="Piruvato y acetato — escala ampliada (mg/L)"
                  height={360}
                  data={[
                    { x: figs.fig5.t, y: figs.fig5.s_acetate, name: 'Acetato',
                      line: { color: variableColor.s_acetate, width: 2 } },
                    { x: figs.fig5.t, y: figs.fig5.s_pyr,     name: 'Piruvato',
                      line: { color: variableColor.s_pyr, width: 2 } },
                  ]}
                  layout={{ xaxis: { title: 'tiempo (h)' }, yaxis: { title: 'g/L' } }}
                  explanation={<>
                    <b>Lectura:</b> los intermediarios piruvato y acetato viven a
                    concentraciones varios órdenes de magnitud por debajo de glucosa y
                    etanol; por eso aparecen en una gráfica aparte. El acetato se
                    acumula brevemente durante la fase de etanol y luego se consume
                    junto con él en la fase diáuxica.
                  </>}
                />
              </Grid>
            )}

            {figs.fig10A && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 10A" subtitle="Diagrama de bifurcación — Sf = 30 g/L · biomasa con histéresis"
                  data={[
                    { x: figs.fig10A.D, y: figs.fig10A.x_fwd, name: 'Rama oxidativa (fwd)',
                      line: { color: variableColor.x, width: 2.5 } },
                    { x: figs.fig10A.D, y: figs.fig10A.x_bwd, name: 'Rama oxido-reductiva (bwd)',
                      line: { color: variableColor.s_EtOH, width: 2.5, dash: 'dash' } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'Biomasa (g/L)' } }}
                  explanation={<>
                    <b>Lectura:</b> la rama <b>fwd</b> (forward) se obtiene barriendo D
                    de bajo a alto partiendo del régimen oxidativo (mucha biomasa, sin
                    etanol). La rama <b>bwd</b> (backward) hace lo opuesto: barre D
                    de alto a bajo partiendo del régimen oxido-reductivo (menos biomasa,
                    con etanol). En la zona donde las dos curvas no coinciden
                    existen <b>dos estados estacionarios estables</b> para el mismo D
                    (histéresis); el sistema "recuerda" su historia. Esta multiplicidad
                    se da en S. cerevisiae a Sf altos y es una predicción no trivial del
                    modelo estructurado.
                  </>}
                />
              </Grid>
            )}

            {figs.fig10A && (
              <Grid item xs={12} md={6}>
                <PlotCard
                  title="Figura 10A (etanol)" subtitle="Mismo diagrama de bifurcación — etanol"
                  data={[
                    { x: figs.fig10A.D, y: figs.fig10A.eth_fwd, name: 'Rama oxidativa (fwd)',
                      line: { color: variableColor.x, width: 2.5 } },
                    { x: figs.fig10A.D, y: figs.fig10A.eth_bwd, name: 'Rama oxido-reductiva (bwd)',
                      line: { color: variableColor.s_EtOH, width: 2.5, dash: 'dash' } },
                  ]}
                  layout={{ xaxis: { title: 'D (h⁻¹)' }, yaxis: { title: 'Etanol (g/L)' } }}
                  explanation={<>
                    <b>Lectura:</b> la misma bifurcación vista desde el etanol. La rama
                    oxidativa (fwd) mantiene etanol ≈ 0 hasta una D alta donde "salta"
                    al estado fermentativo. La rama oxido-reductiva (bwd) sostiene
                    etanol significativo incluso a D menores. Saber en qué rama está el
                    biorreactor importa industrialmente: dos arranques con la misma
                    consigna pueden dar productos opuestos.
                  </>}
                />
              </Grid>
            )}

            {figs.fig10B && (
              <Grid item xs={12}>
                <PlotCard
                  title="Figura 10B" subtitle="Región de multiplicidad en el plano (Sf, D)"
                  height={340}
                  data={[
                    { x: figs.fig10B.Sf, y: figs.fig10B.D_low,  name: 'Pliegue inferior',
                      line: { color: variableColor.x, width: 2.5 },
                      mode: 'lines+markers', marker: { size: 8 } },
                    { x: figs.fig10B.Sf, y: figs.fig10B.D_high, name: 'Pliegue superior',
                      line: { color: variableColor.s_EtOH, width: 2.5 },
                      mode: 'lines+markers', marker: { size: 8 } },
                  ]}
                  layout={{
                    xaxis: { title: 'Sf (g/L)' },
                    yaxis: { title: 'D (h⁻¹)' },
                  }}
                  explanation={<>
                    <b>Lectura:</b> mapa de los puntos del plano (Sf, D) donde aparece
                    multiplicidad de estados estacionarios. Los <b>pliegues</b>
                    (folds) son las dos D donde la curva de bifurcación cambia de
                    estabilidad. Para Sf inferior a ~16 g/L los pliegues coinciden:
                    no hay histéresis y el sistema tiene un único estado estable.
                    A medida que Sf crece la región de multiplicidad se ensancha
                    hacia ambos lados.
                  </>}
                />
              </Grid>
            )}

            {figs.fig11 && (
              <Grid item xs={12}>
                <PlotCard
                  title="Figura 11"
                  subtitle="Acetaldehído vs D para tres valores de Sf — el arco de multiplicidad se ensancha al subir Sf"
                  height={380}
                  data={Object.entries(figs.fig11).flatMap(([key, diag], i) => {
                    const colores = [variableColor.s_glu, variableColor.x, variableColor.s_EtOH];
                    const sf = key.replace('Sf_', '');
                    return [
                      { x: diag.D, y: diag.acet_fwd, name: `Sf=${sf} g/L (fwd)`,
                        line: { color: colores[i % colores.length], width: 2 } },
                      { x: diag.D, y: diag.acet_bwd, name: `Sf=${sf} g/L (bwd)`,
                        line: { color: colores[i % colores.length], width: 2, dash: 'dash' } },
                    ];
                  })}
                  layout={{
                    xaxis: { title: 'D (h⁻¹)' },
                    yaxis: { title: 'Acetaldehído en EE (g/L)' },
                  }}
                  explanation={<>
                    <b>Lectura:</b> el acetaldehído es el "interruptor" del modelo.
                    Esta figura traza el acetaldehído de estado estacionario en función
                    de D para tres Sf distintos, con las dos ramas forward (rama oxidativa
                    barriendo D ascendente, líneas llenas) y backward (rama oxido-reductiva
                    barriendo D descendente, líneas punteadas). Cuanto mayor es Sf, mayor
                    es el pico de acetaldehído alcanzable y más ancha es la separación
                    entre ramas — es decir, más grande es la zona de multiplicidad.
                  </>}
                />
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
