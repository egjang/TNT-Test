#!/usr/bin/env python3
import argparse
import hashlib
import os
import re
import sys
from datetime import datetime


SECTION_TITLES = {
    "fr": "Functional Requirements",
    "ac": "Acceptance Criteria",
}


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_text(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def find_section(text: str, title: str) -> str:
    lines = text.splitlines()
    title_norm = f"## {title}".strip().lower()
    start = None
    for i, line in enumerate(lines):
        if line.strip().lower() == title_norm:
            start = i + 1
            break
    if start is None:
        return ""
    # find next section header
    end = len(lines)
    for j in range(start, len(lines)):
        if lines[j].strip().startswith("## "):
            end = j
            break
    return "\n".join(lines[start:end]).strip()


def parse_bullets(section_text: str, key_prefix: str):
    # Returns: (keyed: dict[key]->text, unkeyed: list[text])
    keyed = {}
    unkeyed = []
    if not section_text:
        return keyed, unkeyed
    pattern = re.compile(
        rf"^\s*[-*]\s*(?:\[[ xX]\]\s*)?(?:({key_prefix}-\d+)\s*:)\s*(.+)$"
    )
    any_bullet = re.compile(r"^\s*[-*]\s*(?:\[[ xX]\]\s*)?(.*\S.*)$")
    for raw in section_text.splitlines():
        m = pattern.match(raw)
        if m:
            key = m.group(1).strip()
            text = m.group(2).strip()
            keyed[key] = text
            continue
        m2 = any_bullet.match(raw)
        if m2:
            text = m2.group(1).strip()
            if text:
                unkeyed.append(text)
    return keyed, unkeyed


def diff_sections(old_keyed, old_unkeyed, new_keyed, new_unkeyed):
    # keyed diffs
    old_keys = set(old_keyed.keys())
    new_keys = set(new_keyed.keys())
    added = sorted(new_keys - old_keys)
    removed = sorted(old_keys - new_keys)
    modified = []
    for k in sorted(old_keys & new_keys):
        if normalize_text(old_keyed[k]) != normalize_text(new_keyed[k]):
            modified.append(k)

    # unkeyed diffs by content hash
    old_set = set(map(normalize_text, old_unkeyed))
    new_set = set(map(normalize_text, new_unkeyed))
    unkeyed_added = sorted(new_set - old_set)
    unkeyed_removed = sorted(old_set - new_set)

    return {
        "added": added,
        "removed": removed,
        "modified": modified,
        "unkeyed_added": unkeyed_added,
        "unkeyed_removed": unkeyed_removed,
    }


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()).lower()


def render_report(feature_dir: str, old_spec_path: str | None, new_spec_path: str, diffs: dict, new_parsed: dict) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = []
    lines.append(f"# Spec Diff Report — {os.path.basename(feature_dir)}")
    lines.append("")
    lines.append(f"Generated: {ts}")
    lines.append(f"Current: {rel(new_spec_path)}")
    lines.append(f"Baseline: {rel(old_spec_path) if old_spec_path else '(none — first run)'}")
    lines.append("")

    def section(title_key: str, key_prefix: str):
        d = diffs[title_key]
        lines.append(f"## {SECTION_TITLES[title_key]}")
        # keyed
        if d["added"]:
            lines.append("- Added (keyed):")
            for k in d["added"]:
                lines.append(f"  - {k}: {new_parsed[title_key]['keyed'].get(k, '')}")
        if d["modified"]:
            lines.append("- Modified (keyed):")
            for k in d["modified"]:
                lines.append(f"  - {k}")
        if d["removed"]:
            lines.append("- Removed (keyed):")
            for k in d["removed"]:
                lines.append(f"  - {k}")
        # unkeyed
        if d["unkeyed_added"]:
            lines.append("- Added (unkeyed):")
            for t in d["unkeyed_added"]:
                lines.append(f"  - {t}")
        if d["unkeyed_removed"]:
            lines.append("- Removed (unkeyed):")
            for t in d["unkeyed_removed"]:
                lines.append(f"  - {t}")
        lines.append("")

    section("fr", "FR")
    section("ac", "AC")
    return "\n".join(lines).rstrip() + "\n"


def update_tasks(feature_dir: str, diffs: dict):
    tasks_path = os.path.join(feature_dir, "tasks.md")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    block = []
    block.append(f"\n## Delta Tasks ({now})\n")

    def add_delta(title_key: str, key_prefix: str):
        d = diffs[title_key]
        title = SECTION_TITLES[title_key]
        block.append(f"### {title}\n")
        if d["added"]:
            for k in d["added"]:
                block.append(f"- T-Δ-{k}-impl: Implement new {k} (backend/frontend/tests)")
        if d["modified"]:
            for k in d["modified"]:
                block.append(f"- T-Δ-{k}-update: Update implementation for {k} (impacted layers)")
        if d["removed"]:
            for k in d["removed"]:
                block.append(f"- T-Δ-{k}-cleanup: Remove/deprecate code for {k} and tests")
        if d["unkeyed_added"]:
            for i, t in enumerate(d["unkeyed_added"], start=1):
                block.append(f"- T-Δ-{key_prefix}-UADD-{i}: Implement new requirement — {t}")
        if d["unkeyed_removed"]:
            for i, t in enumerate(d["unkeyed_removed"], start=1):
                block.append(f"- T-Δ-{key_prefix}-UREM-{i}: Remove/deprecate code — {t}")
        block.append("")

    add_delta("fr", "FR")
    add_delta("ac", "AC")

    if os.path.exists(tasks_path):
        with open(tasks_path, "a", encoding="utf-8") as f:
            f.write("\n".join(block))
    else:
        write_text(tasks_path, "# Tasks\n\n" + "\n".join(block))


def rel(path: str | None) -> str:
    if not path:
        return ""
    try:
        return os.path.relpath(path)
    except Exception:
        return path


def main():
    p = argparse.ArgumentParser(description="Diff spec.md against a baseline and output a report.")
    p.add_argument("--feature", required=True, help="Path to feature directory (contains spec.md)")
    p.add_argument("--baseline", default=None, help="Path to baseline spec (default: <feature>/.baseline/spec.md)")
    p.add_argument("--update-tasks", action="store_true", help="Append delta tasks to tasks.md")
    p.add_argument("--update-baseline", action="store_true", help="Copy current spec.md to baseline after diff")
    args = p.parse_args()

    feature_dir = args.feature
    spec_path = os.path.join(feature_dir, "spec.md")
    if not os.path.isfile(spec_path):
        print(f"ERROR: spec not found: {spec_path}", file=sys.stderr)
        sys.exit(2)

    baseline_path = args.baseline
    if not baseline_path:
        baseline_path = os.path.join(feature_dir, ".baseline", "spec.md")

    old_text = None
    if os.path.isfile(baseline_path):
        old_text = read_text(baseline_path)

    new_text = read_text(spec_path)

    def parse_all(text: str):
        fr_section = find_section(text, SECTION_TITLES["fr"]) or ""
        ac_section = find_section(text, SECTION_TITLES["ac"]) or ""
        fr_keyed, fr_unkeyed = parse_bullets(fr_section, "FR")
        ac_keyed, ac_unkeyed = parse_bullets(ac_section, "AC")
        return {
            "fr": {"keyed": fr_keyed, "unkeyed": fr_unkeyed},
            "ac": {"keyed": ac_keyed, "unkeyed": ac_unkeyed},
        }

    old_parsed = {"fr": {"keyed": {}, "unkeyed": []}, "ac": {"keyed": {}, "unkeyed": []}}
    if old_text is not None:
        old_parsed = parse_all(old_text)
    new_parsed = parse_all(new_text)

    fr_diff = diff_sections(
        old_parsed["fr"]["keyed"],
        old_parsed["fr"]["unkeyed"],
        new_parsed["fr"]["keyed"],
        new_parsed["fr"]["unkeyed"],
    )
    ac_diff = diff_sections(
        old_parsed["ac"]["keyed"],
        old_parsed["ac"]["unkeyed"],
        new_parsed["ac"]["keyed"],
        new_parsed["ac"]["unkeyed"],
    )

    diffs = {"fr": fr_diff, "ac": ac_diff}
    report = render_report(feature_dir, baseline_path if old_text is not None else None, spec_path, diffs, new_parsed)
    report_path = os.path.join(feature_dir, "spec-diff-report.md")
    write_text(report_path, report)

    if args.update_tasks:
        update_tasks(feature_dir, diffs)

    if args.update_baseline:
        write_text(baseline_path, new_text)

    # Print a short summary to stdout
    def sum_counts(d):
        return {
            "added": len(d["added"]) + len(d["unkeyed_added"]),
            "removed": len(d["removed"]) + len(d["unkeyed_removed"]),
            "modified": len(d["modified"]),
        }

    fr_s = sum_counts(fr_diff)
    ac_s = sum_counts(ac_diff)
    print("Spec diff complete →", rel(report_path))
    print(f"FR: +{fr_s['added']} ~{fr_s['modified']} -{fr_s['removed']}")
    print(f"AC: +{ac_s['added']} ~{ac_s['modified']} -{ac_s['removed']}")
    if args.update_tasks:
        print("tasks.md updated (delta tasks appended)")
    if args.update_baseline:
        print("baseline updated")


if __name__ == "__main__":
    main()

