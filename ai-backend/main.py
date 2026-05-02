from fastapi import FastAPI
from pydantic import BaseModel
import requests
import os

app = FastAPI()

class Msg(BaseModel):
    message: str

# 🔥 FREE AI (OpenRouter)
API_KEY = os.getenv("OPENROUTER_API_KEY")

@app.post("/chat")
async def chat(msg: Msg):
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "mistralai/mistral-7b-instruct",
                "messages": [
                    {"role": "user", "content": msg.message}
                ]
            }
        )

        data = response.json()
        reply = data["choices"][0]["message"]["content"]

        return {"reply": reply}

    except Exception as e:
        return {"reply": f"Error: {str(e)}"}
