"""
Expresiones de velocidad de las reacciones r1 - r11 del modelo de levadura
de Lei et al. (2001).

Cada función recibe el estado actual y retorna un escalar positivo
(unidades: g sustrato·g-biomasa⁻¹·h⁻¹ para velocidades relacionadas con sustratos;
g compartimento·g-biomasa⁻¹·h⁻¹ para velocidades de los compartimentos).

Todas las expresiones se tomaron de la Tabla 5 del artículo.
"""

from __future__ import annotations
import math


# ---------------------------------------------------------------------------
# Reacciones catabólicas
# ---------------------------------------------------------------------------
def r1(state, p):
    """
    Captación de glucosa / glucólisis.

    Tres términos aditivos: captación de baja afinidad, captación de alta
    afinidad y un término de captación excesiva activado por acetaldehído
    que dispara el cambio al metabolismo óxido-reductivo.
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
    """Oxidación del piruvato a través del complejo Pdh (con represión por glucosa)."""
    s_pyr = max(state["s_pyr"], 0.0)
    s_glu = max(state["s_glu"], 0.0)
    Xa    = state["Xa"]
    return p["k2"] * s_pyr / (s_pyr + p["K2"]) / (p["K2i"] * s_glu + 1.0) * Xa


def r3(state, p):
    """Piruvato -> acetaldehído vía Pdc, modelado con cinética de Hill de orden 4."""
    s_pyr = max(state["s_pyr"], 0.0)
    Xa    = state["Xa"]
    spyr4 = s_pyr ** 4
    return p["k3"] * spyr4 / (spyr4 + p["K3"]) * Xa


def r4(state, p):
    """
    Acetaldehído -> acetato vía Acdh.
    Dependencia lineal del compartimento Acdh para capturar las
    variaciones de capacidad a nivel de isoenzimas.
    """
    s_a = max(state["s_acetald"], 0.0)
    Xa, XAcdh = state["Xa"], state["XAcdh"]
    return p["k4"] * s_a / (s_a + p["K4"]) * Xa * XAcdh


def r5(state, p):
    """
    Acetato -> acetil-CoA vía Acs (dos isoenzimas).

    El primer término (Acs2p) siempre está activo; el segundo término
    (Acs1p) está reprimido por glucosa, por lo que sólo contribuye durante
    el crecimiento sobre etanol.
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
    """Reacción reversible acetaldehído <-> etanol vía Adh."""
    s_a = max(state["s_acetald"], 0.0)
    s_e = max(state["s_EtOH"],    0.0)
    Xa  = state["Xa"]

    num   = p["k6"] * s_a - p["k6r"] * s_e
    denom = s_a + p["K6"] + p["K6e"] * s_e
    return num / denom * Xa


# ---------------------------------------------------------------------------
# Reacciones anabólicas
# ---------------------------------------------------------------------------
def r7(state, p):
    """Anabolismo desde glucosa -> compartimento activo Xa."""
    s_glu = max(state["s_glu"], 0.0)
    Xa    = state["Xa"]
    return p["k7"] * s_glu / (s_glu + p["K7"]) * Xa


def r8(state, p):
    """
    Anabolismo desde acetato -> Xa (reprimido por glucosa; comparte la
    afinidad con el término Acs1p de r5).
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
# Dinámica de los compartimentos
# ---------------------------------------------------------------------------
def r9(state, p):
    """
    Síntesis del compartimento de acetaldehído-deshidrogenasa.

    Dos términos activadores (Monod en glucosa con inhibición y Monod en
    etanol con la misma inhibición), más un pequeño término constitutivo.
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
    """Decaimiento de primer orden del compartimento activo Xa."""
    s_glu = max(state["s_glu"],  0.0)
    s_e   = max(state["s_EtOH"], 0.0)
    Xa    = state["Xa"]
    on_glucose = p["k10"]  * s_glu / (s_glu + p["K10"])
    on_ethanol = p["k10e"] * s_e   / (s_e   + p["K10e"])
    return (on_glucose + on_ethanol) * Xa


def r11(state, p):
    """Decaimiento de primer orden del compartimento Acdh."""
    return p["k11"] * state["XAcdh"]


# ---------------------------------------------------------------------------
# Utilidad: evalúa todas las velocidades y las retorna como un diccionario
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
