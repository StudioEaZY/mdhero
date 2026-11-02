---
id: afwe-materialize-panics-on-reborn-2017fca
kind: problem
title: AFWE materialize panics on ReBorn 2017fca
status: open
origin: llm:deepseek
created: 2026-11-02
---

afwe materialize fails at startup with clap duplicate --claude-hooks (agent_hooks alias + claude_hooks). CI currently skips materialize and uses gate/sync. Upstream fix required before restoring it.