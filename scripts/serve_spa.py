#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
from urllib.parse import unquote


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0]
        path = path.split("#", 1)[0]
        path = unquote(path)
        path = path.lstrip("/")
        candidate = os.path.join(self.directory, path)
        return candidate

    def do_GET(self):
        resolved = self.translate_path(self.path)
        if os.path.isfile(resolved):
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

        index_file = os.path.join(self.directory, "index.html")
        if os.path.isfile(index_file):
            self.path = "/index.html"
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

        self.send_error(404, "File not found")


def main():
    parser = argparse.ArgumentParser(description="Serve SPA static files with index fallback.")
    parser.add_argument("directory", nargs="?", default="dist", help="Directory to serve")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    args = parser.parse_args()

    directory = os.path.abspath(args.directory)
    if not os.path.isdir(directory):
        raise SystemExit(f"Directory not found: {directory}")

    handler = lambda *h_args, **h_kwargs: SpaHandler(*h_args, directory=directory, **h_kwargs)
    with socketserver.TCPServer(("0.0.0.0", args.port), handler) as httpd:
        print(f"[serve_spa] serving {directory} at http://0.0.0.0:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
