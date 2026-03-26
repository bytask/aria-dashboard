#!/usr/bin/env python3
"""
Things 3 Local Server
Reads/adds tasks from/to Things 3.
Usage: python3 things-server.py [--port 5001]

Endpoints:
  GET  /tasks/today  - Get today's tasks
  POST /tasks/add    - Add a new task to Today (uses Things URL scheme)
"""

import json
import os
import sqlite3
import subprocess
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import argparse

THINGS_DB = os.path.expanduser(
    "~/Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/"
    "Things Database.thingsdatabase/main.sqlite"
)

QUERY_TODAY = """
SELECT
    t.title,
    COALESCE(p.title, '') AS project,
    CASE WHEN t.status = 3 THEN 1 ELSE 0 END AS completed
FROM TMTask t
LEFT JOIN TMTask p ON t.project = p.uuid
WHERE t.type = 0
  AND t.trashed = 0
  AND t.start = 1
  AND (t.status = 0 OR t.status = 3)
ORDER BY t.todayIndex ASC
"""


def get_today_tasks():
    if not os.path.exists(THINGS_DB):
        return {"error": "Things database not found"}

    try:
        conn = sqlite3.connect(f"file:{THINGS_DB}?mode=ro", uri=True)
        cursor = conn.execute(QUERY_TODAY)
        tasks = [
            {"title": row[0], "project": row[1], "completed": bool(row[2])}
            for row in cursor.fetchall()
        ]
        conn.close()
        return tasks
    except sqlite3.Error as e:
        return {"error": str(e)}


def add_task(title, notes="", project=""):
    """Add a task to Things 3 Today list via URL scheme."""
    params = {
        "title": title,
        "when": "today",
        "show-quick-entry": "false",
    }
    if notes:
        params["notes"] = notes
    if project:
        params["list"] = project

    url = "things:///add?" + urllib.parse.urlencode(params)
    subprocess.run(["open", url], check=True)
    return {"ok": True, "title": title}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/tasks/today":
            data = get_today_tasks()
            self._json_response(200, data)
        else:
            self._json_response(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/tasks/add":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body) if body else {}
            except json.JSONDecodeError:
                self._json_response(400, {"error": "Invalid JSON"})
                return

            title = payload.get("title", "").strip()
            if not title:
                self._json_response(400, {"error": "title is required"})
                return

            result = add_task(
                title,
                notes=payload.get("notes", ""),
                project=payload.get("project", ""),
            )
            self._json_response(200, result)
        else:
            self._json_response(404, {"error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _json_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print(f"[Things Server] {args[0]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Things 3 task server")
    parser.add_argument("--port", type=int, default=5001)
    args = parser.parse_args()

    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Things server running at http://127.0.0.1:{args.port}")
    print("Endpoints:")
    print("  GET  /tasks/today  - Get today's tasks")
    print("  POST /tasks/add    - Add task to Today")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()
