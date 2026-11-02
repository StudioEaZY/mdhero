---
id: undo-is-per-document-and-consistently-grouped
kind: decision
title: Undo is per-document and consistently grouped
status: accepted
applies_to:
- editor
files:
- src/lib/editor/**
tags:
- undo
- editor
origin: llm:deepseek
created: 2026-11-02
---

Undo state lives with each document's EditorState and survives tab switches. Grouping uses fixed, predictable pauses and command boundaries, not adaptive smart grouping. History is bounded by memory, not an arbitrary 100-step cap.