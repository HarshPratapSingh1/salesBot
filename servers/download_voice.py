"""
Downloads the Piper TTS voice model
Run this once before starting tts_server.py
"""
from huggingface_hub import hf_hub_download
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "tts_models"
MODELS_DIR.mkdir(exist_ok=True)

VOICE = "en_US-lessac-medium"
REPO = "rhasspy/piper-voices"

print(f"Downloading voice model: {VOICE}")
print("This may take a minute...")

onnx_file = hf_hub_download(
    repo_id=REPO,
    filename=f"en/en_US/lessac/medium/en_US-lessac-medium.onnx",
    local_dir=str(MODELS_DIR)
)

config_file = hf_hub_download(
    repo_id=REPO,
    filename=f"en/en_US/lessac/medium/en_US-lessac-medium.onnx.json",
    local_dir=str(MODELS_DIR)
)

print(f"[OK] Voice model downloaded!")
print(f"     ONNX: {onnx_file}")
print(f"     Config: {config_file}")