"""Exercise an offline backup/restore using only newly generated TinyDB fixtures."""

import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from tinydb import TinyDB


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    fixtures = {
        "auth.json": {
            "users": [{"id": "synthetic-user", "role": "manager", "is_active": True}],
            "profiles": [{"id": "synthetic-profile", "user_id": "synthetic-user"}],
            "reset_tokens": [],
        },
        "suppliers.json": {"suppliers": [{"id": 1, "name": "Synthetic supplier"}]},
        "incidents.json": {"incidents": [{"id": "synthetic-incident", "status": "open"}]},
        "analyses.json": {"analyses": [{"analysis_id": "synthetic-analysis", "total_records": 1}]},
    }
    with tempfile.TemporaryDirectory(prefix="brasaland-baseline-recovery-") as directory:
        root = Path(directory)
        source, backup, restored = (root / name for name in ("source", "backup", "restored"))
        for location in (source, backup, restored):
            location.mkdir()
        hashes = {}
        for filename, tables in fixtures.items():
            with TinyDB(source / filename) as database:
                for table, rows in tables.items():
                    database.table(table).insert_multiple(rows)
            hashes[filename] = digest(source / filename)
            shutil.copy2(source / filename, backup / filename)
            if digest(backup / filename) != hashes[filename]:
                raise RuntimeError(f"Backup checksum mismatch: {filename}")

        for filename in fixtures:
            (source / filename).write_text("simulated corruption", encoding="utf-8")
            if digest(source / filename) == hashes[filename]:
                raise RuntimeError(f"Corruption simulation failed: {filename}")
            shutil.copy2(backup / filename, restored / filename)
            if digest(restored / filename) != hashes[filename]:
                raise RuntimeError(f"Restore checksum mismatch: {filename}")
            with TinyDB(restored / filename) as database:
                for table, expected in fixtures[filename].items():
                    if database.table(table).all() != expected:
                        raise RuntimeError(f"Restored content mismatch: {filename}/{table}")

        print(json.dumps({
            "status": "passed",
            "files": hashes,
            "checks": ["closed writers", "backup checksums", "simulated corruption",
                       "restore checksums", "TinyDB table contents"],
            "scope": "synthetic fixtures only; not a production backup or PostgreSQL restore",
        }, indent=2))


if __name__ == "__main__":
    main()
