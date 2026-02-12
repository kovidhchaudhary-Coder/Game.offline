#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

if __name__ == '__main__':
    # Optional multiplayer protocol stub (disabled):
    # join:{room,playerId} state:{pos,action,timestamp} event:{coinCollected,obstacleHit}
    # Replace with websockets/socket.io server when enabling network play.
    os.chdir(ROOT)
    ThreadingHTTPServer(('0.0.0.0', 5000), Handler).serve_forever()
