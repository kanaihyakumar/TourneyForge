import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ToastService, ToastTone } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  async copy(
    text: string,
    successMessage = 'Copied to clipboard!',
    tone: ToastTone = 'dark',
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.show(successMessage, tone);
    } catch {
      this.copyWithFallback(text, successMessage, tone);
    }
  }

  private copyWithFallback(text: string, successMessage: string, tone: ToastTone): void {
    try {
      const area = this.document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      this.document.body.appendChild(area);
      area.select();
      this.document.execCommand('copy');
      this.document.body.removeChild(area);
      this.toast.show(successMessage, tone);
    } catch {
      this.toast.show('Copy failed - please copy manually.', tone);
    }
  }
}
