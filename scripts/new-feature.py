#!/usr/bin/env python3
import argparse
import os
import re
import sys
from datetime import datetime


HANGUL_BASE = 0xAC00

# Minimal glossary mapping common Korean business terms to English slugs
GLOSSARY = {
    "영업": "sales",
    "수요관리": "demand-management",
    "메인 화면": "main-screen",
    "메인화면": "main-screen",
    "주문": "orders",
    "고객": "customer",
    "매출": "revenue",
    "재고": "inventory",
    "상품": "product",
}


def is_hangul_syllable(ch: str) -> bool:
    code = ord(ch)
    return 0xAC00 <= code <= 0xD7A3


def simple_transliterate(text: str) -> str:
    # Fallback: keep ASCII, replace others with hyphens
    t = re.sub(r"[^A-Za-z0-9]+", "-", text)
    return t


def translate_to_slug(title: str) -> str:
    # Exact phrase match first (including with spaces)
    t = title.strip()
    if t in GLOSSARY:
        return GLOSSARY[t]
    # Tokenize on whitespace and map each token; if no mapping, transliterate
    tokens = re.split(r"\s+", t)
    out = []
    for tok in tokens:
        if not tok:
            continue
        if tok in GLOSSARY:
            out.append(GLOSSARY[tok])
        else:
            out.append(simple_transliterate(tok))
    slug = "-".join([s for s in out if s])
    slug = slug.lower()
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "feature"


def slugify(title: str) -> str:
    return translate_to_slug(title)


def find_next_nnn(specs_dir: str) -> str:
    max_n = -1
    if not os.path.isdir(specs_dir):
        return "000"
    for name in os.listdir(specs_dir):
        m = re.match(r"^(\d{3})-", name)
        if m:
            try:
                n = int(m.group(1))
                max_n = max(max_n, n)
            except ValueError:
                continue
    return f"{max_n + 1:03d}"


def write(path: str, content: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    ap = argparse.ArgumentParser(description="Create a new feature spec folder under tnt_sales/specs with slug and baseline.")
    ap.add_argument("--title", required=True, help="Feature title (can be Korean)")
    ap.add_argument("--slug", help="Override slug (ascii)")
    ap.add_argument("--nnn", help="3-digit prefix; defaults to next available")
    ap.add_argument("--specs-dir", default=os.path.join("tnt_sales", "specs"))
    args = ap.parse_args()

    title = args.title.strip()
    slug = args.slug.strip() if args.slug else slugify(title)
    nnn = args.nnn if args.nnn else find_next_nnn(args.specs_dir)
    if not re.fullmatch(r"\d{3}", nnn):
        print("ERROR: --nnn must be 3 digits (e.g., 001)", file=sys.stderr)
        sys.exit(2)

    feature_dir = os.path.join(args.specs_dir, f"{nnn}-{slug}")
    if os.path.exists(feature_dir):
        print(f"ERROR: Feature directory already exists: {feature_dir}", file=sys.stderr)
        sys.exit(3)

    today = datetime.now().strftime("%Y-%m-%d")

    spec = f"""# Feature Specification: {title}

**Feature Branch**: `[{nnn}-{slug}]`
**Created**: {today}
**Status**: Draft
**Input**: User description: \"{title}\"

## Overview
- Goal:
- Primary users:
- Success criteria:

## User Scenarios
- [ ] 

## Functional Requirements
- [ ] FR-1:

## Out of Scope
- 

## Open Questions
- [NEEDS CLARIFICATION: ]

## Risks & Constraints
- 

## Acceptance Criteria
- [ ] AC-1:
"""

    plan = f"""# Implementation Plan: {title}

## Tech & Modules
- 

## High-Level Steps
1) 

## Test Strategy
- 

## Risks / Mitigations
- 
"""

    tasks = f"""# Tasks: {title}

## Rules
- Number sequentially (T001, T002...)
- Include exact file paths
- Prefer tests before implementation

## Tasks
- T001: 
"""

    write(os.path.join(feature_dir, "spec.md"), spec)
    write(os.path.join(feature_dir, "plan.md"), plan)
    write(os.path.join(feature_dir, "tasks.md"), tasks)
    write(os.path.join(feature_dir, ".baseline", "spec.md"), spec)

    print(f"Created feature folder: {feature_dir}")
    print(f"- spec.md, plan.md, tasks.md, .baseline/spec.md")
    print(f"Slug: {slug}")


if __name__ == "__main__":
    main()
