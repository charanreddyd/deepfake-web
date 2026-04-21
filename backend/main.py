from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
from mtcnn import MTCNN
from PIL import Image
import cv2
import numpy as np
import tempfile
import os

app = FastAPI()

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model once at startup ──────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.resnet50(weights=None)
model.fc = nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load("best_model.pth", map_location=device))
model.eval()
model.to(device)

detector = MTCNN()

test_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

print(f"✅ Model loaded on {device}")

# ── Prediction logic ────────────────────────────────────────
def predict_video(video_path, num_frames=15):
    cap = cv2.VideoCapture(video_path)
    preds = []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(total_frames // num_frames, 1)
    frame_id, count = 0, 0

    while count < num_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_id)
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        if frame.shape[0] < 50 or frame.shape[1] < 50:
            frame_id += step
            continue
        try:
            faces = detector.detect_faces(frame)
        except:
            frame_id += step
            continue
        if len(faces) == 0:
            frame_id += step
            continue

        x, y, w, h = faces[0]['box']
        x, y = max(0, x), max(0, y)
        face = frame[y:y+h, x:x+w]
        if face.size == 0:
            frame_id += step
            continue

        img = Image.fromarray(cv2.cvtColor(face, cv2.COLOR_BGR2RGB))
        img = test_transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            out = model(img)
            probs = torch.softmax(out, dim=1)
            preds.append(probs.cpu().numpy()[0])

        frame_id += step
        count += 1

    cap.release()

    if not preds:
        return {"label": "UNKNOWN", "fake_pct": 0.0, "real_pct": 0.0, "frames_analyzed": 0}

    avg = np.mean(preds, axis=0)
    fake_pct = round(float(avg[0]) * 100, 1)
    real_pct = round(float(avg[1]) * 100, 1)
    label = "FAKE" if fake_pct >= 50 else "REAL"

    return {"label": label, "fake_pct": fake_pct, "real_pct": real_pct, "frames_analyzed": count}

# ── API endpoint ─────────────────────────────────────────────
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Save uploaded video to a temp file
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = predict_video(tmp_path)
    finally:
        os.remove(tmp_path)

    return result

@app.get("/")
def root():
    return {"status": "DeepFake Detector API is running!"}