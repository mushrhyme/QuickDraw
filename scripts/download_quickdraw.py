import os
import json
import requests
from tqdm import tqdm
from pathlib import Path

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
    
    카테고리는 shared/categories.json에서 자동으로 로드됩니다.
    """
    # ============================================================================
    # 설정: shared/categories.json에서 카테고리 로드
    # ============================================================================
    categories_json_path = Path(__file__).parent.parent / "shared" / "categories.json"
    if categories_json_path.exists():
        with open(categories_json_path, 'r', encoding='utf-8') as f:
            categories_data = json.load(f)
            categories = categories_data["categories"]
        print(f"✓ 카테고리 설정 파일에서 로드: {categories_json_path}")
    else:
        # 기본값 (파일이 없을 경우)
        categories = ["fan", "fire hydrant", "horse", "elephant", "donut"]
        print(f"⚠️  카테고리 설정 파일을 찾을 수 없어 기본값을 사용합니다.")
    
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

