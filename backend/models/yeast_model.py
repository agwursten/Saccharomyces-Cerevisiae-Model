"""
Mass-balance equations for the Lei et al. (2001) yeast model.

The state vector is::

    y = [s_glu, s_pyr, s_acetald, s_acetate, s_EtOH, x, Xa, XAcdh]

with units::

    s_*  : g L^-1  (extracellular concentrations)
    x    : g L^-1  (biomass dry weight)
    Xa   : g g^-1  (active-compartment content per biomass)
    XAcdh: g g^-1  (Acdh-compartment content per biomass)

The balances below correspond exactly to Table 4 of the paper.

The system supports three operation modes through the ``mode`` argument:
    - ``"chemostat"``: constant dilution rate ``D`` with feed ``s_glu_in``.
    - ``"batch"``    : D set to zero; no inlet or outlet flow.
    - ``"fedbatch"`` : externally supplied ``D(t)`` callback.
"""

from __future__ import annotations
from typing import Callable, Optional, Dict, Tuple
import numpy as np

from .kinetics import evaluate_all
from .parameters import STOICH


STATE_VARS = ["s_glu", "s_pyr", "s_acetald", "s_acetate", "s_EtOH", "x", "Xa", "XAcdh"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def vector_to_state(y) -> Dict[str, float]:
    """Convert the numpy state vector to a labelled dict."""
    return {name: float(val) for name, val in zip(STATE_VARS, y)}


def state_to_vector(state: Dict[str, float]):
    """Convert a labelled state dict to the ordered numpy vector."""
    return np.array([state[name] for name in STATE_VARS], dtype=float)


# ---------------------------------------------------------------------------
# Right-hand side of the ODE system
# ---------------------------------------------------------------------------
def rhs(t,
        y,
        p,
        D: float = 0.0,
        s_glu_in: float = 0.0):
    """
    Compute dy/dt for the given state.

    Parameters
    ----------
    t : float
        Time (h). Required by SciPy solvers; not used internally.
    y : array-like
        Current state vector (see module docstring).
    p : dict
        Kinetic parameter dictionary (see :mod:`models.parameters`).
    D : float
        Dilution rate (h^-1). Use 0 for batch.
    s_glu_in : float
        Glucose feed concentration (g/L). Use 0 for batch.
    """
    state = vector_to_state(y)
    x = state["x"]
    Xa = state["Xa"]
    XAcdh = state["XAcdh"]

    # Per-biomass specific rates (g g^-1 h^-1)
    r = evaluate_all(state, p)

    # ---- Substrate balances -------------------------------------------------
    # Glucose: consumed by glycolysis (r1) and anabolism (r7); fed by Sf*D.
    ds_glu = (-r["r1"] - r["r7"]) * x + (s_glu_in - state["s_glu"]) * D

    # Pyruvate: formed by r1 (1 C-mol to 1 C-mol), consumed by r2 (Pdh)
    # and r3 (Pdc). Coefficient is 1 on r1 (stoichiometry table).
    ds_pyr = (r["r1"] - r["r2"] - r["r3"]) * x - state["s_pyr"] * D

    # Acetaldehyde
    ds_acetald = (STOICH["pyr_to_acet_r3"] * r["r3"]
                  - r["r4"] - r["r6"]) * x - state["s_acetald"] * D

    # Acetate
    ds_acetate = (STOICH["acetate_r4"] * r["r4"]
                  - r["r5"] - r["r8"]) * x - state["s_acetate"] * D

    # Ethanol
    ds_EtOH = STOICH["EtOH_r6"] * r["r6"] * x - state["s_EtOH"] * D

    # ---- Biomass and compartments ------------------------------------------
    mu = STOICH["biomass_r7"] * r["r7"] + STOICH["biomass_r8"] * r["r8"]

    dx     = (mu - D) * x
    dXa    = STOICH["biomass_r7"] * r["r7"] + STOICH["biomass_r8"] * r["r8"] \
             - r["r9"] - r["r10"] - mu * Xa
    dXAcdh = r["r9"] - r["r11"] - mu * XAcdh

    return np.array([ds_glu, ds_pyr, ds_acetald, ds_acetate,
                     ds_EtOH, dx, dXa, dXAcdh], dtype=float)


# ---------------------------------------------------------------------------
# Specific oxygen-uptake / CO2-evolution rates
# ---------------------------------------------------------------------------
def gas_rates(state: Dict[str, float], p, x: Optional[float] = None) -> Tuple[float, float]:
    """
    Compute specific oxygen-uptake and CO2-evolution rates (mmol g^-1 h^-1)
    from the rate expressions, following Table 4.
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
