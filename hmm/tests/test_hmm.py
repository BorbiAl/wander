import numpy as np
import pytest

from hmm.algorithms import forward, backward, viterbi, get_personality_vector, baum_welch
from hmm.model import load_params


# --- Small 2-state model for algorithm correctness ---

def small_params():
    A = np.array([[0.7, 0.3], [0.4, 0.6]])
    B = np.array([[0.9, 0.1], [0.2, 0.8]])
    pi = np.array([0.6, 0.4])
    return A, B, pi


def test_forward_shape():
    A, B, pi = small_params()
    obs = np.array([0, 1, 0, 1])
    alpha = forward(obs, A, B, pi)
    assert alpha.shape == (4, 2)


def test_forward_first_step():
    A, B, pi = small_params()
    obs = np.array([0, 1])
    alpha = forward(obs, A, B, pi)
    # alpha[0] = pi * B[:, obs[0]]
    np.testing.assert_allclose(alpha[0], [0.6 * 0.9, 0.4 * 0.2])


def test_backward_shape():
    A, B, pi = small_params()
    obs = np.array([0, 1, 0])
    beta = backward(obs, A, B)
    assert beta.shape == (3, 2)
    # Last row should be all 1s
    np.testing.assert_allclose(beta[-1], [1.0, 1.0])


def test_viterbi_path_length():
    A, B, pi = small_params()
    obs = np.array([0, 1, 0, 1])
    path, score = viterbi(obs, A, B, pi)
    assert len(path) == 4
    assert score > 0


def test_viterbi_known_sequence():
    """State 0 emits 0 strongly, state 1 emits 1 strongly.
    Sequence [0,0,0] should decode to all state 0."""
    A, B, pi = small_params()
    obs = np.array([0, 0, 0])
    path, _ = viterbi(obs, A, B, pi)
    assert all(s == 0 for s in path)


def test_baum_welch_shapes():
    A, B, pi = small_params()
    obs = np.array([0, 1, 0, 1, 0])
    A2, B2, pi2 = baum_welch(obs, A, B, pi, steps=3)
    assert A2.shape == A.shape
    assert B2.shape == B.shape
    assert pi2.shape == pi.shape
    # Rows should still sum to ~1
    np.testing.assert_allclose(A2.sum(axis=1), [1.0, 1.0], atol=1e-6)
    np.testing.assert_allclose(B2.sum(axis=1), [1.0, 1.0], atol=1e-6)


# --- Full 5-state WanderGraph model tests ---

@pytest.fixture
def wg_params():
    return load_params()


def test_load_params_shapes(wg_params):
    assert wg_params['A'].shape == (5, 5)
    assert wg_params['B'].shape[0] == 5
    assert wg_params['B'].shape[1] == 29  # 29 emission types
    assert wg_params['pi'].shape == (5,)
    assert len(wg_params['states']) == 5


def test_load_params_stochastic(wg_params):
    """All rows should sum to 1."""
    np.testing.assert_allclose(wg_params['A'].sum(axis=1), np.ones(5), atol=1e-4)
    np.testing.assert_allclose(wg_params['B'].sum(axis=1), np.ones(5), atol=1e-4)
    np.testing.assert_allclose(wg_params['pi'].sum(), 1.0, atol=1e-4)


def test_explorer_user(wg_params):
    """Synthetic explorer: picks wilderness, solo, nature, forest sounds, deep scroll, explore emoji."""
    # Emissions: img_wilderness=0, img_solo=3, img_nature=10, audio_forest_high=12,
    # scroll_deep=20, emoji_explore=21
    obs = np.array([0, 21, 0, 21, 0, 21, 0, 21, 20, 3])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    # Explorer (index 0) should be dominant
    assert pv.index(max(pv)) == 0, f"Expected explorer dominant, got {wg_params['states'][pv.index(max(pv))]}"


def test_connector_user(wg_params):
    """Synthetic connector: picks group, village, cultural, festival sounds."""
    # img_group=2, img_village=5, img_cultural=9, audio_festival_high=14, emoji_connect=22
    obs = np.array([2, 5, 9, 14, 22, 2, 5, 9, 14, 22, 2, 5, 9, 14, 22])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    assert pv.index(max(pv)) == 1, f"Expected connector dominant, got {wg_params['states'][pv.index(max(pv))]}"


def test_restorer_user(wg_params):
    """Synthetic restorer: picks solo, nature, forest sounds, calm emoji, deep scroll."""
    # img_solo=3, img_nature=10, audio_forest_high=12, scroll_deep=20, emoji_calm=23
    obs = np.array([3, 10, 12, 20, 23, 3, 10, 12, 20, 23, 3, 10, 12, 20, 23])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    assert pv.index(max(pv)) == 2, f"Expected restorer dominant, got {wg_params['states'][pv.index(max(pv))]}"


def test_achiever_user(wg_params):
    """Synthetic achiever: picks mountain, adventure, fast scroll, challenge emoji."""
    # img_mountain=4, img_adventure=8, audio_wind_high=16, scroll_skip=18, emoji_challenge=24
    obs = np.array([4, 8, 16, 18, 24, 4, 8, 16, 18, 24, 4, 8, 16, 18, 24])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    assert pv.index(max(pv)) == 3, f"Expected achiever dominant, got {wg_params['states'][pv.index(max(pv))]}"


def test_guardian_user(wg_params):
    """Synthetic guardian: picks eco, village, impact emoji, budget high."""
    # img_eco=6, img_village=5, img_cultural=9, emoji_impact=25, budget_high=28
    obs = np.array([6, 5, 9, 25, 28, 6, 5, 9, 25, 28, 6, 5, 9, 25, 28])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    assert pv.index(max(pv)) == 4, f"Expected guardian dominant, got {wg_params['states'][pv.index(max(pv))]}"


def test_personality_vector_sums_to_one(wg_params):
    obs = np.array([0, 3, 7, 12, 18, 22, 26, 1, 5, 10, 15, 20, 24, 27, 8])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    pv = get_personality_vector(obs, A, B, pi)
    assert abs(sum(pv) - 1.0) < 1e-6


def test_viterbi_path_valid_states(wg_params):
    obs = np.array([0, 3, 7, 12, 18, 22, 26, 1, 5, 10, 15, 20, 24, 27, 8])
    A, B, pi = wg_params['A'], wg_params['B'], wg_params['pi']
    path, score = viterbi(obs, A, B, pi)
    assert len(path) == 15
    assert all(0 <= s <= 4 for s in path)
    assert score > 0
