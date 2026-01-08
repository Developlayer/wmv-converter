import { contextBridge, ipcRenderer } from 'electron';

// IPC チャンネル名（外部インポートを避けるため直接定義）
const IPC_CHANNELS = {
  SELECT_FILES: 'select-files',
  SELECT_OUTPUT_DIR: 'select-output-dir',
  START_CONVERSION: 'start-conversion',
  CANCEL_CONVERSION: 'cancel-conversion',
  CONVERSION_PROGRESS: 'conversion-progress',
  CONVERSION_COMPLETE: 'conversion-complete',
  CONVERSION_ERROR: 'conversion-error',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
} as const;

// レンダラープロセスに公開するAPI
const electronAPI = {
  // ファイル選択ダイアログ
  selectFiles: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILES);
  },

  // 出力ディレクトリ選択ダイアログ
  selectOutputDir: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT_DIR);
  },

  // 変換開始
  startConversion: (files: unknown[], outputDir: string, settings: unknown): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_CONVERSION, files, outputDir, settings);
  },

  // 変換キャンセル
  cancelConversion: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_CONVERSION);
  },

  // 設定取得
  getSettings: (): Promise<unknown> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },

  // 設定保存
  saveSettings: (settings: unknown): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings);
  },

  // 進捗イベントリスナー
  onProgress: (callback: (progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.CONVERSION_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERSION_PROGRESS, listener);
  },

  // 変換完了イベントリスナー
  onComplete: (callback: (result: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: unknown) => callback(result);
    ipcRenderer.on(IPC_CHANNELS.CONVERSION_COMPLETE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERSION_COMPLETE, listener);
  },

  // エラーイベントリスナー
  onError: (callback: (error: { fileId: string; error: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: { fileId: string; error: string }) => callback(error);
    ipcRenderer.on(IPC_CHANNELS.CONVERSION_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERSION_ERROR, listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 型定義のエクスポート
export type ElectronAPI = typeof electronAPI;
