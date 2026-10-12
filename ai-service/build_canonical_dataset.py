import os
import shutil
from PIL import Image

TARGET_DATASET = r'D:\Agrimart\ai-service\datasets\canonical_real_dataset'
PLANTDOC_DIR = r'D:\Agrimart\ai-service\datasets\PlantDoc'
SCRATCH_DATASET = r'C:\Users\nande\.gemini\antigravity\brain\d49d2dbc-29b5-4e70-89fc-d2b6b7123ce9\scratch\real_dataset'
SCRATCH_REPOS = r'C:\Users\nande\.gemini\antigravity\brain\d49d2dbc-29b5-4e70-89fc-d2b6b7123ce9\scratch\repos'

os.makedirs(TARGET_DATASET, exist_ok=True)

# 1. PlantDoc mapping
plantdoc_map = {
    'Apple leaf': 'Apple___healthy',
    'Apple rust leaf': 'Apple___Black_rot',
    'Apple Scab Leaf': 'Apple___Apple_scab',
    'Bell_pepper leaf': 'Chilli___healthy',
    'Bell_pepper leaf spot': 'Chilli___Bacterial_spot',
    'Blueberry leaf': 'Blueberry___healthy',
    'Cherry leaf': 'Cherry___healthy',
    'Corn Gray leaf spot': 'Corn___Northern_Leaf_Blight',
    'Corn leaf blight': 'Corn___Northern_Leaf_Blight',
    'Corn rust leaf': 'Corn___Common_rust',
    'grape leaf': 'Grape___healthy',
    'grape leaf black rot': 'Grape___Black_rot',
    'Peach leaf': 'Peach___healthy',
    'Potato leaf early blight': 'Potato___Early_blight',
    'Potato leaf late blight': 'Potato___Late_blight',
    'Raspberry leaf': 'Raspberry___healthy',
    'Soyabean leaf': 'Soybean___healthy',
    'Strawberry leaf': 'Strawberry___healthy',
    'Tomato Early blight leaf': 'Tomato___Early_blight',
    'Tomato leaf': 'Tomato___healthy',
    'Tomato leaf bacterial spot': 'Tomato___Bacterial_spot',
    'Tomato leaf late blight': 'Tomato___Late_blight',
    'Tomato leaf mosaic virus': 'Tomato___Mosaic_virus',
    'Tomato leaf yellow virus': 'Tomato___Yellow_Leaf_Curl_Virus',
    'Tomato mold leaf': 'Tomato___Leaf_Mold',
    'Tomato Septoria leaf spot': 'Tomato___Septoria_leaf_spot',
    'Tomato two spotted spider mites leaf': 'Tomato___Spider_mites',
}

def verify_and_copy(src_file, dst_folder, prefix):
    try:
        with Image.open(src_file) as img:
            img.verify()
        os.makedirs(dst_folder, exist_ok=True)
        fname = prefix + '_' + os.path.basename(src_file)
        dst_path = os.path.join(dst_folder, fname)
        if not os.path.exists(dst_path):
            shutil.copy2(src_file, dst_path)
        return True
    except Exception:
        return False

total_copied = 0

# Copy PlantDoc train & test
for split in ['train', 'test']:
    sdir = os.path.join(PLANTDOC_DIR, split)
    if not os.path.exists(sdir): continue
    for folder_name, target_class in plantdoc_map.items():
        src_folder = os.path.join(sdir, folder_name)
        if not os.path.exists(src_folder): continue
        dst_class_folder = os.path.join(TARGET_DATASET, target_class)
        for f in os.listdir(src_folder):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                if verify_and_copy(os.path.join(src_folder, f), dst_class_folder, f'plantdoc_{split}'):
                    total_copied += 1

print(f'Ingested {total_copied} in-the-wild field images from PlantDoc!')

# Copy scratch real_dataset (which has PlantVillage + Rice + Cotton + Mango + Background)
scratch_count = 0
for cls in os.listdir(SCRATCH_DATASET):
    cp = os.path.join(SCRATCH_DATASET, cls)
    if not os.path.isdir(cp): continue
    dst_folder = os.path.join(TARGET_DATASET, cls)
    for f in os.listdir(cp):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            if verify_and_copy(os.path.join(cp, f), dst_folder, 'base'):
                scratch_count += 1

print(f'Ingested {scratch_count} base images from scratch dataset!')

# Ingest Indian Rice repo
rice_count = 0
rice_path = os.path.join(SCRATCH_REPOS, 'rice_data')
if os.path.exists(rice_path):
    for root, dirs, files in os.walk(rice_path):
        rlower = root.lower()
        tclass = None
        if 'brown' in rlower or 'spot' in rlower:
            tclass = 'Rice___Brown_Spot'
        elif 'bacterial' in rlower or 'blight' in rlower:
            tclass = 'Rice___Bacterial_Blight'
        elif 'healthy' in rlower:
            tclass = 'Rice___healthy'
        if tclass:
            df = os.path.join(TARGET_DATASET, tclass)
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                    if verify_and_copy(os.path.join(root, f), df, 'rice_repo'):
                        rice_count += 1
print(f'Ingested {rice_count} field images from Rice repositories!')

# Ingest Indian Cotton repo
cotton_count = 0
for cdir in ['cotton_data', 'cotton_diya']:
    cp = os.path.join(SCRATCH_REPOS, cdir)
    if os.path.exists(cp):
        for root, dirs, files in os.walk(cp):
            rlower = root.lower()
            tclass = None
            if 'blight' in rlower or 'bacterial' in rlower or 'diseased' in rlower:
                tclass = 'Cotton___Bacterial_Blight'
            elif 'healthy' in rlower or 'fresh' in rlower:
                tclass = 'Cotton___healthy'
            if tclass:
                df = os.path.join(TARGET_DATASET, tclass)
                for f in files:
                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                        if verify_and_copy(os.path.join(root, f), df, 'cotton_repo'):
                            cotton_count += 1
print(f'Ingested {cotton_count} field images from Cotton repositories!')

# Ingest Indian Mango repo
mango_count = 0
for mdir in ['mango_data', 'mango_kids', 'mango_pypi']:
    mp = os.path.join(SCRATCH_REPOS, mdir)
    if os.path.exists(mp):
        for root, dirs, files in os.walk(mp):
            rlower = root.lower()
            tclass = None
            if 'anthracnose' in rlower or 'diseased' in rlower:
                tclass = 'Mango___Anthracnose'
            elif 'healthy' in rlower or 'normal' in rlower:
                tclass = 'Mango___healthy'
            if tclass:
                df = os.path.join(TARGET_DATASET, tclass)
                for f in files:
                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                        if verify_and_copy(os.path.join(root, f), df, 'mango_repo'):
                            mango_count += 1
print(f'Ingested {mango_count} field images from Mango repositories!')

# Total classes and image summary
all_classes = sorted([d for d in os.listdir(TARGET_DATASET) if os.path.isdir(os.path.join(TARGET_DATASET, d))])
print(f'\nTotal canonical classes ready: {len(all_classes)}')
tot_images = sum(len(os.listdir(os.path.join(TARGET_DATASET, c))) for c in all_classes)
print(f'Total photographic leaf images in canonical dataset: {tot_images}')
for c in all_classes:
    cnt = len(os.listdir(os.path.join(TARGET_DATASET, c)))
    print(f'  {c:<40}: {cnt} images')
