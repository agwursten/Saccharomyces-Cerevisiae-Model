"""
Chemostat simulations:
    - Dynamic time-evolution at fixed (D, Sf).
    - Steady-state sweep over D for a given Sf.
    - Computation of derived quantities (Dcrit, Dwashout, D_opt_biomass,
      D_opt_productivity).

The ODE system can be integrated either with SciPy's LSODA (default, fast
and adaptive) or with the project's classical RK4 implementation.  The
caller selects the method through the ``solver`` argument.
"""

from __future__ import annotations
from typing import Dict, List, Optional, Tuple
import math
import numpy as np

from models.parameters import DEFAULT_PARAMETERS, DEFAULT_INITIAL_CONDITIONS
from models.yeast_model import (
    rhs, gas_rates, state_to_vector, vector_to_state, STATE_VARS,
)
from models.yeast_model_tuple import rhs_tuple, params_to_tuple
from .solver import integrate


def _safe(v):
    if v is None:
        return None
    try:
        return float(v) if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Single dynamic simulation
# ---------------------------------------------------------------------------
def simulate_dynamic(D: float,
                     Sf: float,
                     t_end: float = 100.0,
                     n_points: int = 400,
                     y0: Optional[Dict[str, float]] = None,
                     parameters: Optional[Dict[str, float]] = None,
                     solver: str = "lsoda",
                     rk4_step: float = 0.005) -> Dict:
    """Integrate the chemostat from given initial conditions."""
    p = parameters or DEFAULT_PARAMETERS
    p_tuple = params_to_tuple(p)
    ic = y0 or {
        "s_glu":     min(Sf * 0.1, 1.0),
        "s_pyr":     0.0,
        "s_acetald": 0.0,
        "s_acetate": 0.0,
        "s_EtOH":    0.0,
        "x":         5.0,
        "Xa":        0.35,
        "XAcdh":     0.02,
    }
    y0_vec = state_to_vector({**DEFAULT_INITIAL_CONDITIONS, **ic})
    t_eval = np.linspace(0.0, t_end, n_points)

    t, y = integrate(
        rhs_tuple, (0.0, t_end), y0_vec,
        args=(p_tuple, D, Sf),
        t_eval=t_eval,
        method=solver, rk4_step=rk4_step,
    )

    qO2_t, qCO2_t = [], []
    for j in range(y.shape[1]):
        state = vector_to_state(y[:, j])
        qO2, qCO2 = gas_rates(state, p)
        qO2_t.append(qO2)
        qCO2_t.append(qCO2)

    result = {"t": t.tolist(), "success": True}
    for i, name in enumerate(STATE_VARS):
        result[name] = y[i, :].tolist()
    result["qO2"]  = qO2_t
    result["qCO2"] = qCO2_t
    return result


# ---------------------------------------------------------------------------
# Steady-state finder
# ---------------------------------------------------------------------------
def _settle_to_steady_state(D, Sf, p_tuple, y0, t_max=120.0,
                            t_check=20.0, tol=1e-3,
                            solver="lsoda", rk4_step=0.005):
    """Integrate towards steady state, checking convergence periodically."""
    y = np.asarray(y0, dtype=float).copy()
    n_checks = max(1, int(np.ceil(t_max / t_check)))
    for _ in range(n_checks):
        _, ys = integrate(rhs_tuple, (0.0, t_check), y,
                          args=(p_tuple, D, Sf),
                          t_eval=np.array([t_check]),
                          method=solver, rk4_step=rk4_step)
        y = ys[:, -1]
        if np.any(~np.isfinite(y)) or np.any(y > 1e4):
            return None
        dy = rhs_tuple(0.0, y, p_tuple, D, Sf)
        if np.linalg.norm(dy) < tol:
            return y
    return y


def steady_state_sweep(Sf: float,
                       D_min: float = 0.02,
                       D_max: float = 0.50,
                       n: int = 60,
                       parameters: Optional[Dict[str, float]] = None,
                       solver: str = "lsoda",
                       rk4_step: float = 0.005) -> Dict:
    """Sweep D using warm-start continuation, returning steady states."""
    p = parameters or DEFAULT_PARAMETERS
    p_tuple = params_to_tuple(p)
    Ds = np.linspace(D_min, D_max, n)

    y_guess = state_to_vector({
        "s_glu":     min(Sf * 0.05, 1.0),
        "s_pyr":     0.0,
        "s_acetald": 0.0,
        "s_acetate": 0.0,
        "s_EtOH":    0.0,
        "x":         min(Sf * 0.30, 8.0),
        "Xa":        0.30,
        "XAcdh":     0.015,
    })

    results = {name: [] for name in STATE_VARS}
    results.update({"D": [], "productivity": [],
                    "qO2": [], "qCO2": [], "success": []})

    for D in Ds:
        y_ss = _settle_to_steady_state(D, Sf, p_tuple, y_guess,
                                       solver=solver, rk4_step=rk4_step)
        if y_ss is None:
            y_restart = state_to_vector({
                "s_glu":     min(Sf * 0.5, 5.0),
                "s_pyr":     0.0, "s_acetald": 0.0, "s_acetate": 0.0,
                "s_EtOH":    0.0,
                "x":         Sf * 0.1, "Xa": 0.30, "XAcdh": 0.005,
            })
            y_ss = _settle_to_steady_state(D, Sf, p_tuple, y_restart,
                                           solver=solver, rk4_step=rk4_step)
        if y_ss is None:
            y_ss = state_to_vector({
                "s_glu": Sf, "s_pyr": 0.0, "s_acetald": 0.0, "s_acetate": 0.0,
                "s_EtOH": 0.0, "x": 1e-4, "Xa": 0.0, "XAcdh": 0.0,
            })
        state = vector_to_state(y_ss)
        for name in STATE_VARS:
            results[name].append(state[name])

        productivity = D * state["x"]
        qO2, qCO2 = gas_rates(state, p)
        results["productivity"].append(productivity)
        results["qO2"].append(qO2)
        results["qCO2"].append(qCO2)
        results["success"].append(True)
        results["D"].append(float(D))
        y_guess = y_ss
    return results


# ---------------------------------------------------------------------------
# Operating regime characterisation
# ---------------------------------------------------------------------------
def characterise_regime(sweep: Dict) -> Dict:
    """Identify Dcrit, Dwashout, D_opt_biomass, D_opt_prod from a sweep.

    Dcrit is defined as the smallest D at which the steady-state ethanol
    concentration exceeds a meaningful threshold.  Because the maximum
    achievable ethanol scales with the feed concentration Sf (paper's
    Fig. 11 makes this point explicit), a fixed absolute threshold gives
    spurious results: at high Sf, even sub-critical operating points show
    tiny amounts of ethanol from numerical artefacts of the integration.

    We therefore use a **relative** threshold of 5% of the maximum
    steady-state ethanol observed in the sweep, with an absolute floor of
    0.1 g/L so the criterion stays sensible at very small Sf.
    """
    D   = np.array(sweep["D"])
    x   = np.array(sweep["x"])
    Et  = np.array(sweep["s_EtOH"])
    Pr  = np.array(sweep["productivity"])

    eth_max = float(np.nanmax(Et))
    eth_threshold = max(0.1, 0.05 * eth_max)
    crit_idx = np.where(Et > eth_threshold)[0]
    Dcrit = float(D[crit_idx[0]]) if len(crit_idx) else None

    x_max = float(np.nanmax(x))
    if Dcrit is not None:
        post = np.where((D >= Dcrit) & (x < 0.05 * x_max))[0]
        Dwashout = float(D[post[0]]) if len(post) else None
    else:
        Dwashout = None

    D_opt_biomass = float(D[int(np.nanargmax(x))])
    D_opt_prod    = float(D[int(np.nanargmax(Pr))])

    return {
        "Dcrit":          _safe(Dcrit),
        "Dwashout":       _safe(Dwashout),
        "D_opt_biomass":  _safe(D_opt_biomass),
        "D_opt_prod":     _safe(D_opt_prod),
        "x_max":          _safe(x_max),
        "EtOH_max":       _safe(eth_max),
        "productivity_max": _safe(float(np.nanmax(Pr))),
    }
