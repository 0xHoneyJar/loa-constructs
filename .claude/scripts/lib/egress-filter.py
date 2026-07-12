#!/usr/bin/env python3
"""
lib/egress-filter.py — Sprint 4 (S4-T3) — userspace egress filter / CONNECT proxy
SDD §2.3, FR-4.1 network egress allowlist.

CONNECT-only HTTPS proxy with host:port allowlist.
- Does NOT MITM (no CA trust required, no cert manipulation).
- Enforces allowlist via the CONNECT request line.
- Logs every attempted connection to egress.jsonl.
- Fail-closed: proxy death causes stage SIGKILL (monitored by stage executor).
- Advisory-tier scope: HTTP_PROXY-aware code only; raw sockets / DNS / UDP
  not covered (explicit advisory-tier limitation per SDD §2.3).

Usage:
    egress-filter.py --port <port> --allowlist-file <path> \
                     [--log-file <path>] [--timeout <seconds>]

    egress-filter.py --port 0 --allowlist-json '[{"host":"api.anthropic.com","port":443}]'

Allowlist file (YAML or JSON):
    allowed_egress:
      - host: api.anthropic.com
        port: 443
      - host: api.openai.com
        port: 443

Exit codes:
    0  clean shutdown
    1  configuration error (bad allowlist, port conflict)
    2  usage error
    78 EX_CONFIG (missing required arguments)

Error codes emitted to egress.jsonl:
    [EGRESS-DENIED]      Host:port not in allowlist
    [EGRESS-PROXY-DOWN]  Proxy died; stage executor should SIGKILL stage subprocess
    [EGRESS-LOG-ERROR]   Could not write to log file (degraded mode; continues)
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import select
import signal
import socket
import sys
import threading
import time
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Allowlist
# ---------------------------------------------------------------------------

class EgressAllowlist:
    """Host:port allowlist with O(1) lookup."""

    def __init__(self, entries: list[dict]) -> None:
        self._allowed: set[tuple[str, int]] = set()
        for entry in entries:
            host = str(entry.get("host", "")).strip().lower()
            port_raw = entry.get("port", 0)
            try:
                port = int(port_raw)
            except (TypeError, ValueError):
                raise ValueError(f"Invalid port {port_raw!r} in allowlist entry {entry!r}")
            if not host:
                raise ValueError(f"Empty host in allowlist entry {entry!r}")
            self._allowed.add((host, port))

    def permits(self, host: str, port: int) -> bool:
        return (host.strip().lower(), port) in self._allowed

    def __repr__(self) -> str:
        return f"EgressAllowlist({sorted(self._allowed)})"


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

class EgressLogger:
    """Thread-safe JSONL logger for egress events."""

    def __init__(self, log_path: Optional[str]) -> None:
        self._path = log_path
        self._lock = threading.Lock()

    def _emit(self, record: dict) -> None:
        record.setdefault("ts", datetime.datetime.utcnow().isoformat() + "Z")
        line = json.dumps(record, separators=(",", ":")) + "\n"
        with self._lock:
            if self._path:
                try:
                    with open(self._path, "a") as fh:
                        fh.write(line)
                except OSError as exc:
                    print(f"[egress-filter] [EGRESS-LOG-ERROR] {exc}", file=sys.stderr)
            else:
                print(line.rstrip(), file=sys.stderr)

    def permitted(self, host: str, port: int, client_addr: tuple) -> None:
        self._emit({
            "event": "egress.permitted",
            "host": host,
            "port": port,
            "client": f"{client_addr[0]}:{client_addr[1]}",
        })

    def denied(self, host: str, port: int, client_addr: tuple) -> None:
        self._emit({
            "event": "egress.denied",
            "error_code": "[EGRESS-DENIED]",
            "host": host,
            "port": port,
            "client": f"{client_addr[0]}:{client_addr[1]}",
        })

    def error(self, msg: str, **kw) -> None:
        self._emit({"event": "egress.error", "message": msg, **kw})

    def shutdown(self, reason: str) -> None:
        self._emit({"event": "egress.shutdown", "reason": reason})


# ---------------------------------------------------------------------------
# CONNECT-only proxy handler
# ---------------------------------------------------------------------------

_BUFSIZE = 65536
_CONNECT_TIMEOUT = 10  # seconds to connect to upstream


def _tunnel(src: socket.socket, dst: socket.socket, stop_event: threading.Event) -> None:
    """Bidirectional byte relay between two sockets."""
    src.setblocking(False)
    dst.setblocking(False)
    try:
        while not stop_event.is_set():
            readable, _, exceptional = select.select([src, dst], [], [src, dst], 1.0)
            if exceptional:
                break
            for sock in readable:
                other = dst if sock is src else src
                try:
                    data = sock.recv(_BUFSIZE)
                    if not data:
                        return
                    other.sendall(data)
                except OSError:
                    return
    finally:
        for s in (src, dst):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def _handle_connection(
    client_sock: socket.socket,
    client_addr: tuple,
    allowlist: EgressAllowlist,
    logger: EgressLogger,
    timeout: int,
) -> None:
    """Handle a single client connection — CONNECT method only."""
    client_sock.settimeout(timeout)
    upstream: Optional[socket.socket] = None
    stop_event = threading.Event()

    try:
        # Read the first request line (CONNECT host:port HTTP/1.x)
        buf = b""
        while b"\r\n\r\n" not in buf and len(buf) < 4096:
            chunk = client_sock.recv(256)
            if not chunk:
                return
            buf += chunk

        request_line = buf.split(b"\r\n")[0].decode("latin-1", errors="replace")
        parts = request_line.split()

        if len(parts) < 3 or parts[0].upper() != "CONNECT":
            # Non-CONNECT methods are not supported (advisory-tier HTTPS only).
            client_sock.sendall(
                b"HTTP/1.1 405 Method Not Allowed\r\n"
                b"Content-Length: 0\r\n\r\n"
            )
            logger.error("non-CONNECT request rejected", method=parts[0] if parts else "?")
            return

        authority = parts[1]  # host:port
        if ":" not in authority:
            client_sock.sendall(
                b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n"
            )
            logger.error("malformed CONNECT authority", authority=authority)
            return

        host, port_str = authority.rsplit(":", 1)
        try:
            port = int(port_str)
        except ValueError:
            client_sock.sendall(
                b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n"
            )
            logger.error("non-numeric port in CONNECT", authority=authority)
            return

        if not allowlist.permits(host, port):
            logger.denied(host, port, client_addr)
            client_sock.sendall(
                b"HTTP/1.1 403 Forbidden\r\n"
                b"X-Egress-Filter: [EGRESS-DENIED]\r\n"
                b"Content-Length: 0\r\n\r\n"
            )
            return

        # Permitted — open upstream connection
        logger.permitted(host, port, client_addr)
        upstream = socket.create_connection((host, port), timeout=_CONNECT_TIMEOUT)
        client_sock.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        client_sock.settimeout(None)
        upstream.settimeout(None)

        # Relay bytes in both directions
        t = threading.Thread(target=_tunnel, args=(client_sock, upstream, stop_event), daemon=True)
        t.start()
        _tunnel(upstream, client_sock, stop_event)
        stop_event.set()
        t.join(timeout=5)

    except OSError as exc:
        logger.error(f"connection error: {exc}")
    finally:
        stop_event.set()
        for s in (client_sock, upstream):
            if s is not None:
                try:
                    s.close()
                except OSError:
                    pass


# ---------------------------------------------------------------------------
# Main server loop
# ---------------------------------------------------------------------------

class EgressFilterServer:
    """TCP server that accepts connections and spawns handler threads."""

    def __init__(
        self,
        port: int,
        allowlist: EgressAllowlist,
        logger: EgressLogger,
        timeout: int = 30,
    ) -> None:
        self._allowlist = allowlist
        self._logger = logger
        self._timeout = timeout
        self._server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_sock.bind(("127.0.0.1", port))
        self._server_sock.listen(128)
        self._bound_port = self._server_sock.getsockname()[1]
        self._running = True

    @property
    def port(self) -> int:
        return self._bound_port

    def run(self) -> None:
        print(f"[egress-filter] listening on 127.0.0.1:{self._bound_port}", file=sys.stderr, flush=True)
        # Write the bound port to stdout for the stage executor to read
        print(self._bound_port, flush=True)

        self._server_sock.settimeout(1.0)
        while self._running:
            try:
                client_sock, client_addr = self._server_sock.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            t = threading.Thread(
                target=_handle_connection,
                args=(client_sock, client_addr, self._allowlist, self._logger, self._timeout),
                daemon=True,
            )
            t.start()

    def stop(self, reason: str = "shutdown") -> None:
        self._running = False
        self._logger.shutdown(reason)
        try:
            self._server_sock.close()
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Allowlist loading
# ---------------------------------------------------------------------------

def _load_allowlist_file(path: str) -> list[dict]:
    import pathlib
    content = pathlib.Path(path).read_text()
    # Try JSON first, then YAML
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore[import-untyped]
            data = yaml.safe_load(content)
        except ImportError:
            raise RuntimeError(
                "[egress-filter] pyyaml required for YAML allowlist files. "
                "Install: pip install pyyaml"
            )
    if isinstance(data, dict) and "allowed_egress" in data:
        return data["allowed_egress"] or []
    if isinstance(data, list):
        return data
    raise ValueError(f"Unexpected allowlist format in {path!r}. "
                     "Expected list or {{allowed_egress: [...]}}.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="CONNECT-only egress filter proxy (SDD §2.3)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--port", type=int, default=0,
                        help="Listen port (0 = OS-assigned; bound port printed to stdout)")
    parser.add_argument("--allowlist-file", metavar="PATH",
                        help="YAML/JSON file with host:port allowlist")
    parser.add_argument("--allowlist-json", metavar="JSON",
                        help="Inline JSON allowlist array or {allowed_egress:[...]} object")
    parser.add_argument("--log-file", metavar="PATH",
                        help="Egress event log (JSONL). Defaults to stderr.")
    parser.add_argument("--timeout", type=int, default=30,
                        help="Per-connection tunnel idle timeout seconds (default: 30)")
    parser.add_argument("--allow-none", action="store_true",
                        help="Start with empty allowlist (deny-all mode); useful for testing")

    args = parser.parse_args(argv)

    # Build allowlist entries
    entries: list[dict] = []
    if args.allowlist_file:
        try:
            entries.extend(_load_allowlist_file(args.allowlist_file))
        except Exception as exc:
            print(f"[egress-filter] ERROR loading allowlist file: {exc}", file=sys.stderr)
            return 1
    if args.allowlist_json:
        try:
            raw = json.loads(args.allowlist_json)
            if isinstance(raw, dict) and "allowed_egress" in raw:
                entries.extend(raw["allowed_egress"] or [])
            elif isinstance(raw, list):
                entries.extend(raw)
            else:
                print("[egress-filter] ERROR: --allowlist-json must be a list or "
                      "{allowed_egress: [...]}", file=sys.stderr)
                return 1
        except json.JSONDecodeError as exc:
            print(f"[egress-filter] ERROR parsing --allowlist-json: {exc}", file=sys.stderr)
            return 1

    if not entries and not args.allow_none:
        print(
            "[egress-filter] ERROR: no allowlist provided. "
            "Use --allowlist-file, --allowlist-json, or --allow-none for deny-all mode.",
            file=sys.stderr,
        )
        return 78  # EX_CONFIG

    try:
        allowlist = EgressAllowlist(entries)
    except ValueError as exc:
        print(f"[egress-filter] ERROR building allowlist: {exc}", file=sys.stderr)
        return 1

    logger = EgressLogger(args.log_file)
    server = EgressFilterServer(
        port=args.port,
        allowlist=allowlist,
        logger=logger,
        timeout=args.timeout,
    )

    def _handle_signal(signum: int, _frame) -> None:
        server.stop(f"signal-{signum}")
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    try:
        server.run()
    except KeyboardInterrupt:
        server.stop("keyboard-interrupt")

    return 0


if __name__ == "__main__":
    sys.exit(main())
