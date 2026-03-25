from flask import Flask, jsonify, request
import numpy as np

from hmm.algorithms import viterbi
from hmm.model import load_params

app = Flask(__name__)
params = load_params()


@app.get('/health')
def health():
    return jsonify({'status': 'ok'})


@app.post('/predict')
def predict():
    body = request.get_json(silent=True) or {}
    observations = body.get('observations', [])
    sequence = np.array(observations, dtype=int)
    path, score = viterbi(sequence, params['A'], params['B'], params['pi'])
    return jsonify({'states': path.tolist(), 'score': float(score)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
