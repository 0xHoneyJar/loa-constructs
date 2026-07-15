#!/usr/bin/env bats

setup() {
    REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    SCRIPT="$REPO_ROOT/.agents/skills/flatline-knowledge/resources/notebooklm-query.py"
}

@test "NotebookLM auth profile hardening repairs descendants and rejects symlinks" {
    run python3 - "$SCRIPT" "$BATS_TEST_TMPDIR" <<'PY'
import importlib.util
import os
from pathlib import Path
import stat
import sys

script = Path(sys.argv[1])
scratch = Path(sys.argv[2])
spec = importlib.util.spec_from_file_location("notebooklm_query", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = scratch / "profile"
nested = profile / "Default" / "Local Storage"
nested.mkdir(parents=True, mode=0o777)
cookie = profile / "Default" / "Cookies"
cookie.write_text("credential material", encoding="utf-8")
os.chmod(profile, 0o755)
os.chmod(profile / "Default", 0o755)
os.chmod(nested, 0o755)
os.chmod(cookie, 0o644)

module.secure_auth_profile(profile)
for directory in (profile, profile / "Default", nested):
    assert stat.S_IMODE(directory.stat().st_mode) == 0o700
assert stat.S_IMODE(cookie.stat().st_mode) == 0o600

link = profile / "Default" / "escape"
link.symlink_to(cookie)
try:
    module.secure_auth_profile(profile)
except RuntimeError as exc:
    assert "symlink" in str(exc)
else:
    raise AssertionError("profile symlink was accepted")
PY
    [ "$status" -eq 0 ]
}

@test "Claude and agent NotebookLM resources remain byte-identical" {
    run cmp \
        "$REPO_ROOT/.claude/skills/flatline-knowledge/resources/notebooklm-query.py" \
        "$REPO_ROOT/.agents/skills/flatline-knowledge/resources/notebooklm-query.py"
    [ "$status" -eq 0 ]
}
