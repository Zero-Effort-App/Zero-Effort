from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import uuid
import os

app = Flask(__name__)
CORS(app)

yolo_model = None

def get_yolo():
    global yolo_model
    if yolo_model is None:
        from ultralytics import YOLO
        yolo_model = YOLO('yolov8n.pt')
    return yolo_model

def check_white_background(image, threshold=0.90):
    try:
        from rembg import remove
        output_with_alpha = remove(image)
        background_mask = output_with_alpha[:, :, 3] < 10
        original_background = image[background_mask]
        if original_background.size == 0:
            return False, "Could not determine the background of the image."
        white_pixels = np.sum(np.all(original_background > 235, axis=1))
        white_ratio = white_pixels / len(original_background)
        is_valid = white_ratio >= threshold
        message = "Background is valid." if is_valid else "Background must be plain white."
        return is_valid, message
    except Exception as e:
        return False, f"Error checking background: {e}"

def detect_forbidden_objects(image_path, conf_threshold=0.25):
    try:
        model = get_yolo()
        results = model(image_path, verbose=False, conf=conf_threshold)
        forbidden_classes = ['cell phone', 'headphone']
        detected = [model.names[int(box.cls)] for r in results for box in r.boxes
                    if model.names[int(box.cls)] in forbidden_classes]
        is_valid = len(detected) == 0
        message = f"Forbidden object(s) found: {', '.join(set(detected))}." if not is_valid else "No forbidden objects detected."
        return is_valid, message
    except Exception as e:
        return False, f"Error detecting objects: {e}"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/validate-photo', methods=['POST'])
def validate_photo():
    if 'photo' not in request.files:
        return res.status(400).json({"valid": False, "error": "No photo uploaded"})
    file = request.files['photo']
    if file.filename == '':
        return jsonify({"valid": False, "error": "Empty filename"}), 400
    temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    file.save(temp_path)
    try:
        image = cv2.imread(temp_path)
        if image is None:
            return jsonify({"valid": False, "error": "Could not read image file"}), 400
        errors = []
        is_valid_bg, bg_msg = check_white_background(image)
        if not is_valid_bg:
            errors.append(bg_msg)
        is_valid_obj, obj_msg = detect_forbidden_objects(temp_path)
        if not is_valid_obj:
            errors.append(obj_msg)
        if errors:
            return jsonify({"valid": False, "errors": errors})
        else:
            return jsonify({"valid": True, "message": "Photo passed all validation checks."})
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
