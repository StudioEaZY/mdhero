<script lang="ts">
  import { settings } from "$lib/stores/settings";
  import { t, translate } from "$lib/i18n";
  import { MOD } from "$lib/utils/platform";

  let { visible = $bindable(false), onEnable, onCancel }: {
    visible: boolean;
    onEnable?: () => void;
    onCancel?: () => void;
  } = $props();

  function handleEnable() {
    settings.update((s) => ({
      ...s,
      authorshipEnabled: true,
      authorshipPromptSeen: true,
    }));
    visible = false;
    onEnable?.();
  }

  function handleDontAskAgain() {
    settings.update((s) => ({
      ...s,
      authorshipEnabled: false,
      authorshipPromptSeen: true,
    }));
    visible = false;
    onCancel?.();
  }

  function handleCancel() {
    visible = false;
    onCancel?.();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      handleCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleCancel}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <h2 class="modal-title">{$t('authorship.modalTitle') || 'Enable Authorship Tracking?'}</h2>
        </div>
        <button class="modal-close" onclick={handleCancel} title="Close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="3" y1="3" x2="11" y2="11"/>
            <line x1="11" y1="3" x2="3" y2="11"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">
          {$t('authorship.modalDesc') ||
            'Track what you write versus AI assistance or external contributions. Authorship data is saved cleanly at the bottom of the Markdown file—hidden while editing in MDHero, but remaining visible and fully compatible in other Markdown apps.'}
        </p>

        <div class="quote-card">
          <p class="quote-text">
            “Who wrote what? Your own words speak in black and white. AI stands out in color. Other authors show in subtle tones.”
          </p>
          <span class="quote-attr">— iA Writer</span>
        </div>

        <div class="features-list">
          <div class="feature-item">
            <span class="feature-bullet ai-bullet"></span>
            <span><strong>Automatic AI Detection:</strong> Pastes from ChatGPT, Claude, Gemini, Copilot, and OS writing tools are automatically tagged.</span>
          </div>
          <div class="feature-item">
            <span class="feature-bullet pill-bullet"></span>
            <span><strong>"Paste As" Quick Toggle:</strong> A non-intrusive pill allows 1-click reattribution if you pasted your own reference text.</span>
          </div>
          <div class="feature-item">
            <span class="feature-bullet other-bullet"></span>
            <span><strong>External Edit Safety:</strong> Detects outside edits from other software like Obsidian or VS Code without corrupting files.</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-subtle" onclick={handleDontAskAgain}>
          {$t('authorship.dontAskAgain') || "Don't Ask Again"}
        </button>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={handleCancel}>
            {$t('common.cancel') || 'Cancel'}
          </button>
          <button class="btn-primary" onclick={handleEnable}>
            {$t('authorship.enable') || 'Enable Authorship'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .modal {
    width: 520px;
    max-width: 90vw;
    background: white;
    border: 1px solid #e5e5ea;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :global(html.dark) .modal {
    background: #242426;
    border-color: #38383a;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e5ea;
  }

  :global(html.dark) .modal-header {
    border-bottom-color: #38383a;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(8, 145, 178, 0.1);
    color: #0891b2;
  }

  :global(html.dark) .header-icon {
    background: rgba(34, 211, 238, 0.15);
    color: #22d3ee;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 600;
    color: #1c1c1e;
    margin: 0;
  }

  :global(html.dark) .modal-title {
    color: #f2f2f7;
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    color: #8e8e93;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .modal-close:hover {
    background: #f2f2f7;
    color: #1c1c1e;
  }

  :global(html.dark) .modal-close:hover {
    background: #38383a;
    color: #f2f2f7;
  }

  .modal-body {
    padding: 20px;
    font-size: 13px;
    line-height: 1.55;
    color: #3a3a3c;
  }

  :global(html.dark) .modal-body {
    color: #c7c7cc;
  }

  .modal-desc {
    margin: 0 0 16px;
  }

  .quote-card {
    background: #f5f5f7;
    border-left: 3px solid #0891b2;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 16px;
  }

  :global(html.dark) .quote-card {
    background: #1c1c1e;
    border-left-color: #22d3ee;
  }

  .quote-text {
    margin: 0 0 4px;
    font-style: italic;
    font-size: 12px;
    line-height: 1.45;
    color: #636366;
  }

  :global(html.dark) .quote-text {
    color: #a1a1a6;
  }

  .quote-attr {
    font-size: 11px;
    font-weight: 500;
    color: #8e8e93;
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .feature-bullet {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .ai-bullet {
    background: #0891b2;
  }

  .pill-bullet {
    background: #10b981;
  }

  .other-bullet {
    background: #8b5cf6;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: #fafafa;
    border-top: 1px solid #e5e5ea;
  }

  :global(html.dark) .modal-footer {
    background: #1e1e20;
    border-top-color: #38383a;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
  }

  .btn-subtle {
    padding: 6px 12px;
    font-size: 12px;
    color: #8e8e93;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 6px;
    transition: color 0.15s;
  }

  .btn-subtle:hover {
    color: #636366;
    text-decoration: underline;
  }

  :global(html.dark) .btn-subtle:hover {
    color: #aeaeb2;
  }

  .btn-cancel {
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 500;
    background: none;
    border: 1px solid #e5e5ea;
    border-radius: 7px;
    color: #636366;
    cursor: pointer;
    transition: background 0.15s;
  }

  :global(html.dark) .btn-cancel {
    border-color: #38383a;
    color: #aeaeb2;
  }

  .btn-cancel:hover {
    background: #f2f2f7;
  }

  :global(html.dark) .btn-cancel:hover {
    background: #2c2c2e;
  }

  .btn-primary {
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
    background: #0891b2;
    color: white;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: #0e7490;
  }
</style>
