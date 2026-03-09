#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from socketserver import ThreadingMixIn
from urllib.parse import unquote
import socketserver

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
STATE_FILE = ROOT / 'game_state.json'
HOST = '0.0.0.0'
PORT_ENV = 'KOVIDHE_PORT'
DEFAULT_PORT = 5000

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8'
}

ROUTES = {
    '/': PUBLIC / 'index.html',
    '/index.html': PUBLIC / 'index.html',
    '/js/app.js': PUBLIC / 'js' / 'app.js',
    '/css/styles.css': PUBLIC / 'css' / 'styles.css'
}


def resolve_port() -> int:
    raw = os.getenv(PORT_ENV, str(DEFAULT_PORT)).strip()
    try:
        port = int(raw)
    except ValueError:
        print(f"Invalid {PORT_ENV}='{raw}'. Falling back to {DEFAULT_PORT}.")
        return DEFAULT_PORT
    if not (1 <= port <= 65535):
        print(f"Out-of-range {PORT_ENV}='{raw}'. Falling back to {DEFAULT_PORT}.")
        return DEFAULT_PORT
    return port


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _resolve_file(self, path: str) -> Path | None:
        decoded = unquote(path.split('?', 1)[0])
        if decoded in ROUTES:
            return ROUTES[decoded]
        candidate = (PUBLIC / decoded.lstrip('/')).resolve()
        try:
            candidate.relative_to(PUBLIC)
        except ValueError:
            return None
        if candidate.is_dir():
            candidate = candidate / 'index.html'
        return candidate

    def do_GET(self) -> None:  # noqa: N802
        file_path = self._resolve_file(self.path)
        if not file_path or not file_path.exists() or not file_path.is_file():
            self.send_error(404, 'File not found')
            return

        data = file_path.read_bytes()
        content_type = MIME_TYPES.get(file_path.suffix.lower(), 'application/octet-stream')
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != '/save':
            self._send_json(404, {'ok': False, 'error': 'Unknown route'})
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self._send_json(400, {'ok': False, 'error': 'Invalid Content-Length'})
            return

        raw = self.rfile.read(max(length, 0))
        try:
            payload = json.loads(raw.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            self._send_json(400, {'ok': False, 'error': 'Invalid JSON'})
            return

        if not isinstance(payload, dict):
            self._send_json(400, {'ok': False, 'error': 'JSON object required'})
            return

        STATE_FILE.write_text(json.dumps(payload, indent=2), encoding='utf-8')
        self._send_json(200, {'ok': True, 'saved_to': STATE_FILE.name})


class ThreadingTCPServer(ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    port = resolve_port()
    with ThreadingTCPServer((HOST, port), Handler) as server:
        print(f'Serving {PUBLIC} at http://localhost:{port} ({PORT_ENV})')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nShutting down server.')
