import os
import urllib.request

request = urllib.request.Request("http://127.0.0.1:8000/api/health")
if os.getenv("KRONOS_API_TOKEN"):
    request.add_header("Authorization", "Bearer " + os.environ["KRONOS_API_TOKEN"])
with urllib.request.urlopen(request, timeout=5) as response:
    if response.status != 200:
        raise SystemExit(1)
