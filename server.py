#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

PORT = 5000
ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"

if not PUBLIC_DIR.is_dir():
    raise SystemExit("Missing ./public directory")

os.chdir(PUBLIC_DIR)
handler = SimpleHTTPRequestHandler
server = ThreadingHTTPServer(("0.0.0.0", PORT), handler)
print(f"Serving {PUBLIC_DIR} at http://localhost:{PORT}")
server.serve_forever()
