export class ReaderPopover {
  constructor(onClose) {
    this.onClose = onClose;
    this.element = document.createElement("dialog");
    this.element.id = "reader-popover";
    this.element.setAttribute("aria-live", "polite");
    document.body.append(this.element);
    this.version = 0;
    this.element.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    document.addEventListener("click", (event) => {
      if (!this.element.open || this.element.contains(event.target)) return;
      if (event.target.closest("[data-word],[data-sentence-translate]")) return;
      this.close();
    });
    document.addEventListener("scroll", () => this.position(), { capture: true, passive: true });
    window.addEventListener("resize", () => this.position());
    window.visualViewport?.addEventListener("resize", () => this.position());
  }
  show(anchor, html, kind = "word-popover", label = "词义") {
    this.version++;
    this.anchor = anchor;
    this.element.className = "reader-popover " + kind;
    this.element.setAttribute("aria-label", label);
    this.element.innerHTML = html;
    this.element.style.visibility = "hidden";
    if (!this.element.open) this.element.show();
    this.position();
    this.element.style.visibility = "visible";
    return this.version;
  }
  position() {
    if (!this.element.open || !this.anchor?.isConnected) return;
    const viewport = window.visualViewport;
    const width = viewport?.width || document.documentElement.clientWidth;
    const height = viewport?.height || window.innerHeight;
    const originX = viewport?.offsetLeft || 0;
    const originY = viewport?.offsetTop || 0;
    const padding = 12;
    this.element.style.maxWidth = Math.min(340, width - padding * 2) + "px";
    this.element.style.maxHeight = Math.max(120, height - padding * 2) + "px";
    const anchor = this.anchor.getBoundingClientRect();
    const box = this.element.getBoundingClientRect();
    const left = Math.max(originX + padding, Math.min(anchor.left + anchor.width / 2 - box.width / 2, originX + width - box.width - padding));
    const below = anchor.bottom + 10;
    const top = below + box.height <= originY + height - padding
      ? below
      : Math.max(originY + padding, anchor.top - box.height - 10);
    this.element.style.left = left + "px";
    this.element.style.top = Math.min(top, originY + height - box.height - padding) + "px";
    this.element.style.setProperty("--anchor-x", Math.max(16, Math.min(box.width - 16, anchor.left + anchor.width / 2 - left)) + "px");
  }
  close(notify = true) {
    if (!this.element.open) return;
    this.version++;
    this.element.close();
    this.anchor?.setAttribute("aria-expanded", "false");
    if (notify) this.onClose?.();
  }
}
