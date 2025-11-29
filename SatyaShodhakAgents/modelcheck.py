import torch
from transformers import AutoModelForSequenceClassification

print(f"Torch version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")

try:
    model_name = "microsoft/deberta-v3-small"
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    print("SUCCESS: DeBERTa model loaded successfully!")
except Exception as e:
    print(f"ERROR: {e}")