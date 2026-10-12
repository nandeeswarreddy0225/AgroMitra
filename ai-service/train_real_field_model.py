import os
import sys
import random
import time
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import models, transforms
from PIL import Image

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.set_num_threads(8)

DATASET_DIR = r'D:\Agrimart\ai-service\datasets\canonical_real_dataset'
CHECKPOINT_SAVE_PATH = r'D:\Agrimart\ai-service\crop_disease_model.pth'
METADATA_SAVE_PATH = r'D:\Agrimart\backend\model_metadata.json'
ONNX_SAVE_PATH = r'D:\Agrimart\backend\crop_disease_model.onnx'

# 1. Discover all classes
all_classes = sorted([d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))])
num_joint = len(all_classes)
joint_to_idx = {c: i for i, c in enumerate(all_classes)}

def get_species(cls):
    if '___' in cls:
        crop = cls.split('___')[0]
        if crop == 'Pepper_bell': return 'Chilli'
        return crop
    return 'Unknown'

species_list = sorted(list(set(get_species(c) for c in all_classes)))
species_to_idx = {s: i for i, s in enumerate(species_list)}
num_species = len(species_list)

def get_condition(cls):
    lower = cls.lower()
    if 'healthy' in lower: return 'Healthy'
    if 'non_leaf' in lower or 'background' in lower: return 'Non_Foliar_Background'
    if 'unsupported' in lower: return 'Unsupported_OOD'
    if 'virus' in lower or 'greening' in lower or 'curl' in lower or 'mosaic' in lower: return 'Viral_Infection'
    if 'bacterial' in lower or 'canker' in lower: return 'Bacterial_Infection'
    if 'rust' in lower or 'mildew' in lower or 'mold' in lower or 'esca' in lower: return 'Rust_Mildew'
    if 'mite' in lower or 'pest' in lower: return 'Pest_Damage'
    return 'Fungal_Blight_Spot'

condition_list = sorted(list(set(get_condition(c) for c in all_classes)))
condition_to_idx = {c: i for i, c in enumerate(condition_list)}
num_conditions = len(condition_list)

print(f'Discovered {num_joint} Joint Classes across {num_species} Species and {num_conditions} Condition Categories.')

# 2. Collect samples (stratified sampling with cap of 250 per class to keep training fast and balanced)
all_samples = []
for cls in all_classes:
    c_dir = os.path.join(DATASET_DIR, cls)
    files = [f for f in os.listdir(c_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    random.shuffle(files)
    # Cap class at 250 images to prevent Rice/Cotton/Mango from overpowering other crops
    files = files[:250]
    j_idx = joint_to_idx[cls]
    s_idx = species_to_idx[get_species(cls)]
    c_idx = condition_to_idx[get_condition(cls)]
    for f in files:
        all_samples.append((os.path.join(c_dir, f), s_idx, c_idx, j_idx))

print(f'Total balanced photographic dataset: {len(all_samples)} samples.')

# 3. Train/Val/Test Split (70/15/15 stratified per class)
train_samples, val_samples, test_samples = [], [], []
for j_idx in range(num_joint):
    cls_samples = [s for s in all_samples if s[3] == j_idx]
    random.shuffle(cls_samples)
    n = len(cls_samples)
    n_train = max(1, int(n * 0.70))
    n_val = max(1, int(n * 0.15))
    train_samples.extend(cls_samples[:n_train])
    val_samples.extend(cls_samples[n_train:n_train + n_val])
    test_samples.extend(cls_samples[n_train + n_val:])

print(f'Dataset Split: Train = {len(train_samples)}, Val = {len(val_samples)}, Test = {len(test_samples)}')

# Save test split for independent out-of-training validation gate
test_records = [{'path': s[0], 'species': species_list[s[1]], 'condition': condition_list[s[2]], 'joint': all_classes[s[3]]} for s in test_samples]
with open(r'D:\Agrimart\ai-service\datasets\held_out_test_set.json', 'w') as f:
    json.dump(test_records, f, indent=2)

# 4. Augmentation for Real-World Field Robustness
train_transforms = transforms.Compose([
    transforms.Resize((240, 240)),
    transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(25),
    transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25, hue=0.04),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class PlantLeafDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform
    def __len__(self):
        return len(self.samples)
    def __getitem__(self, idx):
        path, s_idx, c_idx, j_idx = self.samples[idx]
        try:
            with Image.open(path) as img:
                img = img.convert('RGB')
                if self.transform: img = self.transform(img)
                return img, s_idx, c_idx, j_idx
        except Exception:
            return torch.zeros(3, 224, 224), s_idx, c_idx, j_idx

train_ds = PlantLeafDataset(train_samples, train_transforms)
val_ds = PlantLeafDataset(val_samples, val_transforms)
test_ds = PlantLeafDataset(test_samples, val_transforms)

train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0)
val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=0)
test_loader = DataLoader(test_ds, batch_size=32, shuffle=False, num_workers=0)

# 5. Model Architecture: Pretrained MobileNetV3-Small with Multi-Task Heads
class MultiTaskPlantNet(nn.Module):
    def __init__(self, n_s, n_c, n_j):
        super().__init__()
        base = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        self.features = base.features
        self.avgpool = base.avgpool
        in_dim = 576
        self.species_head = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(256, n_s)
        )
        self.condition_head = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(256, n_c)
        )
        self.joint_head = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.Hardswish(),
            nn.Dropout(p=0.25),
            nn.Linear(512, n_j)
        )
    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        feat = torch.flatten(x, 1)
        return self.species_head(feat), self.condition_head(feat), self.joint_head(feat)

model = MultiTaskPlantNet(num_species, num_conditions, num_joint)
device = torch.device('cpu')
model.to(device)

# Loss functions & Optimizer with differential learning rates
criterion_species = nn.CrossEntropyLoss(label_smoothing=0.05)
criterion_condition = nn.CrossEntropyLoss(label_smoothing=0.05)
criterion_joint = nn.CrossEntropyLoss(label_smoothing=0.05)

optimizer = optim.AdamW([
    {'params': model.features.parameters(), 'lr': 1e-4},
    {'params': model.species_head.parameters(), 'lr': 1e-3},
    {'params': model.condition_head.parameters(), 'lr': 1e-3},
    {'params': model.joint_head.parameters(), 'lr': 1e-3}
], weight_decay=1e-4)

scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=8, eta_min=1e-5)

print('=' * 80)
print('STARTING REAL-WORLD MODEL TRAINING WITH TRANSFER LEARNING')
print('=' * 80)

best_val_score = 0.0
best_state = None

epochs = 8
for epoch in range(1, epochs + 1):
    model.train()
    t0 = time.time()
    total_loss = 0.0
    correct_s, correct_c, correct_j, total_n = 0, 0, 0, 0
    
    for imgs, s_targets, c_targets, j_targets in train_loader:
        optimizer.zero_grad()
        out_s, out_c, out_j = model(imgs)
        
        loss_s = criterion_species(out_s, s_targets)
        loss_c = criterion_condition(out_c, c_targets)
        loss_j = criterion_joint(out_j, j_targets)
        
        loss = 0.8 * loss_s + 0.6 * loss_c + 1.2 * loss_j
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item() * imgs.size(0)
        correct_s += (out_s.argmax(1) == s_targets).sum().item()
        correct_c += (out_c.argmax(1) == c_targets).sum().item()
        correct_j += (out_j.argmax(1) == j_targets).sum().item()
        total_n += imgs.size(0)
        
    scheduler.step()
    
    train_s_acc = correct_s / total_n * 100
    train_c_acc = correct_c / total_n * 100
    train_j_acc = correct_j / total_n * 100
    
    # Validation
    model.eval()
    val_correct_s, val_correct_c, val_correct_j, val_total = 0, 0, 0, 0
    with torch.no_grad():
        for imgs, s_targets, c_targets, j_targets in val_loader:
            out_s, out_c, out_j = model(imgs)
            val_correct_s += (out_s.argmax(1) == s_targets).sum().item()
            val_correct_c += (out_c.argmax(1) == c_targets).sum().item()
            val_correct_j += (out_j.argmax(1) == j_targets).sum().item()
            val_total += imgs.size(0)
            
    val_s_acc = val_correct_s / val_total * 100
    val_c_acc = val_correct_c / val_total * 100
    val_j_acc = val_correct_j / val_total * 100
    val_score = 0.5 * val_s_acc + 0.5 * val_j_acc
    
    elapsed = time.time() - t0
    print(f'Epoch [{epoch}/{epochs}] ({elapsed:.1f}s) | Train Loss: {total_loss/total_n:.3f} | Train Joint: {train_j_acc:.1f}% | Val Species: {val_s_acc:.1f}% | Val Joint: {val_j_acc:.1f}%')
    
    if val_score > best_val_score:
        best_val_score = val_score
        best_state = {
            'model_state': model.state_dict(),
            'model_type': 'MultiTaskPlantNet',
            'classes': all_classes,
            'class_to_idx': joint_to_idx,
            'num_classes': num_joint,
            'species_list': species_list,
            'species_to_idx': species_to_idx,
            'condition_list': condition_list,
            'condition_to_idx': condition_to_idx,
            'backbone': 'mobilenet_v3_small_pretrained',
            'val_score': round(val_score, 2),
            'epoch': epoch
        }

print('\nTraining complete! Evaluating on held-out test set...')
model.load_state_dict(best_state['model_state'])
model.eval()

test_correct_s, test_correct_c, test_correct_j, test_total = 0, 0, 0, 0
per_species_stats = {s: {'correct': 0, 'total': 0} for s in species_list}

with torch.no_grad():
    for imgs, s_targets, c_targets, j_targets in test_loader:
        out_s, out_c, out_j = model(imgs)
        pred_s = out_s.argmax(1)
        pred_c = out_c.argmax(1)
        pred_j = out_j.argmax(1)
        
        test_correct_s += (pred_s == s_targets).sum().item()
        test_correct_c += (pred_c == c_targets).sum().item()
        test_correct_j += (pred_j == j_targets).sum().item()
        test_total += imgs.size(0)
        
        for i in range(len(s_targets)):
            true_s = species_list[s_targets[i]]
            per_species_stats[true_s]['total'] += 1
            if pred_s[i] == s_targets[i]:
                per_species_stats[true_s]['correct'] += 1

test_s_acc = test_correct_s / test_total * 100
test_c_acc = test_correct_c / test_total * 100
test_j_acc = test_correct_j / test_total * 100

best_state['test_species_acc'] = round(test_s_acc, 2)
best_state['test_condition_acc'] = round(test_c_acc, 2)
best_state['test_joint_acc'] = round(test_j_acc, 2)
best_state['held_out_test_total'] = test_total

torch.save(best_state, CHECKPOINT_SAVE_PATH)
print(f'Successfully saved real-world model checkpoint to {CHECKPOINT_SAVE_PATH}')

# Export ONNX for Node.js engine
dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, ONNX_SAVE_PATH,
    input_names=['image'],
    output_names=['species_logits', 'condition_logits', 'joint_logits'],
    dynamic_axes={'image': {0: 'batch_size'}},
    opset_version=14
)
print(f'Successfully exported ONNX model to {ONNX_SAVE_PATH}')

# Save metadata json for backend
metadata = {
    'model_type': 'MultiTaskPlantNet',
    'backbone': 'mobilenet_v3_small_pretrained_imagenet',
    'classes': all_classes,
    'species_list': species_list,
    'condition_list': condition_list,
    'input_size': [3, 224, 224],
    'mean': [0.485, 0.456, 0.406],
    'std': [0.229, 0.224, 0.225],
    'test_species_acc': round(test_s_acc, 2),
    'test_joint_acc': round(test_j_acc, 2),
    'num_classes': num_joint
}
with open(METADATA_SAVE_PATH, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f'Saved metadata to {METADATA_SAVE_PATH}')

print('\n' + '=' * 80)
print('FINAL HELD-OUT VALIDATION RESULTS:')
print(f'Overall Species Identification Accuracy : {test_s_acc:.2f}%')
print(f'Overall Health/Condition Accuracy       : {test_c_acc:.2f}%')
print(f'Overall Joint Pathology Accuracy         : {test_j_acc:.2f}%')
print('=' * 80)
print('PER-CROP SPECIES RECALL (UNSEEN HELD-OUT TEST DATA):')
for s, st in sorted(per_species_stats.items()):
    tot = st['total']
    if tot > 0:
        acc = st['correct'] / tot * 100
        corr = st['correct']
        print(f'  {s:<20}: {acc:5.1f}% ({corr}/{tot} correct)')
