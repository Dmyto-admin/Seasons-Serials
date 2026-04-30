from sentence_transformers import SentenceTransformer
import numpy as np
from loader import load_files, split_text

class CodeAI:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        documents = load_files()
        self.chunks = []

        for doc in documents:
            self.chunks += split_text(doc)

        print(f"Loaded {len(self.chunks)} chunks")

        self.embeddings = self.model.encode(self.chunks, normalize_embeddings=True)

    def search(self, query, top_k=6):
        q = self.model.encode(query, normalize_embeddings=True)
        scores = np.dot(self.embeddings, q)

        idx = np.argsort(scores)[::-1][:top_k]

        return [self.chunks[i] for i in idx]
