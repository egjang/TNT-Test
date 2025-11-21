#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import sys
from datetime import datetime


def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def next_flyway_version(dir_path: str) -> int:
    if not os.path.isdir(dir_path):
        return 1
    max_v = 0
    for name in os.listdir(dir_path):
        m = re.match(r"^V(\d+)__", name)
        if m:
            try:
                v = int(m.group(1))
                if v > max_v:
                    max_v = v
            except ValueError:
                continue
    return max_v + 1


def main():
    ap = argparse.ArgumentParser(description='Rollback a feature: generate cleanup tasks, restore baseline spec, create Flyway revert stubs.')
    ap.add_argument('--feature', required=True, help='Path to feature dir (tnt_sales/specs/NNN-slug)')
    ap.add_argument('--slug', help='Optional slug override for naming')
    args = ap.parse_args()

    feature_dir = args.feature
    spec_path = os.path.join(feature_dir, 'spec.md')
    baseline_path = os.path.join(feature_dir, '.baseline', 'spec.md')
    if not os.path.isfile(spec_path) or not os.path.isfile(baseline_path):
        print('ERROR: spec.md or .baseline/spec.md missing', file=sys.stderr)
        sys.exit(2)

    # Compute delta tasks BEFORE restoring spec.md
    report_cmd = f"python3 tnt_sales/scripts/spec-diff.py --feature {feature_dir} --baseline {baseline_path} --update-tasks"
    print(f"Running: {report_cmd}")
    os.system(report_cmd)

    # Restore spec.md from baseline
    shutil.copyfile(baseline_path, spec_path)
    print(f"Restored spec.md from baseline: {baseline_path} -> {spec_path}")

    # Create Flyway revert stubs in both DBs
    slug = args.slug or os.path.basename(feature_dir).split('-', 1)[-1]
    ts = datetime.now().strftime('%Y-%m-%d %H:%M')
    for db in ['mssql', 'postgres']:
        base = os.path.join('tnt_sales', 'backend', 'src', 'main', 'resources', 'db', 'migration', db)
        v = next_flyway_version(base)
        fname = f"V{v}__revert_{slug}.sql"
        path = os.path.join(base, fname)
        stub = f"-- Revert stub for feature '{slug}'\n-- Generated {ts}\n-- TODO: add DDL to revert objects/data introduced by this feature.\n"
        write(path, stub)
        print(f"Created Flyway revert stub: {path}")

    # Print suggested git commands
    print('\nSuggested git steps:')
    print('- Identify commit range for the feature (e.g., via git log).')
    print('- Revert commits without history rewrite:')
    print('  git revert <oldest_commit>^..<newest_commit>')
    print('- Or revert a merge commit:')
    print('  git revert -m 1 <merge_commit_sha>')


if __name__ == '__main__':
    main()

