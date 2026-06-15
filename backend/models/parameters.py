"""
Kinetic and affinity parameters for the Lei, Rotbøll & Jørgensen (2001)
biochemically structured model for Saccharomyces cerevisiae.

All values are taken from Table 7 of the original paper.
Units follow the paper's conventions:
    k_i : rate constants (g g^-1 h^-1)
    K_i : affinity constants (g L^-1)
    K_ji: inhibition constants (L g^-1)
"""

# ---------------------------------------------------------------------------
# Kinetic constants (Table 7)
# ---------------------------------------------------------------------------
DEFAULT_PARAMETERS = {
    # Glucose uptake / glycolysis (r1) -------------------------------------
    "k1h": 0.584,
    "K1h": 0.0116,
    "k1l": 1.43,
    "K1l": 0.94,
    "k1e": 47.1,
    "K1e": 0.12,
    "K1i": 14.2,

    # Pyruvate to acetyl-CoA via Pdh (r2) ----------------------------------
    "k2":  0.501,
    "K2":  2.0e-5,
    "K2i": 0.101,

    # Pyruvate to acetaldehyde via Pdc (r3) --------------------------------
    "k3":  5.81,
    "K3":  5.0e-7,

    # Acetaldehyde to acetate via Acdh (r4) --------------------------------
    "k4":  4.80,
    "K4":  2.64e-4,

    # Acetate to acetyl-CoA via Acs (r5) -----------------------------------
    "k5":  0.0104,
    "K5":  0.0102,
    "k5e": 0.775,
    "K5e": 0.10,
    "K5i": 440.0,

    # Acetaldehyde <-> Ethanol via Adh (r6) --------------------------------
    "k6":  2.82,
    "K6":  0.034,
    "k6r": 0.0125,
    "K6e": 0.057,

    # Anabolism from glucose (r7) ------------------------------------------
    "k7":  1.203,
    "K7":  0.0101,

    # Anabolism from acetate (r8) ------------------------------------------
    "k8":  0.589,

    # Acdh compartment synthesis (r9) --------------------------------------
    "k9":  0.008,
    "K9":  1.0e-6,
    "k9e": 0.0751,
    "K9e": 13.0,        # Affinity for ethanol activation
    "K9i": 25.0,        # Glucose inhibition constant
    "k9c": 3.99e-3,     # Constitutive synthesis

    # Active compartment degradation (r10) ---------------------------------
    "k10":  0.392,
    "K10":  2.3e-3,
    "k10e": 3.39e-3,
    "K10e": 1.8e-3,

    # Acdh compartment degradation (r11) -----------------------------------
    "k11":  0.02,
}


# ---------------------------------------------------------------------------
# Sensible operating-condition defaults for the UI
# ---------------------------------------------------------------------------
DEFAULT_INITIAL_CONDITIONS = {
    "s_glu":     15.0,    # g/L  glucose
    "s_pyr":     0.0,     # g/L
    "s_acetald": 0.0,     # g/L
    "s_acetate": 0.0,     # g/L
    "s_EtOH":    0.0,     # g/L
    "x":         0.002,   # g/L  biomass (matches batch sim in paper)
    "Xa":        0.1,     # g/g  active compartment
    "XAcdh":     0.0075,  # g/g  Acdh compartment
}


# ---------------------------------------------------------------------------
# Stoichiometric coefficients that appear inside the mass balances
# (Table 4 of the paper). They convert from C-mole basis to mass basis.
# ---------------------------------------------------------------------------
STOICH = {
    # Substrate balances
    "pyr_from_r1":     1.022,      # 30/30 corrected by C-mol ratio (≈1)
    "pyr_to_TCA_r2":   1.0,
    "pyr_to_acet_r3":  0.5,        # 0.5 in dsacetald/dt
    "acetate_r4":      1.363,      # used in dsacetate/dt
    "EtOH_r6":         1.045,      # in dsEtOH/dt

    # Biomass / compartment factors
    "biomass_r7":      0.732,
    "biomass_r8":      0.619,
}


def parameter_bounds():
    """
    Reasonable lower/upper bounds for UI validation.
    Bounds are intentionally generous (3 orders of magnitude around the
    default) to leave room for exploration without producing nonsense.
    """
    bounds = {}
    for key, value in DEFAULT_PARAMETERS.items():
        v = abs(value) if value != 0 else 1.0
        bounds[key] = (v * 1e-3, v * 1e3)
    return bounds
