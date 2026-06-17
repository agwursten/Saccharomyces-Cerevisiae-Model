"""
Ecuaciones de balance de masa del modelo de levadura de Lei et al. (2001).

El vector de estado es::

    y = [s_glu, s_pyr, s_acetald, s_acetate, s_EtOH, x, Xa, XAcdh]

con unidades::

    s_*  : g·L⁻¹   (concentraciones extracelulares)
    x    : g·L⁻¹   (biomasa en peso seco)
    Xa   : g·g⁻¹   (contenido del compartimento activo por biomasa)
    XAcdh: g·g⁻¹   (contenido del compartimento Acdh por biomasa)

Los balances de abajo corresponden exactamente a la Tabla 4 del artículo.

El sistema soporta tres modos de operación a través del argumento ``mode``:
    - ``"chemostat"``: tasa de dilución ``D`` constante con alimentación ``s_glu_in``.
    - ``"batch"``    : D igual a cero; sin caudal de entrada ni de salida.
    - ``"fedbatch"`` : ``D(t)`` provisto externamente como callback.
"""

from __future__ import annotations
from typing import Callable, Optional, Dict, Tuple
import numpy as np

from .kinetics import evaluate_all
from .parameters import STOICH


STATE_VARS = ["s_glu", "s_pyr", "s_acetald", "s_acetate", "s_EtOH", "x", "Xa", "XAcdh"]


# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------
def vector_to_state(y) -> Dict[str, float]:
    """Convierte el vector de estado numpy a un diccionario etiquetado."""
    return {name: float(val) for name, val in zip(STATE_VARS, y)}


def state_to_vector(state: Dict[str, float]):
    """Convierte un diccionario de estado etiquetado al vector numpy ordenado."""
    return np.array([state[name] for name in STATE_VARS], dtype=float)


# ---------------------------------------------------------------------------
# Lado derecho del sistema de EDOs
# ---------------------------------------------------------------------------
def rhs(t,
        y,
        p,
        D: float = 0.0,
        s_glu_in: float = 0.0):
    """
    Calcula dy/dt para el estado dado.

    Parámetros
    ----------
    t : float
        Tiempo (h). Requerido por los solvers de SciPy; no se usa internamente.
    y : array-like
        Vector de estado actual (ver docstring del módulo).
    p : dict
        Diccionario de parámetros cinéticos (ver :mod:`models.parameters`).
    D : float
        Tasa de dilución (h⁻¹). Usar 0 para batch.
    s_glu_in : float
        Concentración de glucosa en la alimentación (g/L). Usar 0 para batch.
    """
    state = vector_to_state(y)
    x = state["x"]
    Xa = state["Xa"]
    XAcdh = state["XAcdh"]

    # Velocidades específicas por unidad de biomasa (g·g⁻¹·h⁻¹)
    r = evaluate_all(state, p)

    # ---- Balances de sustratos --------------------------------------------
    # Glucosa: consumida por la glucólisis (r1) y el anabolismo (r7); alimentada por Sf*D.
    ds_glu = (-r["r1"] - r["r7"]) * x + (s_glu_in - state["s_glu"]) * D

    # Piruvato: formado por r1 (1 C-mol a 1 C-mol), consumido por r2 (Pdh)
    # y r3 (Pdc). El coeficiente es 1 en r1 (tabla estequiométrica).
    ds_pyr = (r["r1"] - r["r2"] - r["r3"]) * x - state["s_pyr"] * D

    # Acetaldehído
    ds_acetald = (STOICH["pyr_to_acet_r3"] * r["r3"]
                  - r["r4"] - r["r6"]) * x - state["s_acetald"] * D

    # Acetato
    ds_acetate = (STOICH["acetate_r4"] * r["r4"]
                  - r["r5"] - r["r8"]) * x - state["s_acetate"] * D

    # Etanol
    ds_EtOH = STOICH["EtOH_r6"] * r["r6"] * x - state["s_EtOH"] * D

    # ---- Biomasa y compartimentos -----------------------------------------
    mu = STOICH["biomass_r7"] * r["r7"] + STOICH["biomass_r8"] * r["r8"]

    dx     = (mu - D) * x
    dXa    = STOICH["biomass_r7"] * r["r7"] + STOICH["biomass_r8"] * r["r8"] \
             - r["r9"] - r["r10"] - mu * Xa
    dXAcdh = r["r9"] - r["r11"] - mu * XAcdh

    return np.array([ds_glu, ds_pyr, ds_acetald, ds_acetate,
                     ds_EtOH, dx, dXa, dXAcdh], dtype=float)


# ---------------------------------------------------------------------------
# Tasas específicas de consumo de oxígeno / producción de CO₂
# ---------------------------------------------------------------------------
def gas_rates(state: Dict[str, float], p, x: Optional[float] = None) -> Tuple[float, float]:
    """
    Calcula las tasas específicas de consumo de oxígeno y producción de CO₂
    (mmol·g⁻¹·h⁻¹) a partir de las expresiones cinéticas, siguiendo la Tabla 4.
    """
    r = evaluate_all(state, p)
    qO2  = 1000.0 / 32.0 * (
        0.178 * r["r1"] + 0.908 * r["r2"] + 0.363 * r["r4"]
        + 1.066 * r["r5"] - 0.363 * r["r6"] + 0.063 * r["r7"]
        + 0.214 * r["r8"]
    )
    qCO2 = 1000.0 / 44.01 * (
        1.499 * r["r2"] + 0.5  * r["r3"] + 1.466 * r["r5"]
        + 0.127 * r["r7"] + 0.325 * r["r8"]
    )
    return qO2, qCO2
