"""
Punto de entrada FastAPI para la herramienta de exploración del modelo de
levadura de Lei et al. (2001).

Ejecutar con::

    uvicorn app:app --reload --port 8000

La API expone endpoints para:
    - Gestión de parámetros (valores por defecto + validación).
    - Quimiostato: simulación dinámica, barrido en estado estacionario, análisis de régimen.
    - Simulación batch.
    - Diagramas de bifurcación.
    - Reproducción de las figuras del artículo.
"""

from __future__ import annotations
import os
import sys
import logging
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# Hace que el paquete sea importable cuando se ejecuta como script
sys.path.insert(0, os.path.dirname(__file__))

from models.parameters import (
    DEFAULT_PARAMETERS,
    DEFAULT_INITIAL_CONDITIONS,
    parameter_bounds,
)
from simulations.chemostat import (
    simulate_dynamic, steady_state_sweep, characterise_regime,
)
from simulations.batch import simulate_batch
from simulations.bifurcation import bifurcation_diagram, multiplicity_region


logger = logging.getLogger("yeast_app")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Yeast Model Explorer",
    description="Lei, Rotbøll & Jørgensen (2001) S. cerevisiae model — "
                "interactive simulation and analysis tool.",
    version="1.0.0",
)

# Permite que el servidor de desarrollo de React se comunique con nosotros
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================================
# Esquemas Pydantic
# ===========================================================================
class ParametersOverride(BaseModel):
    """Subconjunto opcional de parámetros cinéticos que sobreescribe los valores por defecto."""
    overrides: Optional[Dict[str, float]] = None

    def merged(self) -> Dict[str, float]:
        merged = dict(DEFAULT_PARAMETERS)
        if self.overrides:
            for key, value in self.overrides.items():
                if key not in DEFAULT_PARAMETERS:
                    raise HTTPException(400, f"Unknown parameter: {key}")
                if value is None or value < 0:
                    raise HTTPException(400, f"Parameter {key} must be ≥ 0")
                merged[key] = float(value)
        return merged


class DynamicRequest(ParametersOverride):
    D:  float = Field(..., ge=0.0, le=2.0, description="Dilution rate (h⁻¹)")
    Sf: float = Field(..., ge=0.0, le=300.0, description="Feed glucose (g/L)")
    t_end:     float = Field(100.0, gt=0.0, le=2000.0)
    n_points:  int   = Field(400, gt=10, le=5000)
    initial_conditions: Optional[Dict[str, float]] = None
    solver: str = Field("lsoda", description="ODE solver: 'lsoda' or 'rk4'")
    rk4_step: float = Field(0.005, gt=1e-5, le=1.0,
                            description="RK4 step size (h). Used only when solver='rk4'.")


class SweepRequest(ParametersOverride):
    Sf:    float = Field(15.0, ge=0.5, le=300.0)
    D_min: float = Field(0.02, ge=0.0, le=2.0)
    D_max: float = Field(0.50, ge=0.0, le=2.0)
    n:     int   = Field(60, ge=5, le=300)
    solver: str = Field("lsoda")
    rk4_step: float = Field(0.005, gt=1e-5, le=1.0)

    @validator("D_max")
    def _check(cls, v, values):
        if "D_min" in values and v <= values["D_min"]:
            raise ValueError("D_max must be greater than D_min")
        return v


class BatchRequest(ParametersOverride):
    t_end:    float = Field(30.0, gt=0.0, le=200.0)
    n_points: int   = Field(600, ge=10, le=5000)
    initial_conditions: Optional[Dict[str, float]] = None
    solver: str = Field("lsoda")
    rk4_step: float = Field(0.005, gt=1e-5, le=1.0)


class BifurcationRequest(ParametersOverride):
    Sf:    float = Field(30.0, gt=0.0)
    D_min: float = Field(0.25)
    D_max: float = Field(0.45)
    n:     int   = Field(60, ge=10, le=200)
    solver: str = Field("lsoda")
    rk4_step: float = Field(0.005, gt=1e-5, le=1.0)


class MultiplicityRequest(ParametersOverride):
    Sf_values: List[float] = Field(default_factory=lambda: [10, 20, 30, 50, 80, 120])
    solver: str = Field("lsoda")
    rk4_step: float = Field(0.005, gt=1e-5, le=1.0)


# ===========================================================================
# Salud / metadatos
# ===========================================================================
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/parameters/defaults")
def parameter_defaults():
    return {
        "parameters":          DEFAULT_PARAMETERS,
        "initial_conditions":  DEFAULT_INITIAL_CONDITIONS,
        "bounds":              {k: list(v) for k, v in parameter_bounds().items()},
    }


@app.get("/api/parameters/info")
def parameter_info():
    """Descripción legible de cada parámetro (usada por los tooltips)."""
    descriptions = {
        "k1h": "High-affinity glucose uptake rate constant.",
        "K1h": "High-affinity glucose half-saturation constant.",
        "k1l": "Low-affinity glucose uptake rate constant.",
        "K1l": "Low-affinity glucose half-saturation constant.",
        "k1e": "Excess (acetaldehyde-triggered) glucose uptake rate.",
        "K1e": "Excess uptake half-saturation constant.",
        "K1i": "Acetaldehyde inhibition constant for excess uptake.",
        "k2":  "Pdh (pyruvate → acetyl-CoA) rate constant.",
        "K2":  "Pdh affinity for pyruvate.",
        "K2i": "Glucose repression constant for Pdh.",
        "k3":  "Pdc (pyruvate → acetaldehyde) rate constant (Hill order 4).",
        "K3":  "Pdc half-saturation (Hill).",
        "k4":  "Acdh (acetaldehyde → acetate) rate constant.",
        "K4":  "Acdh affinity for acetaldehyde.",
        "k5":  "Acs2p (acetate → acetyl-CoA) rate constant.",
        "K5":  "Acs2p affinity for acetate.",
        "k5e": "Acs1p rate constant (glucose-repressed).",
        "K5e": "Acs1p affinity for acetate.",
        "K5i": "Glucose repression constant for Acs1p / r8.",
        "k6":  "Adh forward rate (acetaldehyde → ethanol).",
        "K6":  "Adh affinity for acetaldehyde.",
        "k6r": "Adh reverse rate (ethanol → acetaldehyde).",
        "K6e": "Ethanol inhibition constant on Adh.",
        "k7":  "Anabolism-from-glucose rate constant.",
        "K7":  "Anabolism-from-glucose affinity.",
        "k8":  "Anabolism-from-acetate rate constant.",
        "k9":  "Acdh-compartment glucose-driven synthesis rate.",
        "K9":  "Acdh-compartment glucose affinity.",
        "k9e": "Acdh-compartment ethanol-driven synthesis rate.",
        "K9e": "Acdh-compartment ethanol affinity.",
        "K9i": "Glucose repression on Acdh-compartment synthesis.",
        "k9c": "Constitutive Acdh-compartment synthesis.",
        "k10": "Active-compartment decay (glucose-active).",
        "K10": "Active-compartment decay glucose affinity.",
        "k10e":"Active-compartment decay (ethanol-active).",
        "K10e":"Active-compartment decay ethanol affinity.",
        "k11": "Acdh-compartment first-order decay.",
    }
    return descriptions


# ===========================================================================
# Endpoints del quimiostato
# ===========================================================================
@app.post("/api/chemostat/dynamic")
def chemostat_dynamic(req: DynamicRequest):
    p = req.merged()
    return simulate_dynamic(
        D=req.D, Sf=req.Sf,
        t_end=req.t_end, n_points=req.n_points,
        y0=req.initial_conditions,
        parameters=p,
        solver=req.solver, rk4_step=req.rk4_step,
    )


@app.post("/api/chemostat/sweep")
def chemostat_sweep(req: SweepRequest):
    p = req.merged()
    sweep = steady_state_sweep(
        Sf=req.Sf, D_min=req.D_min, D_max=req.D_max, n=req.n,
        parameters=p,
        solver=req.solver, rk4_step=req.rk4_step,
    )
    metrics = characterise_regime(sweep)
    return {"sweep": sweep, "metrics": metrics}


# ===========================================================================
# Batch
# ===========================================================================
@app.post("/api/batch/simulate")
def batch_simulate(req: BatchRequest):
    p = req.merged()
    return simulate_batch(
        t_end=req.t_end, n_points=req.n_points,
        initial_conditions=req.initial_conditions,
        parameters=p,
        solver=req.solver, rk4_step=req.rk4_step,
    )


# ===========================================================================
# Bifurcación
# ===========================================================================
@app.post("/api/bifurcation/diagram")
def bifurcation(req: BifurcationRequest):
    p = req.merged()
    return bifurcation_diagram(
        Sf=req.Sf, D_min=req.D_min, D_max=req.D_max, n=req.n,
        parameters=p,
        solver=req.solver, rk4_step=req.rk4_step,
    )


@app.post("/api/bifurcation/multiplicity_region")
def multiplicity(req: MultiplicityRequest):
    p = req.merged()
    return multiplicity_region(
        req.Sf_values, parameters=p,
        solver=req.solver, rk4_step=req.rk4_step,
    )


# ===========================================================================
# Reproducciones de las figuras del artículo
# ===========================================================================
# Se cachean los datos de las figuras después del primer cálculo para que los
# clics subsiguientes sean instantáneos. Las figuras usan DEFAULT_PARAMETERS,
# por lo que el resultado es determinista.
_FIG_CACHE: Dict[str, dict] = {}


@app.get("/api/figures/fig3")
def fig3():
    """Quimiostato en estado estacionario a Sf=15 g/L (Fig. 3 del artículo)."""
    if "fig3" not in _FIG_CACHE:
        _FIG_CACHE["fig3"] = steady_state_sweep(Sf=15.0, D_min=0.05, D_max=0.50, n=80)
    return _FIG_CACHE["fig3"]


@app.get("/api/figures/fig4")
def fig4():
    """Piruvato / acetaldehído / acetato / Xa / XAcdh en estado estacionario (Fig. 4)."""
    if "fig3" not in _FIG_CACHE:
        _FIG_CACHE["fig3"] = steady_state_sweep(Sf=15.0, D_min=0.05, D_max=0.50, n=80)
    return _FIG_CACHE["fig3"]


@app.get("/api/figures/fig5")
def fig5():
    """Simulación batch, Sglu0=15 g/L (Fig. 5)."""
    if "fig5" not in _FIG_CACHE:
        _FIG_CACHE["fig5"] = simulate_batch(t_end=35.0, n_points=700)
    return _FIG_CACHE["fig5"]


@app.get("/api/figures/fig10A")
def fig10A():
    """Diagrama de bifurcación, Sf=30 g/L (Fig. 10A)."""
    if "fig10A" not in _FIG_CACHE:
        _FIG_CACHE["fig10A"] = bifurcation_diagram(
            Sf=30.0, D_min=0.28, D_max=0.44, n=50,
        )
    return _FIG_CACHE["fig10A"]


@app.get("/api/figures/fig10B")
def fig10B():
    """Región de multiplicidad en el plano (Sf, D) (Fig. 10B)."""
    if "fig10B" not in _FIG_CACHE:
        _FIG_CACHE["fig10B"] = multiplicity_region([16, 20, 30, 50, 80, 120, 160])
    return _FIG_CACHE["fig10B"]


@app.get("/api/figures/fig11")
def fig11():
    """Acetaldehído vs D para tres valores de Sf (Fig. 11)."""
    if "fig11" not in _FIG_CACHE:
        out = {}
        for Sf in [15.0, 30.0, 100.0]:
            diag = bifurcation_diagram(Sf, D_min=0.20, D_max=0.45, n=50)
            out[f"Sf_{int(Sf)}"] = diag
        _FIG_CACHE["fig11"] = out
    return _FIG_CACHE["fig11"]


# ===========================================================================
# Frontend estático (cuando está empaquetado). Se mantiene al FINAL para que
# las rutas /api tengan prioridad.
# ===========================================================================
from fastapi.staticfiles import StaticFiles
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
