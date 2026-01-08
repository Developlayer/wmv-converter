import { ipcMain, dialog, Notification, BrowserWindow, shell } from 'electron';
import { IPC_CHANNELS, SUPPORTED_EXTENSIONS } from '../shared/types';
import type { ConversionSettings, FileInfo } from '../shared/types';
import { convertToWmv, cancelConversion } from './ffmpeg';
import { getSettings, saveSettings } from './store';

// メインウィンドウを取得する（フォーカスに依存しない）
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

export function setupIpcHandlers() {
  // ファイル選択ダイアログ
  ipcMain.handle(IPC_CHANNELS.SELECT_FILES, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: '動画ファイル',
          extensions: SUPPORTED_EXTENSIONS.map((ext) => ext.slice(1)), // ドットを除去
        },
      ],
    });

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  // 出力ディレクトリ選択ダイアログ
  ipcMain.handle(IPC_CHANNELS.SELECT_OUTPUT_DIR, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  // 変換開始
  ipcMain.handle(
    IPC_CHANNELS.START_CONVERSION,
    async (_event, files: FileInfo[], outputDir: string, settings: ConversionSettings) => {
      const window = getMainWindow();

      for (const file of files) {
        try {
          const result = await convertToWmv(file, outputDir, settings, (progress) => {
            window?.webContents.send(IPC_CHANNELS.CONVERSION_PROGRESS, {
              fileId: file.id,
              progress: progress.percent,
              currentTime: progress.currentTime,
              duration: progress.duration,
            });
          });

          window?.webContents.send(IPC_CHANNELS.CONVERSION_COMPLETE, result);

          // 通知を表示
          if (settings.showNotification && result.success) {
            new Notification({
              title: '変換完了',
              body: `${file.name} の変換が完了しました`,
            }).show();
          }

          // 元ファイルをゴミ箱に移動
          if (settings.moveToTrashAfterConversion && result.success) {
            try {
              await shell.trashItem(file.path);
            } catch (trashError) {
              console.error('元ファイルのゴミ箱移動に失敗しました:', trashError);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
          window?.webContents.send(IPC_CHANNELS.CONVERSION_ERROR, {
            fileId: file.id,
            error: errorMessage,
          });
        }
      }
    }
  );

  // 変換キャンセル
  ipcMain.handle(IPC_CHANNELS.CANCEL_CONVERSION, async () => {
    cancelConversion();
  });

  // 設定取得
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return getSettings();
  });

  // 設定保存
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, settings: ConversionSettings) => {
    saveSettings(settings);
  });
}
