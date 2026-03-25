import numpy as np


def forward(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray):
    n_states = A.shape[0]
    T = len(obs)
    alpha = np.zeros((T, n_states), dtype=float)
    alpha[0] = pi * B[:, obs[0]]
    for t in range(1, T):
        alpha[t] = (alpha[t - 1] @ A) * B[:, obs[t]]
    return alpha


def viterbi(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray):
    n_states = A.shape[0]
    T = len(obs)
    dp = np.zeros((T, n_states), dtype=float)
    back = np.zeros((T, n_states), dtype=int)

    dp[0] = pi * B[:, obs[0]]
    for t in range(1, T):
        for s in range(n_states):
            scores = dp[t - 1] * A[:, s]
            back[t, s] = int(np.argmax(scores))
            dp[t, s] = np.max(scores) * B[s, obs[t]]

    path = np.zeros(T, dtype=int)
    path[-1] = int(np.argmax(dp[-1]))
    for t in range(T - 2, -1, -1):
        path[t] = back[t + 1, path[t + 1]]

    return path, float(np.max(dp[-1]))


def baum_welch(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray, steps: int = 3):
    A_new = A.copy()
    B_new = B.copy()
    pi_new = pi.copy()

    for _ in range(steps):
        alpha = forward(obs, A_new, B_new, pi_new)
        gamma = alpha / np.clip(alpha.sum(axis=1, keepdims=True), 1e-12, None)
        pi_new = gamma[0]
        A_new = np.clip(A_new, 1e-12, None)
        A_new = A_new / A_new.sum(axis=1, keepdims=True)
        B_new = np.clip(B_new, 1e-12, None)
        B_new = B_new / B_new.sum(axis=1, keepdims=True)

    return A_new, B_new, pi_new
