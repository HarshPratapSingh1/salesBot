"""
SalesBot — Text-to-Speech Server (Piper TTS)
Runs on CPU. No GPU required.

Usage:
    python tts_server.py

Endpoint: POST /v1/audio/speech
Port: 8000
"""

import io
import os
import wave
import json
import re
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from piper import PiperVoice
import uvicorn

MODELS_DIR = Path(__file__).parent / "tts_models"
MODELS_DIR.mkdir(exist_ok=True)

DEFAULT_VOICE = os.environ.get("PIPER_VOICE", "en_US-lessac-medium")

piper_voice = None


def find_onnx_model(voice_name: str):
    for onnx_path in MODELS_DIR.rglob("*.onnx"):
        if voice_name.replace("-", "_") in str(onnx_path) or voice_name in str(onnx_path):
            config_path = Path(str(onnx_path) + ".json")
            if config_path.exists():
                return str(onnx_path), str(config_path)
    return None, None


class SpeechRequest(BaseModel):
    model: str = "piper"
    input: str
    voice: str = "default"
    speed: float = 1.0
    response_format: str = "wav"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global piper_voice
    print(f"  Loading Piper voice: {DEFAULT_VOICE}...")
    onnx_path, config_path = find_onnx_model(DEFAULT_VOICE)

    if onnx_path is None:
        print(f"  [ERROR] Voice model not found!")
        print(f"  Run: python download_voice.py")
        raise FileNotFoundError(f"Voice model '{DEFAULT_VOICE}' not found in {MODELS_DIR}")

    print(f"  Model: {onnx_path}")
    piper_voice = PiperVoice.load(onnx_path, config_path=config_path)
    print(f"  [OK] Piper voice loaded and ready!")
    yield


app = FastAPI(title="SalesBot TTS Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001f926-\U0001f937"
    "\U00010000-\U0010ffff"
    "\u2640-\u2642"
    "\u2600-\u2B55"
    "\u200d"
    "\ufe0f"
    "]+",
    flags=re.UNICODE,
)


def clean_text(text: str) -> str:
    cleaned = EMOJI_PATTERN.sub(" ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


@app.get("/health")
async def health():
    return {"status": "ok", "voice": DEFAULT_VOICE, "engine": "piper"}


@app.post("/v1/audio/speech")
async def synthesize(request: SpeechRequest):
    global piper_voice
    text = clean_text(request.input)
    if not text or not text.strip():
        return Response(content=b"", media_type="audio/wav")

    try:
        audio_buffer = io.BytesIO()
        with wave.open(audio_buffer, "wb") as wav_file:
            piper_voice.synthesize_wav(text, wav_file)
        audio_data = audio_buffer.getvalue()
        return Response(content=audio_data, media_type="audio/wav")
    except Exception as e:
        print(f"  TTS Error: {e}")
        return Response(
            content=json.dumps({"error": "TTS synthesis failed", "details": str(e)}),
            media_type="application/json",
            status_code=500,
        )


if __name__ == "__main__":
    print("\n--- SalesBot TTS Server starting on http://localhost:8000 ---")
    print(f"   Voice: {DEFAULT_VOICE}")
    print(f"   Engine: Piper TTS (CPU)")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000)