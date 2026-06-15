"""
Helper that flattens the parameter dict into an ordered tuple,
plus a tuple-based RHS that avoids dict lookups in the hot loop.

For 40k integration steps with 4 RHS calls each, dict-based access adds
~70% of the total wall-clock time on CPython. The tuple-based RHS below
is mathematically identical but ~3x faster.
"""

from __future__ import annotations
import numpy as np


# Index map for the parameter tuple (order matters: do not change without
# updating ``params_to_tuple`` and ``rhs_tuple``).
_PARAM_KEYS = (
    "k1h", "K1h", "k1l", "K1l", "k1e", "K1e", "K1i",      # r1
    "k2", "K2", "K2i",                                     # r2
    "k3", "K3",                                            # r3
    "k4", "K4",                                            # r4
    "k5", "K5", "k5e", "K5e", "K5i",                       # r5
    "k6", "K6", "k6r", "K6e",                              # r6
    "k7", "K7",                                            # r7
    "k8",                                                  # r8
    "k9", "K9", "k9e", "K9e", "K9i", "k9c",                # r9
    "k10", "K10", "k10e", "K10e",                          # r10
    "k11",                                                 # r11
)


def params_to_tuple(p: dict) -> tuple:
    """Convert the parameter dict to a flat tuple in the canonical order."""
    return tuple(p[k] for k in _PARAM_KEYS)


def rhs_tuple(t, y, p, D=0.0, s_glu_in=0.0, out=None):
    """
    Same equations as :func:`rhs_fast` but with the parameter tuple
    unpacked in one line, eliminating dict lookups entirely.
    """
    (k1h, K1h, k1l, K1l, k1e, K1e, K1i,
     k2, K2, K2i,
     k3, K3,
     k4, K4,
     k5, K5, k5e, K5e, K5i,
     k6, K6, k6r, K6e,
     k7, K7,
     k8,
     k9, K9, k9e, K9e, K9i, k9c,
     k10, K10, k10e, K10e,
     k11) = p

    s_glu     = y[0] if y[0] > 0.0 else 0.0
    s_pyr     = y[1] if y[1] > 0.0 else 0.0
    s_acetald = y[2] if y[2] > 0.0 else 0.0
    s_acetate = y[3] if y[3] > 0.0 else 0.0
    s_EtOH    = y[4] if y[4] > 0.0 else 0.0
    x  = y[5]; Xa = y[6]; XAcdh = y[7]

    r1 = (k1l * s_glu / (s_glu + K1l)
          + k1h * s_glu / (s_glu + K1h)
          + k1e * s_glu * s_acetald
            / (s_glu * (K1i * s_acetald + 1.0) + K1e)) * Xa
    r2 = k2 * s_pyr / (s_pyr + K2) / (K2i * s_glu + 1.0) * Xa
    spyr4 = s_pyr * s_pyr * s_pyr * s_pyr
    r3 = k3 * spyr4 / (spyr4 + K3) * Xa
    r4 = k4 * s_acetald / (s_acetald + K4) * Xa * XAcdh
    r5 = (k5  * s_acetate / (s_acetate + K5)
          + k5e * s_acetate / (s_acetate + K5e) / (1.0 + K5i * s_glu)) * Xa
    r6 = (k6 * s_acetald - k6r * s_EtOH) / (s_acetald + K6 + K6e * s_EtOH) * Xa
    r7 = k7 * s_glu / (s_glu + K7) * Xa
    r8 = k8 * s_acetate / (s_acetate + K5e) / (1.0 + K5i * s_glu) * Xa
    r9 = ((k9 * s_glu / (s_glu + K9) + k9e * s_EtOH / (s_EtOH + K9e))
          / (K9i * s_glu + 1.0) + k9c * s_glu / (s_glu + K9)) * Xa
    r10 = (k10  * s_glu  / (s_glu  + K10)
         + k10e * s_EtOH / (s_EtOH + K10e)) * Xa
    r11 = k11 * XAcdh

    mu = 0.732 * r7 + 0.619 * r8

    if out is None:
        out = np.empty(8)
    out[0] = (-r1 - r7) * x + (s_glu_in - s_glu) * D
    out[1] = (r1 - r2 - r3) * x - s_pyr * D
    out[2] = (0.5 * r3 - r4 - r6) * x - s_acetald * D
    out[3] = (1.363 * r4 - r5 - r8) * x - s_acetate * D
    out[4] = 1.045 * r6 * x - s_EtOH * D
    out[5] = (mu - D) * x
    out[6] = mu - r9 - r10 - mu * Xa
    out[7] = r9 - r11 - mu * XAcdh
    return out
