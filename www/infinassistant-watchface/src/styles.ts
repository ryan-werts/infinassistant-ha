/**
 * Shared styles for InfinAssistant Watch Face Card
 */

import { css } from 'lit';

export const sharedStyles = css`
  :host {
    display: block;
    --color-green: #00C853;
    --color-yellow: #FFD600;
    --color-red: #FF1744;
    --color-gray: #9E9E9E;
    --color-accent: #18A1FF;
    --color-white: #FFFFFF;
    --bg-charcoal: #1E1E1E;
    --bg-black: #000000;
  }

  .card-content {
    padding: 16px;
  }

  .validation-banner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .validation-banner.valid {
    background: rgba(0, 200, 83, 0.1);
    color: var(--color-green);
    border: 1px solid var(--color-green);
  }

  .validation-banner.invalid {
    background: rgba(255, 23, 68, 0.1);
    color: var(--color-red);
    border: 1px solid var(--color-red);
  }

  .validation-banner .icon {
    font-size: 18px;
  }

  .payload-size {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.7;
  }

  /*
   * With messages to list, the chevron is the button that lists them, and its ::after stretches
   * over the banner, so a tap anywhere on it toggles the list; the summary stays outside the
   * button, as the live region.
   */
  .validation-toggle {
    display: flex;
    align-items: center;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .validation-toggle::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 4px;
  }

  .validation-toggle:focus-visible {
    outline: none;
  }

  .validation-toggle:focus-visible::after {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .validation-chevron {
    font-size: 12px;
  }

  .validation-list {
    list-style: none;
    margin: -8px 0 12px;
    padding: 4px 0;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 240px;
    overflow-y: auto;
  }

  .validation-list[hidden] {
    display: none;
  }

  .validation-item {
    display: flex;
    gap: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--primary-text-color, #212121);
  }

  .validation-item-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .validation-item-where {
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    overflow-wrap: anywhere;
  }
`;

export const previewStyles = css`
  .watch-preview {
    width: 240px;
    height: 240px;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Roboto Mono', 'Courier New', monospace;
    position: relative;
    margin: 0 auto;
  }

  .watch-preview.charcoal {
    background: var(--bg-charcoal);
  }

  .watch-preview.black {
    background: var(--bg-black);
  }

  /* Header section */
  .watch-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 10px;
    height: 48px;
    box-sizing: border-box;
  }

  .watch-time {
    font-size: 48px;
    font-weight: bold;
    color: var(--color-white);
    line-height: 1;
  }

  .watch-time.align-left {
    text-align: left;
  }

  .watch-time.align-center {
    text-align: center;
    flex: 1;
  }

  .watch-time.align-right {
    text-align: right;
  }

  .presence-icons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 80px;
    justify-content: flex-end;
  }

  .presence-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .presence-icon svg {
    width: 12px;
    height: 12px;
  }

  /* Events section */
  .watch-events {
    padding: 2px 10px;
    font-size: 11px;
    color: var(--color-gray);
    height: 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.2;
  }

  .watch-events .event-row {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .watch-events .event-row.soon {
    color: var(--color-yellow);
  }

  /* Tiles grid */
  .watch-tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2px;
    padding: 2px;
    height: 118px;
  }

  .watch-tile {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px;
    overflow: hidden;
  }

  .tile-value {
    font-size: 22px;
    font-weight: bold;
    line-height: 1;
    text-align: center;
  }

  .tile-label {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--color-gray);
    margin-top: 2px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Actions row */
  .watch-actions {
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    height: 36px;
    justify-content: center;
  }

  .watch-action {
    flex: 1;
    max-width: 76px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }

  .watch-action:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .watch-action svg {
    width: 14px;
    height: 14px;
  }

  /* Status bar */
  .watch-status-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 4px 8px;
    height: 20px;
    font-size: 10px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .status-item svg {
    width: 12px;
    height: 12px;
  }

  /* Debug overlays */
  .debug-bounds .watch-tile,
  .debug-bounds .watch-action {
    outline: 1px dashed rgba(255, 255, 255, 0.3);
  }

  .debug-truncation .tile-label,
  .debug-truncation .tile-value {
    background: rgba(255, 0, 0, 0.2);
  }

  /* Copy and Push buttons */
  .copy-button,
  .push-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--primary-color, #03a9f4);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    margin-top: 12px;
    flex: 1;
    justify-content: center;
  }

  .copy-button:hover,
  .push-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .copy-button.copied,
  .push-button.success {
    background: var(--color-green);
  }

  .push-button.error {
    background: var(--color-red);
  }

  .push-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--disabled-color, #9e9e9e);
  }

  .push-error {
    color: var(--color-red);
    font-size: 12px;
    padding: 8px 16px;
    text-align: center;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
    margin: 8px 16px 0;
  }

  /* Dashboard screen layout (legacy) */
  .watch-dashboard {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 8px;
    height: 172px;
    overflow-y: auto;
  }

  /* A tile screen as the watch draws it (firmware 2.4.94; tile-preview.ts): 114 x 104 tiles
     with a 2 px frame, the name 16 px from the top and the state below it, 20 px bold mono. */
  .watch-tile-screen {
    position: relative;
    width: 240px;
    height: 240px;
    background: #000;
  }

  .watch-tile2 {
    position: absolute;
    box-sizing: border-box;
    width: 114px;
    height: 104px;
    border: 2px solid;
    border-radius: 10px;
    padding: 0 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 26px;
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    line-height: 23px;
    text-align: center;
    color: #fff;
    overflow: hidden;
  }

  /* A name that wraps: its lines and the state sit close, as on the watch. */
  .watch-tile2.tight {
    gap: 2px;
  }

  /* Wraps at spaces, then inside a word, up to the 3 lines the watch keeps. */
  .watch-tile2-name {
    width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
    max-height: 69px;
    overflow: hidden;
  }

  .watch-tile2-state {
    white-space: nowrap;
  }

  .watch-tile2-icon {
    --mdc-icon-size: 22px;
    color: #fff;
  }

  .watch-screen-indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    text-align: center;
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    line-height: 23px;
    color: #606060;
  }

  /* The arrows under the preview: one screen at a time, as a swipe on the watch. */
  .preview-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 6px;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .preview-nav button {
    width: 28px;
    height: 24px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }

  .preview-nav button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  /*
   * The dashboard as the watch draws it (firmware 2.4.98, "dashboard v8"; dashboard-preview.ts):
   * the text, pills, bar and rule in an SVG of the watch's 240 x 240 pixels, placed by baseline;
   * the icons over it at their boxes. The fonts are the nearest a browser has to the watch's: a
   * thin monospace for the time (JetBrains Mono Light 76), a small sans for the rest (Montserrat
   * Medium 14 and 18), a bold monospace for the freezer text (JetBrains Mono Bold 20).
   */
  .watch-dash8 {
    position: relative;
    width: 240px;
    height: 240px;
    background: #000;
    overflow: hidden;
  }

  .watch-dash8 svg {
    position: absolute;
    left: 0;
    top: 0;
  }

  .watch-dash8 .m14,
  .watch-dash8 .m18 {
    font-family: Montserrat, Roboto, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
    font-weight: 500;
  }

  .watch-dash8 .m14 {
    font-size: 14px;
  }

  .watch-dash8 .m18 {
    font-size: 18px;
  }

  .watch-dash8 .time {
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace;
    font-size: 76px;
    font-weight: 300;
  }

  .watch-dash8 .bold {
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace;
    font-size: 20px;
    font-weight: bold;
  }

  /*
   * The watch's 20 px icons (Font Awesome in JetBrains Mono Bold 20), grey unless told. An MDI
   * icon keeps about 2 px clear inside its 24 px square, so a 24 px one, 2 px up and left of the
   * watch's box, draws a glyph of the watch's size in its place.
   */
  .dash8-icon {
    position: absolute;
    display: block;
    width: 24px;
    height: 24px;
    margin: -2px 0 0 -2px;
    line-height: 0;
    --mdc-icon-size: 24px;
    color: #8E8E93;
  }

  /* The weather icon (Font Awesome 25), right-aligned to x 180. */
  .dash8-icon.dash8-weather {
    width: 28px;
    height: 28px;
    margin: -2px 0 0 -1px;
    --mdc-icon-size: 28px;
    color: #E5E5EA;
  }

  /* MDI's batteries stand up; the watch's lies down, its tip to the right. */
  .dash8-icon.dash8-battery {
    transform: rotate(90deg);
  }

  /* Over the freezer bar, for its tooltip. */
  .dash8-freezer {
    position: absolute;
    left: 0;
    top: 175px;
    width: 240px;
    height: 20px;
  }
`;

export const editorStyles = css`
  :host {
    display: block;
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  /* Tabs */
  .tabs-header {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .tab-button {
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    white-space: nowrap;
    position: relative;
  }

  .tab-button.active {
    color: var(--primary-color, #03a9f4);
    border-bottom-color: var(--primary-color, #03a9f4);
  }

  .tab-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .tab-badge.error {
    background: var(--color-red);
    color: white;
  }

  .tab-badge.warning {
    background: var(--color-yellow);
    color: black;
  }

  /* Tab content */
  .tab-content {
    padding: 8px 0;
  }

  /* Form sections */
  .form-section {
    margin-bottom: 24px;
  }

  .form-section-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--primary-text-color, #212121);
  }

  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;
  }

  .form-row.column {
    flex-direction: column;
    align-items: stretch;
  }

  .form-field {
    flex: 1;
    min-width: 0;
  }

  .form-field label {
    display: block;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    margin-bottom: 4px;
  }

  .form-field input,
  .form-field select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-size: 14px;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }

  /* Toggle switch */
  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .toggle-label {
    font-size: 14px;
  }

  /* Reorderable list */
  .reorderable-list {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    overflow: hidden;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--card-background-color, white);
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .list-item:last-child {
    border-bottom: none;
  }

  .list-item.dragging {
    opacity: 0.5;
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  .drag-handle {
    cursor: grab;
    color: var(--secondary-text-color, #757575);
  }

  .list-item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .list-item-actions {
    display: flex;
    gap: 4px;
  }

  .list-item-actions button {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--secondary-text-color, #757575);
  }

  .list-item-actions button:hover {
    color: var(--primary-text-color, #212121);
  }

  .add-item-button {
    width: 100%;
    padding: 8px;
    background: none;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
    color: var(--secondary-text-color, #757575);
    margin-top: 8px;
  }

  .add-item-button:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  /* Validation messages */
  .validation-messages {
    margin-top: 8px;
  }

  .validation-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .validation-message.error {
    background: rgba(255, 23, 68, 0.1);
    color: var(--color-red);
  }

  .validation-message.warning {
    background: rgba(255, 214, 0, 0.1);
    color: #f57f17;
  }

  .validation-message.info {
    background: rgba(24, 161, 255, 0.1);
    color: var(--color-accent);
  }

  /* Simulator controls */
  .simulator-panel {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 4px;
    padding: 12px;
    margin-top: 12px;
  }

  .simulator-title {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--secondary-text-color, #757575);
  }

  .simulator-controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .simulator-control {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .simulator-control label {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .simulator-control select,
  .simulator-control input {
    padding: 4px;
    font-size: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 2px;
  }

  /* Grid editor for tiles */
  .tiles-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .tile-slot {
    aspect-ratio: 1;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 4px;
  }

  .tile-slot:hover {
    border-color: var(--primary-color, #03a9f4);
    background: rgba(3, 169, 244, 0.05);
  }

  .tile-slot.active {
    border-color: var(--primary-color, #03a9f4);
    border-style: solid;
    background: rgba(3, 169, 244, 0.1);
  }

  .tile-slot.configured {
    border-style: solid;
    border-color: var(--divider-color, #e0e0e0);
    background: var(--card-background-color, white);
  }

  .tile-slot-number {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .tile-slot-label {
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Searchable entity select */
  .searchable-select {
    position: relative;
    width: 100%;
  }

  .searchable-select input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
  }

  .entity-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    margin-top: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .entity-option {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .entity-option:last-child {
    border-bottom: none;
  }

  .entity-option:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .entity-option.selected {
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  .entity-option .entity-name {
    font-size: 12px;
    font-weight: 500;
    font-family: monospace;
  }

  .entity-option .entity-friendly {
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .entity-option.selected .entity-friendly {
    color: rgba(255, 255, 255, 0.8);
  }

  .entity-option-info {
    padding: 8px 12px;
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    font-style: italic;
  }

  .device-filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  /* Icon picker */
  .icon-picker-container {
    position: relative;
    display: inline-block;
  }

  .icon-picker-button {
    width: 50px;
    height: 36px;
    font-size: 20px;
    text-align: center;
    cursor: pointer;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: var(--card-background-color, white);
    transition: background 0.2s;
  }

  .icon-picker-button:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .icon-picker-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 2000;
    margin-top: 4px;
    background: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 320px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .icon-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    font-weight: 500;
    font-size: 14px;
  }

  .icon-picker-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .icon-picker-close:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .icon-picker-content {
    overflow-y: auto;
    max-height: 340px;
    padding: 8px;
  }

  .icon-category {
    margin-bottom: 16px;
  }

  .icon-category-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--secondary-text-color, #757575);
    text-transform: uppercase;
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .icon-option {
    width: 100%;
    aspect-ratio: 1;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: var(--card-background-color, white);
    transition: all 0.2s;
  }

  .icon-option:hover {
    background: var(--secondary-background-color, #f5f5f5);
    transform: scale(1.1);
  }

  .icon-option.selected {
    background: var(--primary-color, #03a9f4);
    color: white;
    border-color: var(--primary-color, #03a9f4);
  }

  /* Load error banner (L3 fix) */
  .load-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 23, 68, 0.1);
    border: 1px solid var(--color-red, #FF1744);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .load-error-banner .error-icon {
    font-size: 16px;
  }

  .load-error-banner .error-message {
    flex: 1;
    font-size: 13px;
    color: var(--color-red, #FF1744);
  }

  .load-error-banner .retry-button {
    padding: 6px 12px;
    background: var(--color-red, #FF1744);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .load-error-banner .retry-button:hover {
    opacity: 0.9;
  }
`;
