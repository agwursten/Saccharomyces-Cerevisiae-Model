"""
Solver dispatcher.

The application supports two ODE integration methods:

* ``"lsoda"`` — SciPy's LSODA (default).  Adaptive multi-step solver that
  switches between stiff (BDF) and non-stiff (Adams) automatically.  Very
  fast for this system because it can take large steps where the dynamics
  are slow.
* ``"rk4"``   — Classical fixed-step fourth-order Runge-Kutta.  Required
  for the numerical-methods component of the project.  Slower than LSODA
  but transparent and easy to inspect.

Use :func:`integrate` to get a uniform interface across both.
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
    Unified integration interface.

    Parameters
    ----------
    method : {"lsoda", "rk4"}
        Numerical method to use.
    rk4_step : float
        Step size when ``method == "rk4"``. Ignored otherwise.

    Returns
    -------
    t : ndarray
    y : ndarray, shape (state_dim, n_points)
    """
    method = (method or "lsoda").lower()
    if method == "rk4":
        return rk4_integrate(f, t_span, y0, args=args, h=rk4_step, t_eval=t_eval)

    # Default: LSODA via SciPy's solve_ivp (adaptive, handles stiffness).
    # The "out" kwarg of the tuple-RHS gets in the way of solve_ivp, so we
    # wrap it.
    def _wrapped(t, y):
        return f(t, y, *args)

    sol = solve_ivp(
        _wrapped, t_span, y0,
        method="LSODA",
        t_eval=t_eval,
        rtol=1e-7, atol=1e-10, max_step=1.0,
    )
    return sol.t, sol.y
