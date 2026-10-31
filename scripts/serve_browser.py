"""Serve the static browser artifact on loopback with portable module MIME types."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".mjs": "text/javascript", ".js": "text/javascript",
                      ".wasm": "application/wasm", ".onnx": "application/octet-stream"}

    def __init__(self, *args, base_path="/", **kwargs):
        self.base_path = base_path
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if not urlsplit(self.path).path.startswith(self.base_path):
            self.send_error(404)
            return
        self.path = self.path[len(self.base_path)-1:]
        super().do_GET()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--directory", type=Path, help="Static artifact to serve (default: dist)")
    parser.add_argument("--base-path", default="/", help="Repository-style prefix, e.g. /stock-predictor/")
    args = parser.parse_args()
    root = args.directory or Path(__file__).resolve().parents[1] / "dist"
    prefix = '/' + args.base_path.strip('/') + '/' if args.base_path.strip('/') else '/'
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(root), base_path=prefix))
    print(f"Static site: http://127.0.0.1:{args.port}{prefix}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
