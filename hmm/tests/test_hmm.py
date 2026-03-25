import numpy as np

from hmm.algorithms import baum_welch, forward, viterbi


def sample_params():
    A = np.array([[0.7, 0.3], [0.4, 0.6]], dtype=float)
    B = np.array([[0.9, 0.1], [0.2, 0.8]], dtype=float)
    pi = np.array([0.6, 0.4], dtype=float)
    return A, B, pi


def test_forward_shape():
    A, B, pi = sample_params()
    obs = np.array([0, 1, 0, 1])
    alpha = forward(obs, A, B, pi)
    assert alpha.shape == (4, 2)


def test_viterbi_path_length():
    A, B, pi = sample_params()
    obs = np.array([0, 1, 0, 1])
    path, score = viterbi(obs, A, B, pi)
    assert len(path) == len(obs)
    assert score >= 0


def test_baum_welch_shapes():
    A, B, pi = sample_params()
    obs = np.array([0, 1, 0, 1])
    A2, B2, pi2 = baum_welch(obs, A, B, pi)
    assert A2.shape == A.shape
    assert B2.shape == B.shape
    assert pi2.shape == pi.shape
