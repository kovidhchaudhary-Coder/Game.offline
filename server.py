#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
HOST = '0.0.0.0'
PORT_ENV = 'KOVIDHE_PORT'
DEFAULT_PORT = 5000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


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


if __name__ == '__main__':
    # Optional multiplayer protocol stub (disabled):
    # join:{room,playerId} state:{pos,action,timestamp} event:{coinCollected,obstacleHit}
    # Replace with websockets/socket.io server when enabling network play.
    os.chdir(ROOT)

    port = resolve_port()
    server = ReusableThreadingHTTPServer((HOST, port), Handler)
    print(f'Serving {PUBLIC} at http://localhost:{port} ({PORT_ENV})')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server.')
    finally:
        server.server_close()
