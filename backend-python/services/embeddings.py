"""Free, local text embeddings — the foundation of cheap retrieval.

Backends (chosen once per process, auto-detected):
  1. sentence-transformers  → high-quality, free, runs on CPU (preferred)
  2. deterministic hashing  → zero-dependency fallback, always works offline

Every retrieval in UniMind (expert routing, peer/Graph-RAG lookup, semantic
similarity) runs through here at €0 marginal cost. LLM calls are reserved for
synthesis only — that is the whole "cheaper at scale" story.

Vectors are L2-normalised, so cosine similarity is a plain dot product.
Each vector is tagged with `backend_name()` when stored, so we never compare
vectors produced by different backends (their spaces are unrelated).
"""

from __future__ import annotations

import os
import re
import asyncio
import hashlib
import threading

import numpy as np

# all-MiniLM-L6-v2 is 384-dim; we keep the hash fallback at the same width so
# stored blobs have a consistent shape regardless of which backend is live.
EMBED_DIM = 384
_ST_MODEL_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
_BACKEND_PREF = os.getenv("EMBED_BACKEND", "auto")  # auto | st | hash

_st_model = None
_st_tried = False
_lock = threading.Lock()
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _load_st():
    """Lazily load the sentence-transformers model. Returns None on any failure
    (no internet / weights not cached / package missing) → caller uses hashing."""
    global _st_model, _st_tried
    if _st_tried:
        return _st_model
    with _lock:
        if _st_tried:
            return _st_model
        _st_tried = True
        if _BACKEND_PREF == "hash":
            return None
        # Keep the server log clean — silence HF download/weight progress bars.
        os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
        os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
        os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")
        try:
            from sentence_transformers import SentenceTransformer
            _st_model = SentenceTransformer(_ST_MODEL_NAME)
        except Exception:
            _st_model = None
        return _st_model


def backend_name() -> str:
    model = _load_st()
    return f"st:{_ST_MODEL_NAME}" if model is not None else "hash:v1"


def retrieval_threshold() -> float:
    """A sensible 'is this actually related?' cutoff for the active backend.
    Hash-fallback cosines are compressed (weak signal) so its cutoff is lower;
    real sentence-transformers similarities are well-separated."""
    return 0.05 if backend_name().startswith("hash") else 0.22


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall((text or "").lower())


def _hash_embed(text: str) -> np.ndarray:
    """Deterministic bag-of-(uni+bi)grams hashed into EMBED_DIM buckets with a
    signed accumulation, then L2-normalised. Crude but real, stable, and free."""
    vec = np.zeros(EMBED_DIM, dtype=np.float32)
    tokens = _tokenize(text)
    grams = list(tokens) + [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens) - 1)]
    for g in grams:
        h = int(hashlib.md5(g.encode("utf-8")).hexdigest(), 16)
        idx = h % EMBED_DIM
        sign = 1.0 if (h >> 17) & 1 else -1.0
        vec[idx] += sign
    norm = float(np.linalg.norm(vec))
    return vec / norm if norm else vec


def embed_sync(text: str) -> np.ndarray:
    model = _load_st()
    if model is not None:
        v = model.encode([text or ""], normalize_embeddings=True)[0]
        return np.asarray(v, dtype=np.float32)
    return _hash_embed(text or "")


def embed_batch_sync(texts: list[str]) -> list[np.ndarray]:
    model = _load_st()
    if model is not None:
        arr = model.encode([t or "" for t in texts], normalize_embeddings=True)
        return [np.asarray(v, dtype=np.float32) for v in arr]
    return [_hash_embed(t or "") for t in texts]


async def embed(text: str) -> np.ndarray:
    """Async wrapper — runs the (CPU-bound) encode off the event loop."""
    return await asyncio.to_thread(embed_sync, text)


async def embed_batch(texts: list[str]) -> list[np.ndarray]:
    if not texts:
        return []
    return await asyncio.to_thread(embed_batch_sync, texts)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity. Inputs are normalised, so this is a dot product, but
    we guard against unnormalised / zero vectors just in case."""
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    if a.shape != b.shape:
        return 0.0
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom else 0.0


def to_blob(vec: np.ndarray) -> bytes:
    return np.asarray(vec, dtype=np.float32).tobytes()


def from_blob(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)


def top_k(query_vec: np.ndarray, candidates: list[tuple], k: int, threshold: float = 0.0):
    """candidates: list of (key, vector). Returns [(key, score), …] sorted desc."""
    scored = [(key, cosine(query_vec, vec)) for key, vec in candidates]
    scored = [(key, s) for key, s in scored if s >= threshold]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:k]
