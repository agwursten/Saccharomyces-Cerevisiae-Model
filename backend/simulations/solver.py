"""
Dispatcher de solvers.

La aplicación soporta dos métodos de integración de EDOs:

* ``"lsoda"`` — LSODA de SciPy (por defecto). Solver multi-paso adaptativo
  que cambia automáticamente entre rígido (BDF) y no rígido (Adams). Muy
  rápido para este sistema porque puede dar pasos grandes donde la dinámica
  es lenta.
* ``"rk4"``   — Runge-Kutta clásico de cuarto orden con paso fijo.
  Requerido para el componente de métodos numéricos del proyecto. Más
  lento que LSODA pero transparente y fácil de inspeccionar.

Usar :func:`integrate` para tener una interfaz uniforme entre ambos.
"""

from __future__ import annotations
from typing import Callable, Tuple, Optional
import numpy as np
from scipy.integrate import solve_ivp

from .rk4 import rk4_integrate


def integrate(f: Callable,
              t_span: Tuple[float, float],
              y0: np.ndarray,
              args=(),
              t_eval=None,
              method: str = "lsoda",
              rk4_step: float = 0.005) -> Tuple[np.ndarray, np.ndarray]:
    """
    Interfaz unificada de integración.

    Parámetros
    ----------
    method : {"lsoda", "rk4"}
        Método numérico a usar.
    rk4_step : float
        Tamaño de paso cuando ``method == "rk4"``. Se ignora en otro caso.

    Returns
    -------
    t : ndarray
    y : ndarray, shape (state_dim, n_points)
    """
    method = (method or "lsoda").lower()
    if method == "rk4":
        return rk4_integrate(f, t_span, y0, args=args, h=rk4_step, t_eval=t_eval)

    # Por defecto: LSODA vía solve_ivp de SciPy (adaptativo, maneja rigidez).
    # El kwarg "out" del RHS basado en tupla estorba a solve_ivp, así que lo
    # envolvemos.
    def _wrapped(t, y):
        return f(t, y, *args)

    sol = solve_ivp(
        _wrapped, t_span, y0,
        method="LSODA",
        t_eval=t_eval,
        rtol=1e-7, atol=1e-10, max_step=1.0,
    )
    return sol.t, sol.y
