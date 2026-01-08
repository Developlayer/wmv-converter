import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { ConversionSettings, FileInfo, ProgressInfo, ConversionResult } from '../shared/types';

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
  startConversion: (files: FileInfo[], outputDir: string, settings: ConversionSettings): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_CONVERSION, files, outputDir, settings);
  },

  // 変換キャンセル
  cancelConversion: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_CONVERSION);
  },

  // 設定取得
  getSettings: (): Promise<ConversionSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },

  // 設定保存
  saveSettings: (settings: ConversionSettings): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings);
  },

  // 進捗イベントリスナー
  onProgress: (callback: (progress: ProgressInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ProgressInfo) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.CONVERSION_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERSION_PROGRESS, listener);
  },

  // 変換完了イベントリスナー
  onComplete: (callback: (result: ConversionResult) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: ConversionResult) => callback(result);
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
