"""
Reaction-rate expressions r1 - r11 of the Lei et al. (2001) yeast model.

Each function receives the current state and returns a positive scalar
(units: g substrate g-biomass^-1 h^-1 for substrate-related rates;
g compartment g-biomass^-1 h^-1 for compartmental rates).

All expressions are taken from Table 5 of the paper.
"""

from __future__ import annotations
import math


# ---------------------------------------------------------------------------
# Catabolic reactions
# ---------------------------------------------------------------------------
def r1(state, p):
    """
    Glucose uptake / glycolysis.

    Three additive terms: low-affinity uptake, high-affinity uptake, and
    an acetaldehyde-activated excess-uptake term that triggers the shift
    to oxido-reductive metabolism.
    """
    s_glu     = max(state["s_glu"],     0.0)
    s_acetald = max(state["s_acetald"], 0.0)
    Xa        = state["Xa"]

    low_aff  = p["k1l"] * s_glu / (s_glu + p["K1l"])
    high_aff = p["k1h"] * s_glu / (s_glu + p["K1h"])
    excess   = (
        p["k1e"] * s_glu
        / (s_glu * (p["K1i"] * s_acetald + 1.0) + p["K1e"])
        * s_acetald
    )
    return (low_aff + high_aff + excess) * Xa


def r2(state, p):
    """Pyruvate oxidation through the Pdh complex (with glucose repression)."""
    s_pyr = max(state["s_pyr"], 0.0)
    s_glu = max(state["s_glu"], 0.0)
    Xa    = state["Xa"]
    return p["k2"] * s_pyr / (s_pyr + p["K2"]) / (p["K2i"] * s_glu + 1.0) * Xa


def r3(state, p):
    """Pyruvate -> acetaldehyde via Pdc, modelled with a Hill order of 4."""
    s_pyr = max(state["s_pyr"], 0.0)
    Xa    = state["Xa"]
    spyr4 = s_pyr ** 4
    return p["k3"] * spyr4 / (spyr4 + p["K3"]) * Xa


def r4(state, p):
    """
    Acetaldehyde -> acetate via Acdh.
    Linear dependence on the Acdh compartment to capture isoenzyme-level
    capacity variations.
    """
    s_a = max(state["s_acetald"], 0.0)
    Xa, XAcdh = state["Xa"], state["XAcdh"]
    return p["k4"] * s_a / (s_a + p["K4"]) * Xa * XAcdh


def r5(state, p):
    """
    Acetate -> acetyl-CoA via Acs (two isoenzymes).

    First term (Acs2p) is always active; second term (Acs1p) is repressed
    by glucose so it only contributes during ethanol growth.
    """
    s_ac  = max(state["s_acetate"], 0.0)
    s_glu = max(state["s_glu"],     0.0)
    Xa    = state["Xa"]

    base = p["k5"]  * s_ac / (s_ac + p["K5"])
    rep  = (
        p["k5e"] * s_ac / (s_ac + p["K5e"])
        * 1.0 / (1.0 + p["K5i"] * s_glu)
    )
    return (base + rep) * Xa


def r6(state, p):
    """Reversible acetaldehyde <-> ethanol via Adh."""
    s_a = max(state["s_acetald"], 0.0)
    s_e = max(state["s_EtOH"],    0.0)
    Xa  = state["Xa"]

    num   = p["k6"] * s_a - p["k6r"] * s_e
    denom = s_a + p["K6"] + p["K6e"] * s_e
    return num / denom * Xa


# ---------------------------------------------------------------------------
# Anabolic reactions
# ---------------------------------------------------------------------------
def r7(state, p):
    """Anabolism from glucose -> active compartment Xa."""
    s_glu = max(state["s_glu"], 0.0)
    Xa    = state["Xa"]
    return p["k7"] * s_glu / (s_glu + p["K7"]) * Xa


def r8(state, p):
    """
    Anabolism from acetate -> Xa (glucose-repressed; shares affinity with
    the Acs1p term in r5).
    """
    s_ac  = max(state["s_acetate"], 0.0)
    s_glu = max(state["s_glu"],     0.0)
    Xa    = state["Xa"]
    return (
        p["k8"] * s_ac / (s_ac + p["K5e"])
        * 1.0 / (1.0 + p["K5i"] * s_glu)
        * Xa
    )


# ---------------------------------------------------------------------------
# Compartment dynamics
# ---------------------------------------------------------------------------
def r9(state, p):
    """
    Synthesis of the acetaldehyde-dehydrogenase compartment.

    Two activating terms (glucose-Monod with inhibition and ethanol-Monod
    with the same inhibition), plus a small constitutive term.
    """
    s_glu = max(state["s_glu"],  0.0)
    s_e   = max(state["s_EtOH"], 0.0)
    Xa    = state["Xa"]

    activating = (
        p["k9"]  * s_glu / (s_glu + p["K9"])
        + p["k9e"] * s_e / (s_e + p["K9e"])
    ) / (p["K9i"] * s_glu + 1.0)

    constitutive = p["k9c"] * s_glu / (s_glu + p["K9"])
    return (activating + constitutive) * Xa


def r10(state, p):
    """First-order decay of the active compartment Xa."""
    s_glu = max(state["s_glu"],  0.0)
    s_e   = max(state["s_EtOH"], 0.0)
    Xa    = state["Xa"]
    on_glucose = p["k10"]  * s_glu / (s_glu + p["K10"])
    on_ethanol = p["k10e"] * s_e   / (s_e   + p["K10e"])
    return (on_glucose + on_ethanol) * Xa


def r11(state, p):
    """First-order decay of the Acdh compartment."""
    return p["k11"] * state["XAcdh"]


# ---------------------------------------------------------------------------
# Convenience: evaluate every rate and return as a dict
# ---------------------------------------------------------------------------
def evaluate_all(state, p):
    return {
        "r1":  r1(state, p),
        "r2":  r2(state, p),
        "r3":  r3(state, p),
        "r4":  r4(state, p),
        "r5":  r5(state, p),
        "r6":  r6(state, p),
        "r7":  r7(state, p),
        "r8":  r8(state, p),
        "r9":  r9(state, p),
        "r10": r10(state, p),
        "r11": r11(state, p),
    }
