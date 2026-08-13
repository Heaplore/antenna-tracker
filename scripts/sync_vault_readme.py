#!/usr/bin/env python3
"""同步 vault README 到项目 docs/ 目录，便于版本控制和查看"""
import shutil
from pathlib import Path

VAULT_README = Path(r"E:\我的知识库\我的知识库\资料库\天线技术\README.md")
DOCS_README = Path(__file__).parent.parent / "docs" / "vault-readme-sync.md"

if VAULT_README.exists():
    shutil.copy2(VAULT_README, DOCS_README)
    print(f"✅ 已同步: {VAULT_README} -> {DOCS_README}")
else:
    print(f"❌ Vault README 不存在: {VAULT_README}")
