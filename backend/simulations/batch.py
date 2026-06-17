"""
Simulaciones batch: D = 0, sin alimentación ni salida.
Soporta tanto LSODA (rápido, adaptativo) como RK4 (clásico de paso fijo).
"""

from __future__ import annotations
from typing import Dict, Optional
import numpy as np

from models.parameters import DEFAULT_PARAMETERS, DEFAULT_INITIAL_CONDITIONS
from models.yeast_model import (
    rhs, gas_rates, state_to_vector, vector_to_state, STATE_VARS,
)
from models.yeast_model_tuple import rhs_tuple, params_to_tuple
from .solver import integrate


def simulate_batch(t_end: float = 30.0,
                   n_points: int = 600,
                   initial_conditions: Optional[Dict[str, float]] = None,
                   parameters: Optional[Dict[str, float]] = None,
                   solver: str = "lsoda",
                   rk4_step: float = 0.005) -> Dict:
    """Integra una corrida batch a partir de las condiciones iniciales provistas."""
    p = parameters or DEFAULT_PARAMETERS
    p_tuple = params_to_tuple(p)
    ic = {**DEFAULT_INITIAL_CONDITIONS, **(initial_conditions or {})}
    y0 = state_to_vector(ic)
    t_eval = np.linspace(0.0, t_end, n_points)

    t, y = integrate(
        rhs_tuple, (0.0, t_end), y0,
        args=(p_tuple, 0.0, 0.0),
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

    x_arr = np.array(result["x"])
    glu = np.array(result["s_glu"])
    eth = np.array(result["s_EtOH"])

    glu_init = glu[0] if glu[0] > 0 else 1.0
    depl = np.where(glu < 0.01 * glu_init)[0]
    t_glu_depl = float(t[depl[0]]) if len(depl) else None

    result["metrics"] = {
        "x_max":       float(np.nanmax(x_arr)),
        "EtOH_max":    float(np.nanmax(eth)),
        "t_glu_depl":  t_glu_depl,
        "t_x_max":     float(t[int(np.nanargmax(x_arr))]),
    }
    return result
