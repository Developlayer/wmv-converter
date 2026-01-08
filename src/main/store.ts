import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { ConversionSettings } from '../shared/types';

const CONFIG_FILE_NAME = 'settings.json';

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, CONFIG_FILE_NAME);
}

export function getSettings(): ConversionSettings {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ConversionSettings): void {
  try {
    const configPath = getConfigPath();
    const userDataPath = path.dirname(configPath);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    throw error;
  }
}
