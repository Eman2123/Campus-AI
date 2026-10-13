#!/usr/bin/env python3
"""Lists the open-source packages Campus AI ships with, and their licences.

    # from the repo root, with the backend's virtualenv active and
    # `npm ci` already run in frontend/:
    python scripts/generate_licenses.py

Writes frontend/lib/licenses.generated.json (rendered at /licenses) and
docs/legal/THIRD_PARTY_LICENSES.md. Re-run it whenever dependencies change.
Production dependencies only: dev tools (pytest, ruff, eslint...) are not
shipped to users.
"""
from __future__ import annotations

import json
import re
from datetime import date
from importlib import metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COPYLEFT = re.compile(r"\b(A?GPL|LGPL|MPL|EPL|CDDL|SSPL|EUPL|CC-BY-SA)", re.I)


def _clean(value: str | None) -> str:
    if not value:
        return ""
    first = value.strip().splitlines()[0].strip()
    return first[:80]


def node_packages() -> list[dict]:
    lock = json.loads((ROOT / "frontend/package-lock.json").read_text())
    out = []
    for key, info in lock.get("packages", {}).items():
        if not key.startswith("node_modules/") or info.get("dev"):
            continue
        name = key.split("node_modules/")[-1]
        license_ = info.get("license")
        pkg_json = ROOT / "frontend" / key / "package.json"
        if not license_ and pkg_json.exists():
            data = json.loads(pkg_json.read_text())
            license_ = data.get("license")
            if isinstance(license_, dict):
                license_ = license_.get("type")
            if not license_ and isinstance(data.get("licenses"), list) and data["licenses"]:
                license_ = data["licenses"][0].get("type")
        out.append({"name": name, "version": info.get("version", ""), "license": _clean(license_) or "UNKNOWN", "source": "frontend"})
    return out


def _py_license(dist: metadata.Distribution) -> str:
    meta = dist.metadata
    expr = meta.get("License-Expression")
    if expr:
        return _clean(expr)
    lic = meta.get("License")
    if lic and len(lic.strip().splitlines()) == 1 and len(lic) < 60:
        return _clean(lic)
    classifiers = [c.split("::")[-1].strip() for c in meta.get_all("Classifier") or [] if c.startswith("License ::")]
    classifiers = [c for c in classifiers if c != "OSI Approved"]
    if classifiers:
        return "; ".join(classifiers)[:80]
    return _clean(lic) or "UNKNOWN"


def python_packages() -> list[dict]:
    names = []
    for line in (ROOT / "backend/requirements.txt").read_text().splitlines():
        line = line.split("#")[0].strip()
        if line and not line.startswith("-"):
            names.append(re.split(r"[<>=!~\[; ]", line)[0])
    seen: dict[str, metadata.Distribution] = {}
    todo = list(names)
    while todo:
        name = todo.pop()
        key = re.sub(r"[-_.]+", "-", name).lower()
        if key in seen:
            continue
        try:
            dist = metadata.distribution(name)
        except metadata.PackageNotFoundError:
            continue
        seen[key] = dist
        for req in dist.requires or []:
            if "extra ==" in req:
                continue
            todo.append(re.split(r"[<>=!~\[; ]", req.strip())[0])
    return sorted(
        ({"name": d.metadata["Name"], "version": d.version, "license": _py_license(d), "source": "backend"} for d in seen.values()),
        key=lambda p: p["name"].lower(),
    )


def main() -> None:
    packages = sorted(node_packages() + python_packages(), key=lambda p: (p["source"], p["name"].lower()))
    copyleft = [p for p in packages if COPYLEFT.search(p["license"])]
    unknown = [p for p in packages if p["license"] == "UNKNOWN"]

    out = {"generated": date.today().isoformat(), "packages": packages}
    (ROOT / "frontend/lib/licenses.generated.json").write_text(json.dumps(out, indent=1) + "\n")

    lines = [
        "# Third-party licences",
        "",
        f"Generated {out['generated']} by `scripts/generate_licenses.py` (production dependencies only).",
        "",
        f"- {len(packages)} packages ({sum(p['source'] == 'frontend' for p in packages)} frontend, "
        f"{sum(p['source'] == 'backend' for p in packages)} backend)",
        f"- Weak/strong copyleft or unusual licences to review: {len(copyleft)}",
        f"- Licence not detected automatically: {len(unknown)}",
        "",
    ]
    if copyleft:
        lines += ["## Review these", "", "| Package | Version | Licence | Where |", "|---|---|---|---|"]
        lines += [f"| {p['name']} | {p['version']} | {p['license']} | {p['source']} |" for p in copyleft]
        lines.append("")
    if unknown:
        lines += ["## Licence not detected", ""] + [f"- {p['name']} {p['version']} ({p['source']})" for p in unknown] + [""]
    counts: dict[str, int] = {}
    for p in packages:
        counts[p["license"]] = counts.get(p["license"], 0) + 1
    lines += ["## Count by licence", "", "| Licence | Packages |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])]
    lines += ["", "## All packages", "", "| Package | Version | Licence | Where |", "|---|---|---|---|"]
    lines += [f"| {p['name']} | {p['version']} | {p['license']} | {p['source']} |" for p in packages]
    (ROOT / "docs/legal/THIRD_PARTY_LICENSES.md").write_text("\n".join(lines) + "\n")
    print(f"{len(packages)} packages; copyleft/unusual: {len(copyleft)}; unknown: {len(unknown)}")
    for p in copyleft + unknown:
        print("  review:", p["name"], p["version"], p["license"], p["source"])


if __name__ == "__main__":
    main()
