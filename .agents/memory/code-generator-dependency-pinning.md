---
name: Code generator dependency pinning
description: Why code generators should remain exact-pinned when transitive security patches are available.
---

Keep code generators exact-pinned when a newer compatible-range release changes generated output or project type requirements; apply narrowly scoped transitive security overrides when they resolve the advisory without changing generator behavior.

**Why:** A fresh dependency resolution within a caret range selected a newer generator release whose output required different TypeScript library settings, while the vulnerable transitive parser package could be patched independently.

**How to apply:** For generator dependency security work, regenerate and typecheck outputs before accepting a generator upgrade. If behavior changes unexpectedly and the advisory is transitive, retain the known-compatible generator and override only the patched transitive package.