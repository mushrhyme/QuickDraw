import os
import requests
from tqdm import tqdm

def download_file(url, filepath):
    """Download a file from URL with progress bar."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filepath, 'wb') as f, tqdm(
        desc=os.path.basename(filepath),
        total=total_size,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as pbar:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                pbar.update(len(chunk))

def main():
    """
    QuickDraw 데이터셋 다운로드
    
    클래스 수를 늘리려면 아래 CATEGORIES 리스트를 수정하세요.
    train.py의 CATEGORIES와 동일하게 맞춰주세요.
    """
    # ============================================================================
    # 설정: train.py의 CATEGORIES와 동일하게 맞춰주세요
    # ============================================================================
    categories = ["cat", "dog", "airplane", "car", "bird"]
    # 클래스 추가 예시:
    # categories = ["cat", "dog", "airplane", "car", "bird", "house", "tree", "sun", "moon", "star"]
    
    # Create data/raw directory
    output_dir = "data/raw"
    os.makedirs(output_dir, exist_ok=True)
    print(f"Created directory: {output_dir}")
    print(f"다운로드할 클래스 수: {len(categories)}")
    print(f"클래스 목록: {', '.join(categories)}")
    print("-"*70)
    
    # Base URL for QuickDraw dataset
    base_url = "https://storage.googleapis.com/quickdraw_dataset/full/simplified"
    
    # Download each category
    success_count = 0
    for idx, category in enumerate(categories, 1):
        url = f"{base_url}/{category}.ndjson"
        filepath = os.path.join(output_dir, f"{category}.ndjson")
        
        print(f"\n[{idx}/{len(categories)}] Downloading {category}...")
        try:
            download_file(url, filepath)
            print(f"✓ Successfully downloaded {category}.ndjson")
            success_count += 1
        except requests.exceptions.RequestException as e:
            print(f"✗ Error downloading {category}: {e}")
    
    print("\n" + "="*70)
    print(f"Download complete! ({success_count}/{len(categories)} 성공)")
    print(f"Files saved to {output_dir}/")
    print("="*70)

if __name__ == "__main__":
    main()

