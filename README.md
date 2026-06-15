# Saccharomyces Cerevisiae Model Explorer

Aplicación web para simular y explorar el modelo bioquímicamente estructurado de *Saccharomyces cerevisiae* descrito en:

> Lei, F., Rotbøll, M., Jørgensen, S.B. *A biochemically structured model for Saccharomyces cerevisiae*, **Journal of Biotechnology 88 (2001) 205–221**.

Incluye:

- Reproducción automática de las Figuras 3, 4, 5, 10A, 10B y 11 del artículo (carga secuencial con barra de progreso).
- Simulador de quimiostato en 4 pasos (Sf → análisis → simulación dinámica).
- Simulación batch con métricas (biomasa máxima, tiempo de agotamiento de glucosa, etanol máximo).
- Análisis automático de Dcrit, Dwashout, D óptima para biomasa y D óptima para productividad.
- Editor de parámetros cinéticos con validación frontend + backend y botón **Restaurar valores del artículo**.
- Tema claro/oscuro, diseño dashboard, gráficas sincronizadas con Plotly.
- Supuestos bióticos y abióticos del modelo documentados en la sección de teoría.

---

## Método numérico

La aplicación soporta **dos solvers de EDOs**, seleccionables desde la sección **Parámetros**:

- **LSODA** (por defecto): solver adaptativo multi-paso de SciPy que cambia automáticamente entre métodos rígidos (BDF) y no-rígidos (Adams). Muy rápido para este sistema.
- **Runge-Kutta 4** (RK4) con paso fijo configurable: implementación clásica a mano, transparente numéricamente, ideal para validar contra el método visto en clase. Más lento pero permite controlar el paso de integración `h`.

El RK4 aplica, en cada paso `h`:

```
k1 = f(t,         y)
k2 = f(t + h/2,   y + h·k1/2)
k3 = f(t + h/2,   y + h·k2/2)
k4 = f(t + h,     y + h·k3)
y_{n+1} = y_n + (h/6) · (k1 + 2·k2 + 2·k3 + k4)
```

Implementación en `backend/simulations/rk4.py`. Paso recomendado: `h = 0.005–0.02 h`. Para `h > 0.02` puede haber pérdida de precisión cerca del washout (sistema rígido).

---

## Arquitectura

```
yeast_app/
├── backend/                  Python 3.11+ · FastAPI · SciPy / NumPy
│   ├── app.py                Punto de entrada FastAPI (con caché en memoria)
│   ├── models/
│   │   ├── parameters.py     Tabla 7 del paper (constantes cinéticas)
│   │   ├── kinetics.py       Expresiones r1–r11 (Tabla 5)
│   │   ├── yeast_model.py    Balances de masa (Tabla 4) + tasas de gases
│   │   └── yeast_model_tuple.py  RHS optimizado (params como tupla)
│   ├── simulations/
│   │   ├── rk4.py            Runge-Kutta 4 con paso fijo
│   │   ├── chemostat.py      Dinámica + barrido de D + métricas
│   │   ├── batch.py          Simulación batch
│   │   └── bifurcation.py    Continuación forward/backward (Fig. 10)
│   └── requirements.txt
└── frontend/                 React 18 · Vite · Material UI · Plotly
    ├── package.json
    ├── vite.config.js        Proxy /api → http://127.0.0.1:8000
    ├── public/
    │   ├── favicon.svg
    │   └── metabolic_map.png Fig. 2 del paper
    └── src/
        ├── App.jsx
        ├── theme/theme.js
        ├── pages/            TheoryPage · ChemostatPage · BatchPage · ParametersPage
        ├── components/       PlotCard · MetricCard · NavigationBar
        └── services/api.js
```

---

## Instalación y ejecución

Primero necesitas tener instalado **Python ≥ 3.11** y **Node ≥ 18**. Luego sigue los pasos siguientes:

### 1. Backend

En **una terminal abierta**:

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
source .venv/bin/activate            # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

El backend queda escuchando en `http://127.0.0.1:8000`.
Documentación interactiva: `http://127.0.0.1:8000/docs`.

### 2. Frontend

En **otra terminal abierta**:

```bash
cd frontend
npm install
npm run dev
```

### 3. En el navegador

Abrí `http://localhost:5173`.

---
