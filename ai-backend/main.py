from fastapi import FastAPI
from pydantic import BaseModel
import requests

from ai_engine import CodeAI

app = FastAPI()
ai = CodeAI()

class Query(BaseModel):
    message: str

def ask_local_ai(prompt):
    res = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "mistral",
            "prompt": prompt,
            "stream": False
        }
    )
    return res.json()["response"]

@app.post("/chat")
def chat(q: Query):
    context_chunks = ai.search(q.message)
    context = "\n\n".join(context_chunks)

    prompt = f"""
You are an expert AI assistant for a web app called "Seasons Serials".

You understand:
- frontend JavaScript
- HTML structure
- UI behavior
- bugs and logic

User question:
{q.message}

Relevant code:
{context}

Instructions:
- Understand what the user wants
- Detect their intent automatically
- Explain clearly
- Suggest fixes if needed
- Be precise and helpful
"""

    reply = ask_local_ai(prompt)

    return {"reply": reply}
