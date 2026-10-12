import os
import sys
import urllib.request
import zipfile

ZIP_URL = 'https://github.com/pratikkayal/PlantDoc-Dataset/archive/refs/heads/master.zip'
TARGET_DIR = r'D:\Agrimart\ai-service\datasets'
ZIP_PATH = os.path.join(TARGET_DIR, 'plantdoc_master.zip')
EXTRACT_DIR = os.path.join(TARGET_DIR, 'PlantDoc')

os.makedirs(TARGET_DIR, exist_ok=True)
print(f'Starting download from {ZIP_URL}...')

def reporthook(blocknum, blocksize, totalsize):
    readsofar = blocknum * blocksize
    if totalsize > 0:
        percent = readsofar * 1e2 / totalsize
        s = f'\rDownloading PlantDoc: {readsofar / (1024*1024):.1f} MB / {totalsize / (1024*1024):.1f} MB ({percent:.1f}%)'
    else:
        s = f'\rDownloading PlantDoc: {readsofar / (1024*1024):.1f} MB'
    sys.stdout.write(s)
    sys.stdout.flush()

try:
    urllib.request.urlretrieve(ZIP_URL, ZIP_PATH, reporthook)
    print('\nDownload complete! Unzipping...')
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(TARGET_DIR)
    extracted_name = os.path.join(TARGET_DIR, 'PlantDoc-Dataset-master')
    if os.path.exists(extracted_name):
        if os.path.exists(EXTRACT_DIR):
            import shutil
            shutil.rmtree(EXTRACT_DIR)
        os.rename(extracted_name, EXTRACT_DIR)
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)
    print(f'Successfully unpacked PlantDoc into {EXTRACT_DIR}')
except Exception as e:
    print(f'\nDownload/Extraction failed: {e}')
    sys.exit(1)
