import numpy as np

def embeddings_consistent(es, t=0.5):
    for i in range(len(es)):
        for j in range(i + 1, len(es)):
            if float(np.dot(es[i], es[j])) < t:
                return False
    return True


def aggregate_embeddings(es):
    c = np.mean(es, axis=0)
    return c / np.linalg.norm(c)
