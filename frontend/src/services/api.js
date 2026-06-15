import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

export const Api = {
  parameterDefaults: () => api.get('/parameters/defaults').then(r => r.data),
  parameterInfo:     () => api.get('/parameters/info').then(r => r.data),

  chemostatDynamic:  (payload) => api.post('/chemostat/dynamic', payload).then(r => r.data),
  chemostatSweep:    (payload) => api.post('/chemostat/sweep',   payload).then(r => r.data),

  batchSimulate:     (payload) => api.post('/batch/simulate',    payload).then(r => r.data),

  bifurcation:       (payload) => api.post('/bifurcation/diagram', payload).then(r => r.data),
  multiplicity:      (payload) => api.post('/bifurcation/multiplicity_region', payload).then(r => r.data),

  fig3:   () => api.get('/figures/fig3').then(r => r.data),
  fig4:   () => api.get('/figures/fig4').then(r => r.data),
  fig5:   () => api.get('/figures/fig5').then(r => r.data),
  fig10A: () => api.get('/figures/fig10A').then(r => r.data),
  fig10B: () => api.get('/figures/fig10B').then(r => r.data),
  fig11:  () => api.get('/figures/fig11').then(r => r.data),
};

export default Api;
