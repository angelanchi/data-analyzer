#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文檔批量更新腳本 - 安全處理UTF-8編碼
"""
import os
import re

# 定義替換規則
REPLACEMENTS = [
    # 詞彙替換
    ('展平資料', '逐筆資料'),
    ('展平數據', '逐筆數據'),
    ('展平檢視', '逐筆資料檢視'),
    ('展平', '逐筆'),
    ('Flattened View', '逐筆資料檢視'),

    # 步驟名稱（在描述中）
    ('選擇圖表', '數據格式設置'),  # 僅在特定上下文中
    ('預覽圖表', '圖表配置與預覽'),  # 僅在特定上下文中

    # 匯出選項
    (r"'raw'", "'original'"),
    (r'"raw"', '"original"'),
    ('原始資料（', '原始數據（上傳後未清理，'),
    ('清理後資料', '清理後數據'),
    (r"'flattened'", "'detailed'"),
    (r'"flattened"', '"detailed"'),
    (r"'hierarchical'", "# REMOVED - hierarchical"),
]

def update_file(filepath):
    """Update a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply all replacements
        for old, new in REPLACEMENTS:
            if old.startswith('r"') or old.startswith("r'"):
                # Regex replacement
                content = re.sub(old[2:-1], new, content)
            else:
                # Simple string replacement
                content = content.replace(old, new)

        # Write back if changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] Updated: {os.path.basename(filepath)}")
            return True
        else:
            print(f"[--] No change: {os.path.basename(filepath)}")
            return False
    except Exception as e:
        print(f"[ERROR] {os.path.basename(filepath)}: {str(e)}")
        return False

def main():
    """Main function"""
    docs_dir = os.path.join(os.path.dirname(__file__), 'docs')

    if not os.path.exists(docs_dir):
        print(f"Error: docs directory not found at {docs_dir}")
        return

    print("Starting documentation update...")
    print(f"Docs dir: {docs_dir}\n")

    updated_count = 0
    total_count = 0

    # Process all .md files in docs directory
    for filename in os.listdir(docs_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(docs_dir, filename)
            total_count += 1
            if update_file(filepath):
                updated_count += 1

    # Also update README.md
    readme_path = os.path.join(os.path.dirname(__file__), 'README.md')
    if os.path.exists(readme_path):
        total_count += 1
        if update_file(readme_path):
            updated_count += 1

    print(f"\nDone! Processed {total_count} files, updated {updated_count} files.")

if __name__ == '__main__':
    main()
