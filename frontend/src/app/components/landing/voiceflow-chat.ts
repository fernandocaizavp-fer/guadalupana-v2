import { afterNextRender, Component, OnDestroy } from '@angular/core';

interface VoiceflowChatApi {
  load(config: {
    verify: { projectID: string };
    url: string;
    voice: { url: string };
  }): void | Promise<void>;
  destroy(): void | Promise<void>;
}

type VoiceflowWindow = Window & { voiceflow?: { chat: VoiceflowChatApi } };
let sdkReady: Promise<VoiceflowChatApi> | undefined;
// Serializa la carga y la limpieza cuando se cambia de ruta rapidamente.
let widgetQueue = Promise.resolve();

function loadSdk(): Promise<VoiceflowChatApi> {
  const browser = window as VoiceflowWindow;
  if (browser.voiceflow?.chat) return Promise.resolve(browser.voiceflow.chat);
  if (sdkReady) return sdkReady;

  const script = document.createElement('script');
  script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  script.type = 'text/javascript';
  script.async = true;
  sdkReady = new Promise<VoiceflowChatApi>((resolve, reject) => {
    script.onload = () => {
      if (browser.voiceflow?.chat) resolve(browser.voiceflow.chat);
      else reject(new Error('Voiceflow no registro su API.'));
    };
    script.onerror = () => reject(new Error('No se pudo descargar el widget de Voiceflow.'));
    document.head.appendChild(script);
  }).catch((error) => {
    script.remove();
    sdkReady = undefined;
    throw error;
  });
  return sdkReady;
}

@Component({
  selector: 'app-voiceflow-chat',
  template: '',
})
export class VoiceflowChat implements OnDestroy {
  private destroyed = false;
  private chat?: VoiceflowChatApi;

  constructor() {
    afterNextRender(() => {
      widgetQueue = widgetQueue.then(async () => {
        if (this.destroyed) return;
        const chat = await loadSdk();
        if (this.destroyed) return;
        this.chat = chat;
        await chat.load({
          verify: { projectID: '6ab894ab6920e1782997de07' },
          url: 'https://general-runtime.voiceflow.com',
          voice: { url: 'https://runtime-api.voiceflow.com' },
        });
      }).catch(async (error) => {
        console.warn('No se pudo iniciar el chatbot de Voiceflow.', error);
        await this.removeChat();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    widgetQueue = widgetQueue.then(() => this.removeChat());
  }

  private async removeChat(): Promise<void> {
    try {
      await this.chat?.destroy();
    } catch (error) {
      console.warn('No se pudo cerrar el chatbot de Voiceflow.', error);
    } finally {
      this.chat = undefined;
    }
  }
}
