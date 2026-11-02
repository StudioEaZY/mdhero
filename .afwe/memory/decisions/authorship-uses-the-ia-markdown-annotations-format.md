---
id: authorship-uses-the-ia-markdown-annotations-format
kind: decision
title: Authorship uses the iA Markdown Annotations format
status: accepted
applies_to:
- authorship
files:
- src/lib/authorship/**
tags:
- authorship
- ia
origin: llm:deepseek
created: 2026-11-02
---

Authorship is manual and local. Store authors and grapheme ranges at the end of the Markdown file in the open Markdown Annotations format so files interoperate with iA Writer. Strip annotations from export. No AI detection or network calls.