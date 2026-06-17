"""
Integrador clásico Runge-Kutta de cuarto orden con paso fijo.

Es el método RK4 estándar enseñado en cualquier curso de métodos
numéricos y usado aquí siguiendo el requisito del proyecto. Para el
sistema dy/dt = f(t, y), la fórmula por paso es::

    k1 = f(t,         y)
    k2 = f(t + h/2,   y + h*k1/2)
    k3 = f(t + h/2,   y + h*k2/2)
    k4 = f(t + h,     y + h*k3)
    y_{n+1} = y_n + (h/6) * (k1 + 2*k2 + 2*k3 + k4)

Se usan buffers preasignados para evitar asignaciones de numpy en cada paso.
"""

from __future__ import annotations
from typing import Callable, Tuple
import numpy as np


def rk4_integrate(f: Callable,
                  t_span: Tuple[float, float],
                  y0: np.ndarray,
                  args=(),
                  h: float = 0.01,
                  t_eval=None,
                  enforce_nonneg: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """
    Integra ``dy/dt = f(t, y, *args)`` con RK4 de paso fijo.

    La función ``f`` debe aceptar un keyword argument ``out=buffer`` para
    que el mismo buffer pueda reutilizarse en cada evaluación de k_i.

    Returns
    -------
    t : ndarray, shape (n,)
    y : ndarray, shape (state_dim, n)
    """
    t0, t_end = t_span
    nstate = len(y0)
    y = np.asarray(y0, dtype=float).copy()

    # Buffers de trabajo preasignados
    k1 = np.empty(nstate)
    k2 = np.empty(nstate)
    k3 = np.empty(nstate)
    k4 = np.empty(nstate)
    y_tmp = np.empty(nstate)

    n_steps = max(1, int(np.ceil((t_end - t0) / h)))
    h_actual = (t_end - t0) / n_steps

    def step(t, hh):
        """Un paso de RK4, actualizando y in place."""
        f(t, y, *args, out=k1)
        y_tmp[:] = y + 0.5 * hh * k1
        f(t + 0.5 * hh, y_tmp, *args, out=k2)
        y_tmp[:] = y + 0.5 * hh * k2
        f(t + 0.5 * hh, y_tmp, *args, out=k3)
        y_tmp[:] = y + hh * k3
        f(t + hh, y_tmp, *args, out=k4)
        y[:] = y + (hh / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)

    if t_eval is None:
        ys = np.empty((nstate, n_steps + 1))
        ys[:, 0] = y
        for i in range(n_steps):
            step(t0 + i * h_actual, h_actual)
            if enforce_nonneg:
                np.maximum(y, 0.0, out=y)
            ys[:, i + 1] = y
        t_grid = t0 + np.arange(n_steps + 1) * h_actual
        return t_grid, ys

    t_eval = np.asarray(t_eval, dtype=float)
    ys = np.empty((nstate, len(t_eval)))
    idx = 0
    if t_eval[0] <= t0:
        ys[:, 0] = y
        idx = 1
    t_cur = t0
    while idx < len(t_eval):
        target = t_eval[idx]
        while t_cur + h_actual < target - 1e-12:
            step(t_cur, h_actual)
            if enforce_nonneg:
                np.maximum(y, 0.0, out=y)
            t_cur += h_actual
        h_last = target - t_cur
        if h_last > 1e-12:
            step(t_cur, h_last)
            if enforce_nonneg:
                np.maximum(y, 0.0, out=y)
            t_cur = target
        ys[:, idx] = y
        idx += 1
    return t_eval, ys
