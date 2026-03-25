from flask import Flask, jsonify, request
import numpy as np

from hmm.algorithms import get_personality_vector, viterbi, baum_welch
from hmm.model import load_params, save_params

app = Flask(__name__)
params = load_params()

A, B, pi = params['A'], params['B'], params['pi']
STATES = params['states']


@app.get('/health')
def health():
    return jsonify({'status': 'ok', 'states': STATES, 'n_emissions': B.shape[1]})


@app.post('/hmm/decode')
def decode():
    """Core endpoint: observations in → personality vector + state path out."""
    body = request.get_json(silent=True) or {}
    observations = body.get('observations', [])

    if not observations:
        return jsonify({'error': 'observations required'}), 400

    obs = np.array(observations, dtype=int)

    # Clamp to valid emission range
    obs = np.clip(obs, 0, B.shape[1] - 1)

    pv = get_personality_vector(obs, A, B, pi)
    path, score = viterbi(obs, A, B, pi)
    dominant = STATES[pv.index(max(pv))]

    return jsonify({
        'personality_vector': pv,
        'dominant_type': dominant,
        'state_path': [STATES[s] for s in path.tolist()],
        'confidence': float(score),
    })


@app.post('/hmm/train')
def train():
    """Offline: re-estimate A, B, pi from observation sequence via Baum-Welch."""
    body = request.get_json(silent=True) or {}
    observations = body.get('observations', [])
    steps = body.get('steps', 10)

    if not observations:
        return jsonify({'error': 'observations required'}), 400

    obs = np.array(observations, dtype=int)
    obs = np.clip(obs, 0, B.shape[1] - 1)

    A_new, B_new, pi_new = baum_welch(obs, A, B, pi, steps=steps)
    save_params(A_new, B_new, pi_new)

    return jsonify({'status': 'params_updated', 'steps': steps})


# Keep old /predict for backwards compat during development
@app.post('/predict')
def predict():
    body = request.get_json(silent=True) or {}
    observations = body.get('observations', [])
    obs = np.array(observations, dtype=int)
    obs = np.clip(obs, 0, B.shape[1] - 1)
    path, score = viterbi(obs, A, B, pi)
    return jsonify({'states': path.tolist(), 'score': float(score)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
