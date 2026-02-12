#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
HOST = '0.0.0.0'
PORT = 5000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)


if __name__ == '__main__':
    # Optional multiplayer protocol stub (disabled):
    # join:{room,playerId} state:{pos,action,timestamp} event:{coinCollected,obstacleHit}
    # Replace with websockets/socket.io server when enabling network play.
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'Serving {PUBLIC} at http://localhost:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server.')
    finally:
        server.server_close()
