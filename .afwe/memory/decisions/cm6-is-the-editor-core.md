---
id: cm6-is-the-editor-core
kind: decision
title: CM6 is the editor core
status: accepted
applies_to:
- editor
files:
- src/lib/editor/**
tags:
- editor
- cm6
origin: llm:deepseek
created: 2026-11-02
---

Replace the textarea mirror stack with a full-featured, curated CodeMirror 6 editor. Preserve every current editor feature and keep the Markdown document as the source of truth.