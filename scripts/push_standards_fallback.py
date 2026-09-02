#!/usr/bin/env python3
"""
Standards monthly update - push via gh api (single-file PUT fallback)
Since push_via_gh.sh uses python3 (not available), use PUT /contents/ API directly.
"""
import base64
import json
import subprocess
import sys
import os

REPO = "Heaplore/antenna-tracker"
BRANCH = "main"
TODAY = "2026-09-01"
COMMIT_MSG = "chore(standards): monthly update 2026-09"

# Get gh token
result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
TOKEN = result.stdout.strip()
if not TOKEN:
    print("ERROR: gh auth token not available")
    sys.exit(1)
print(f"Token obtained: {TOKEN[:10]}...")

def api_request(method, path, body=None):
    import urllib.request
    url = f"https://api.github.com/repos/{REPO}/{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "antenna-tracker-cron")
    if body is not None:
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        req.add_header("Content-Type", "application/json")
        req.data = data
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except Exception as e:
        print(f"API ERROR {method} {path}: {e}")
        if hasattr(e, 'read'):
            print(f"  Response: {e.read().decode()[:500]}")
        return None

# Read local file content
local_path = os.path.join(r"E:\hermes\antenna-tracker", "app", "_data", "standards.json")
with open(local_path, "rb") as f:
    local_content = f.read()

# Get remote SHA
remote_data = api_request("GET", f"contents/app/_data/standards.json?ref={BRANCH}")
if remote_data and remote_data.get("sha"):
    remote_sha = remote_data["sha"]
    print(f"Remote SHA: {remote_sha}")
else:
    print("WARNING: Could not get remote SHA, using empty string")
    remote_sha = ""

# Build PUT body
body = {
    "message": COMMIT_MSG,
    "content": base64.b64encode(local_content).decode(),
    "encoding": "base64",
    "sha": remote_sha,
    "branch": BRANCH
}

# PUT to GitHub
result = api_request("PUT", "contents/app/_data/standards.json", body)
if result:
    print(f"✓ Pushed app/_data/standards.json -> SHA: {result.get('commit', {}).get('sha', 'N/A')}")
else:
    print("✗ Failed to push app/_data/standards.json")

# Also push public/data/standards.json
public_path = os.path.join(r"E:\hermes\antenna-tracker", "public", "data", "standards.json")
with open(public_path, "rb") as f:
    local_content_public = f.read()

remote_data_public = api_request("GET", f"contents/public/data/standards.json?ref={BRANCH}")
if remote_data_public and remote_data_public.get("sha"):
    remote_sha_public = remote_data_public["sha"]
else:
    remote_sha_public = ""

body_public = {
    "message": COMMIT_MSG,
    "content": base64.b64encode(local_content_public).decode(),
    "encoding": "base64",
    "sha": remote_sha_public,
    "branch": BRANCH
}

result_public = api_request("PUT", "contents/public/data/standards.json", body_public)
if result_public:
    print(f"✓ Pushed public/data/standards.json -> SHA: {result_public.get('commit', {}).get('sha', 'N/A')}")
else:
    print("✗ Failed to push public/data/standards.json")

# Push script file
script_path = os.path.join(r"E:\hermes\antenna-tracker", "scripts", "standards_monthly_update_2026-09.py")
with open(script_path, "rb") as f:
    local_content_script = f.read()

remote_data_script = api_request("GET", f"contents/scripts/standards_monthly_update_2026-09.py?ref={BRANCH}")
if remote_data_script and remote_data_script.get("sha"):
    remote_sha_script = remote_data_script["sha"]
else:
    remote_sha_script = ""

body_script = {
    "message": COMMIT_MSG,
    "content": base64.b64encode(local_content_script).decode(),
    "encoding": "base64",
    "sha": remote_sha_script,
    "branch": BRANCH
}

result_script = api_request("PUT", "contents/scripts/standards_monthly_update_2026-09.py", body_script)
if result_script:
    print(f"✓ Pushed scripts/standards_monthly_update_2026-09.py -> SHA: {result_script.get('commit', {}).get('sha', 'N/A')}")
else:
    print("✗ Failed to push scripts/standards_monthly_update_2026-09.py")

print("\n✓ All files pushed via REST API fallback")
print("Note: This method does NOT trigger push events automatically.")
print("Please run: gh workflow run deploy-pages.yml --repo Heaplore/antenna-tracker")
