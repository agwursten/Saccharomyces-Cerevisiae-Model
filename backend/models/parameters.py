"""
Parámetros cinéticos y de afinidad del modelo bioquímicamente estructurado
para Saccharomyces cerevisiae de Lei, Rotbøll & Jørgensen (2001).

Todos los valores se tomaron de la Tabla 7 del artículo original.
Las unidades siguen las convenciones del artículo:
    k_i : constantes de velocidad (g·g⁻¹·h⁻¹)
    K_i : constantes de afinidad  (g·L⁻¹)
    K_ji: constantes de inhibición (L·g⁻¹)
"""

# ---------------------------------------------------------------------------
# Constantes cinéticas (Tabla 7)
# ---------------------------------------------------------------------------
DEFAULT_PARAMETERS = {
    # Captación de glucosa / glucólisis (r1) -------------------------------
    "k1h": 0.584,
    "K1h": 0.0116,
    "k1l": 1.43,
    "K1l": 0.94,
    "k1e": 47.1,
    "K1e": 0.12,
    "K1i": 14.2,

    # Piruvato a acetil-CoA vía Pdh (r2) -----------------------------------
    "k2":  0.501,
    "K2":  2.0e-5,
    "K2i": 0.101,

    # Piruvato a acetaldehído vía Pdc (r3) ---------------------------------
    "k3":  5.81,
    "K3":  5.0e-7,

    # Acetaldehído a acetato vía Acdh (r4) ---------------------------------
    "k4":  4.80,
    "K4":  2.64e-4,

    # Acetato a acetil-CoA vía Acs (r5) ------------------------------------
    "k5":  0.0104,
    "K5":  0.0102,
    "k5e": 0.775,
    "K5e": 0.10,
    "K5i": 440.0,

    # Acetaldehído <-> Etanol vía Adh (r6) ---------------------------------
    "k6":  2.82,
    "K6":  0.034,
    "k6r": 0.0125,
    "K6e": 0.057,

    # Anabolismo desde glucosa (r7) ----------------------------------------
    "k7":  1.203,
    "K7":  0.0101,

    # Anabolismo desde acetato (r8) ----------------------------------------
    "k8":  0.589,

    # Síntesis del compartimento Acdh (r9) ---------------------------------
    "k9":  0.008,
    "K9":  1.0e-6,
    "k9e": 0.0751,
    "K9e": 13.0,        # Afinidad para la activación por etanol
    "K9i": 25.0,        # Constante de inhibición por glucosa
    "k9c": 3.99e-3,     # Síntesis constitutiva

    # Degradación del compartimento activo (r10) ---------------------------
    "k10":  0.392,
    "K10":  2.3e-3,
    "k10e": 3.39e-3,
    "K10e": 1.8e-3,

    # Degradación del compartimento Acdh (r11) -----------------------------
    "k11":  0.02,
}


# ---------------------------------------------------------------------------
# Valores por defecto sensatos para las condiciones de operación en la UI
# ---------------------------------------------------------------------------
DEFAULT_INITIAL_CONDITIONS = {
    "s_glu":     15.0,    # g/L  glucosa
    "s_pyr":     0.0,     # g/L
    "s_acetald": 0.0,     # g/L
    "s_acetate": 0.0,     # g/L
    "s_EtOH":    0.0,     # g/L
    "x":         0.002,   # g/L  biomasa (coincide con la simulación batch del artículo)
    "Xa":        0.1,     # g/g  compartimento activo
    "XAcdh":     0.0075,  # g/g  compartimento Acdh
}


# ---------------------------------------------------------------------------
# Coeficientes estequiométricos que aparecen dentro de los balances de masa
# (Tabla 4 del artículo). Convierten de base C-mol a base masa.
# ---------------------------------------------------------------------------
STOICH = {
    # Balances de sustratos
    "pyr_from_r1":     1.022,      # 30/30 corregido por la relación C-mol (≈1)
    "pyr_to_TCA_r2":   1.0,
    "pyr_to_acet_r3":  0.5,        # 0.5 en dsacetald/dt
    "acetate_r4":      1.363,      # usado en dsacetate/dt
    "EtOH_r6":         1.045,      # en dsEtOH/dt

    # Factores de biomasa / compartimentos
    "biomass_r7":      0.732,
    "biomass_r8":      0.619,
}


def parameter_bounds():
    """
    Cotas inferior/superior razonables para la validación en la UI.
    Las cotas son intencionalmente generosas (3 órdenes de magnitud
    alrededor del valor por defecto) para dejar espacio a la exploración
    sin producir resultados absurdos.
    """
    bounds = {}
    for key, value in DEFAULT_PARAMETERS.items():
        v = abs(value) if value != 0 else 1.0
        bounds[key] = (v * 1e-3, v * 1e3)
    return bounds
