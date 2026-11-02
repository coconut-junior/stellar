interface ElectronAPI {
  sendMessage: (message: string) => void;
  onResponse: (callback: (response: string) => void) => void;
}

declare interface Window {
  electronAPI: ElectronAPI;
}
