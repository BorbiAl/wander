import numpy as np


def forward(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray):
    """P(observations | model). Returns alpha matrix (T x N)."""
    T, N = len(obs), len(pi)
    alpha = np.zeros((T, N))
    alpha[0] = pi * B[:, obs[0]]
    for t in range(1, T):
        alpha[t] = (alpha[t - 1] @ A) * B[:, obs[t]]
    return alpha


def backward(obs: np.ndarray, A: np.ndarray, B: np.ndarray):
    """Backward pass. Returns beta matrix (T x N)."""
    T, N = len(obs), A.shape[0]
    beta = np.zeros((T, N))
    beta[-1] = 1.0
    for t in range(T - 2, -1, -1):
        beta[t] = A @ (B[:, obs[t + 1]] * beta[t + 1])
    return beta


def viterbi(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray):
    """Most likely hidden state sequence via dynamic programming."""
    T, N = len(obs), len(pi)
    delta = np.zeros((T, N))
    psi = np.zeros((T, N), dtype=int)

    delta[0] = pi * B[:, obs[0]]
    for t in range(1, T):
        for j in range(N):
            probs = delta[t - 1] * A[:, j]
            psi[t, j] = np.argmax(probs)
            delta[t, j] = np.max(probs) * B[j, obs[t]]

    path = np.zeros(T, dtype=int)
    path[-1] = np.argmax(delta[-1])
    for t in range(T - 2, -1, -1):
        path[t] = psi[t + 1, path[t + 1]]

    return path, float(np.max(delta[-1]))


def get_personality_vector(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray):
    """Run forward, normalize final alpha row into a 5D personality vector."""
    alpha = forward(obs, A, B, pi)
    final = alpha[-1]
    total = final.sum()
    if total < 1e-300:
        return np.ones(len(pi)) / len(pi)
    return (final / total).tolist()


def baum_welch(obs: np.ndarray, A: np.ndarray, B: np.ndarray, pi: np.ndarray, steps: int = 10):
    """Baum-Welch EM re-estimation with full forward-backward."""
    N = A.shape[0]
    M = B.shape[1]
    T = len(obs)

    A_cur = A.copy()
    B_cur = B.copy()
    pi_cur = pi.copy()

    for _ in range(steps):
        alpha = forward(obs, A_cur, B_cur, pi_cur)
        beta = backward(obs, A_cur, B_cur)

        # Gamma: P(state j at time t | obs, model)
        gamma = alpha * beta
        gamma_sums = gamma.sum(axis=1, keepdims=True)
        gamma_sums = np.clip(gamma_sums, 1e-300, None)
        gamma = gamma / gamma_sums

        # Xi: P(state i at t, state j at t+1 | obs, model)
        xi = np.zeros((T - 1, N, N))
        for t in range(T - 1):
            numer = (alpha[t, :, None] * A_cur *
                     B_cur[:, obs[t + 1]][None, :] * beta[t + 1, :][None, :])
            denom = numer.sum()
            if denom < 1e-300:
                xi[t] = 1.0 / (N * N)
            else:
                xi[t] = numer / denom

        # Re-estimate
        pi_cur = gamma[0]

        for i in range(N):
            denom = gamma[:T - 1, i].sum()
            if denom < 1e-300:
                A_cur[i] = 1.0 / N
            else:
                A_cur[i] = xi[:, i, :].sum(axis=0) / denom

            denom_b = gamma[:, i].sum()
            if denom_b < 1e-300:
                B_cur[i] = 1.0 / M
            else:
                for k in range(M):
                    mask = (obs == k)
                    B_cur[i, k] = gamma[mask, i].sum() / denom_b

    return A_cur, B_cur, pi_cur
