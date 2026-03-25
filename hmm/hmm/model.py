import json
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).resolve().parent
PARAMS_PATH = BASE_DIR / 'params.json'

STATES = ['explorer', 'connector', 'restorer', 'achiever', 'guardian']


def load_params(path: Path = PARAMS_PATH):
    payload = json.loads(path.read_text(encoding='utf-8'))
    return {
        'A': np.array(payload['A'], dtype=float),
        'B': np.array(payload['B'], dtype=float),
        'pi': np.array(payload['pi'], dtype=float),
        'states': payload.get('states', STATES),
        'emissions': payload.get('emissions', []),
    }


def save_params(A: np.ndarray, B: np.ndarray, pi: np.ndarray, path: Path = PARAMS_PATH):
    existing = {}
    if path.exists():
        existing = json.loads(path.read_text(encoding='utf-8'))

    existing.update({
        'A': A.tolist(),
        'B': B.tolist(),
        'pi': pi.tolist(),
    })
    path.write_text(json.dumps(existing, indent=2), encoding='utf-8')
