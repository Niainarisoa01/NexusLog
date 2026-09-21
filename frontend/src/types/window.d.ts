export {};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    resetApp?: () => void;
    testIPC?: () => Promise<unknown>;
    injectMockData?: () => void;
  }
}
