"""
NOVA AI Agent — Speech-to-Text Server (Faster-Whisper)
Runs on CPU with INT8 quantization. No GPU required.

Usage:
    python stt_server.py

Endpoint: POST /v1/audio/transcriptions
Port: 8787
"""

import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI(title="SalesBot STT Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
print(f"Loading Whisper model: {MODEL_SIZE} (CPU, INT8)...")
whisper_model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print(f"[OK] Whisper model '{MODEL_SIZE}' loaded successfully!")


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": "cpu"}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form("base"),
    language: str = Form("en"),
    response_format: str = Form("json"),
):
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        segments, info = whisper_model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join([seg.text.strip() for seg in segments])
        return {
            "text": text,
            "language": info.language,
            "duration": info.duration,
        }
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("\n--- SalesBot STT Server starting on http://localhost:8787 ---")
    print("    Model: " + MODEL_SIZE)
    print("    Device: CPU (INT8)")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8787)