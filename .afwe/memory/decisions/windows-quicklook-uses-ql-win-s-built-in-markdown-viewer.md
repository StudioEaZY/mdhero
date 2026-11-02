---
id: windows-quicklook-uses-ql-win-s-built-in-markdown-viewer
kind: decision
title: Windows QuickLook uses ql-win's built-in Markdown viewer
status: accepted
applies_to:
- preview
files:
- src/lib/renderer/**
tags:
- quicklook
- windows
- preview
origin: llm:deepseek
created: 2026-11-02
---

ql-win/QuickLook already renders Markdown. Do not build a plugin and do not touch ql-win. macOS Quick Look remains the existing .appex and must keep sharing the renderer pipeline.