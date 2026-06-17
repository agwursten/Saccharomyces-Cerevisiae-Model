"""
Análisis de bifurcación: reproduce las Fig. 10 y Fig. 11 del artículo
combinando continuación hacia adelante y hacia atrás en D para evidenciar
la bifurcación de pliegue (fold).

Retorna las cuatro variables de estado de interés (x, Sacetald, SEtOH y
Sacetate) para cada dirección de continuación, de modo que la misma
llamada pueda poblar la Fig. 10A (biomasa), la Fig. 11 (acetaldehído) y
los overlays de etanol.
"""

from __future__ import annotations
from typing import Dict, Optional
import math
import numpy as np

from models.parameters import DEFAULT_PARAMETERS
from models.yeast_model import state_to_vector, vector_to_state, STATE_VARS
from models.yeast_model_tuple import params_to_tuple
from simulations.chemostat import _settle_to_steady_state


def _clean(arr):
    """Reemplaza NaN / inf por None para que el resultado sea serializable en JSON."""
    return [None if (v is None or (isinstance(v, float) and not math.isfinite(v)))
            else float(v) for v in arr]


def _continuation(D_grid, Sf, p_tuple, y0, solver="lsoda", rk4_step=0.005,
                  t_max=120.0):
    """
    Continuación con arranque tibio (warm-start): para cada D, asienta el
    estado estacionario local estable partiendo del anterior. Retorna las
    trayectorias de x, acetaldehído, etanol y acetato a lo largo de la rama.
    """
    x_l, acet_l, eth_l, acetate_l = [], [], [], []
    y = y0.copy()
    for D in D_grid:
        y_ss = _settle_to_steady_state(D, Sf, p_tuple, y, t_max=t_max,
                                       solver=solver, rk4_step=rk4_step)
        if y_ss is None:
            x_l.append(float("nan"))
            acet_l.append(float("nan"))
            eth_l.append(float("nan"))
            acetate_l.append(float("nan"))
            continue
        s = vector_to_state(y_ss)
        x_l.append(s["x"])
        acet_l.append(s["s_acetald"])
        eth_l.append(s["s_EtOH"])
        acetate_l.append(s["s_acetate"])
        y = y_ss
    return (np.array(x_l), np.array(acet_l),
            np.array(eth_l), np.array(acetate_l))


def bifurcation_diagram(Sf: float,
                        D_min: float = 0.25,
                        D_max: float = 0.45,
                        n: int = 50,
                        parameters: Optional[Dict[str, float]] = None,
                        solver: str = "lsoda",
                        rk4_step: float = 0.005) -> Dict:
    """
    Calcula las ramas superior e inferior de estado estacionario realizando
    continuaciones hacia adelante (D bajo -> alto) y hacia atrás (D alto -> bajo).
    """
    p = parameters or DEFAULT_PARAMETERS
    p_tuple = params_to_tuple(p)
    D_grid = np.linspace(D_min, D_max, n)

    # Continuación hacia adelante: rama oxidativa
    y_low = state_to_vector({
        "s_glu": 0.01, "s_pyr": 0.0, "s_acetald": 0.0,
        "s_acetate": 0.0, "s_EtOH": 0.0,
        "x": Sf * 0.45, "Xa": 0.36, "XAcdh": 0.06,
    })
    x_fwd, acet_fwd, eth_fwd, acetate_fwd = _continuation(
        D_grid, Sf, p_tuple, y_low, solver=solver, rk4_step=rk4_step,
    )

    # Continuación hacia atrás: estado inicial fuertemente óxido-reductivo
    y_high = state_to_vector({
        "s_glu": Sf * 0.10, "s_pyr": 0.05, "s_acetald": 0.005,
        "s_acetate": 0.15, "s_EtOH": Sf * 0.30,
        "x": Sf * 0.18, "Xa": 0.28, "XAcdh": 0.001,
    })
    x_bwd, acet_bwd, eth_bwd, acetate_bwd = _continuation(
        D_grid[::-1], Sf, p_tuple, y_high, solver=solver, rk4_step=rk4_step,
    )
    x_bwd = x_bwd[::-1]
    acet_bwd = acet_bwd[::-1]
    eth_bwd = eth_bwd[::-1]
    acetate_bwd = acetate_bwd[::-1]

    return {
        "D":            D_grid.tolist(),
        "x_fwd":        _clean(x_fwd),
        "x_bwd":        _clean(x_bwd),
        "acet_fwd":     _clean(acet_fwd),
        "acet_bwd":     _clean(acet_bwd),
        "eth_fwd":      _clean(eth_fwd),
        "eth_bwd":      _clean(eth_bwd),
        "acetate_fwd":  _clean(acetate_fwd),
        "acetate_bwd":  _clean(acetate_bwd),
    }


def multiplicity_region(Sf_values, parameters=None,
                        solver="lsoda", rk4_step=0.005):
    """Para cada Sf, encuentra el intervalo (D_low, D_high) donde las ramas
    forward y backward difieren en más de 0.3 g/L de biomasa."""
    p = parameters or DEFAULT_PARAMETERS
    D_min_list, D_max_list = [], []
    for Sf in Sf_values:
        diag = bifurcation_diagram(
            Sf, D_min=0.25, D_max=0.45, n=15, parameters=p,
            solver=solver, rk4_step=rk4_step,
        )
        x_fwd = np.array([v if v is not None else np.nan for v in diag["x_fwd"]])
        x_bwd = np.array([v if v is not None else np.nan for v in diag["x_bwd"]])
        D = np.array(diag["D"])
        diff = np.abs(x_fwd - x_bwd)
        mask = (diff > 0.3) & np.isfinite(diff)
        if mask.any():
            D_min_list.append(float(D[mask][0]))
            D_max_list.append(float(D[mask][-1]))
        else:
            D_min_list.append(None)
            D_max_list.append(None)
    return {
        "Sf":     list(Sf_values),
        "D_low":  D_min_list,
        "D_high": D_max_list,
    }
