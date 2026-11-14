<script lang="ts">
  import { lastPasted, reattributeRange, clearLastPasted } from "$lib/stores/authorship";
  import type { AuthorType } from "$lib/authorship/types";

  function handleSetAuthor(author: AuthorType) {
    if (!$lastPasted) return;
    reattributeRange($lastPasted.tabId, $lastPasted.from, $lastPasted.to, author);
    clearLastPasted();
  }
</script>

{#if $lastPasted}
  <div class="paste-as-container" role="region" aria-label="Paste attribution selector">
    <div class="paste-as-pill">
      <span class="paste-label">
        {#if $lastPasted.source}
          {$lastPasted.source}
        {:else}
          Pasted
        {/if}
      </span>

      <span class="divider"></span>

      <button
        class="author-btn"
        class:active={$lastPasted.author === "ai"}
        onclick={() => handleSetAuthor("ai")}
        title="Attributed to AI"
      >
        <span class="dot ai-dot"></span>
        AI
      </button>

      <button
        class="author-btn"
        class:active={$lastPasted.author === "you"}
        onclick={() => handleSetAuthor("you")}
        title="Attributed to You (Human)"
      >
        <span class="dot you-dot"></span>
        You
      </button>

      <button
        class="author-btn"
        class:active={$lastPasted.author === "other"}
        onclick={() => handleSetAuthor("other")}
        title="Attributed to Other / External"
      >
        <span class="dot other-dot"></span>
        Other
      </button>

      <button class="close-btn" onclick={clearLastPasted} title="Dismiss" aria-label="Dismiss">
        &times;
      </button>
    </div>
  </div>
{/if}

<style>
  .paste-as-container {
    position: fixed;
    bottom: 42px;
    right: 24px;
    z-index: 60;
    animation: fadeInSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeInSlideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .paste-as-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid #e5e5ea;
    border-radius: 20px;
    padding: 3px 6px 3px 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05);
    font-size: 11px;
    color: #1c1c1e;
  }

  :global(html.dark) .paste-as-pill {
    background: rgba(36, 36, 38, 0.95);
    border-color: #38383a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    color: #f2f2f7;
  }

  .paste-label {
    font-weight: 600;
    color: #636366;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding-right: 2px;
  }

  :global(html.dark) .paste-label {
    color: #aeaeb2;
  }

  .divider {
    width: 1px;
    height: 12px;
    background: #e5e5ea;
    margin: 0 2px;
  }

  :global(html.dark) .divider {
    background: #38383a;
  }

  .author-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #636366;
    background: none;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  :global(html.dark) .author-btn {
    color: #aeaeb2;
  }

  .author-btn:hover {
    background: #f2f2f7;
    color: #1c1c1e;
  }

  :global(html.dark) .author-btn:hover {
    background: #38383a;
    color: #f2f2f7;
  }

  .author-btn.active {
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 600;
  }

  :global(html.dark) .author-btn.active {
    background: rgba(34, 211, 238, 0.2);
    color: #38bdf8;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .ai-dot {
    background: #0891b2;
  }

  .you-dot {
    background: #10b981;
  }

  .other-dot {
    background: #8b5cf6;
  }

  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 13px;
    color: #8e8e93;
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    margin-left: 2px;
  }

  .close-btn:hover {
    background: #e5e5ea;
    color: #1c1c1e;
  }

  :global(html.dark) .close-btn:hover {
    background: #48484a;
    color: #f2f2f7;
  }
</style>
