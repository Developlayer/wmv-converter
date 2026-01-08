# WMV Converter

動画ファイルをWMV形式に変換するデスクトップアプリケーション

---

## 重要な注意事項

### AI開発について

このアプリケーションは **Claude Code（AI）によって開発** されました。人間による十分な検証・テストは行われていません。

### 免責事項

- 本ソフトウェアは **「現状のまま」** 提供されます
- **開発者および公開者は、本ソフトウェアの使用によって生じたいかなる損害についても一切の責任を負いません**
- 本ソフトウェアの使用は **完全に自己責任** で行ってください
- 重要なファイルを変換する前に、必ずバックアップを取ることを推奨します
- 商用利用や業務での使用は推奨しません

### 使用上の注意

- 変換元のファイルは自動的に削除されません（設定で変更可能）
- 大容量ファイルの変換には時間がかかる場合があります
- 変換品質は設定により異なります

---

## 機能

- ドラッグ&ドロップでファイル選択
- 複数ファイルの一括変換
- 変換進捗のリアルタイム表示
- 変換設定のカスタマイズ（コーデック、解像度、フレームレート、ビットレート）
- 変換完了時のシステム通知

## 対応入力形式

- MP4 (.mp4)
- MOV (.mov)
- AVI (.avi)
- MKV (.mkv)
- WebM (.webm)
- FLV (.flv)
- WMV (.wmv)

## 対応OS

- macOS (Intel / Apple Silicon)
- Windows

---

## 開発者向け情報

### 必要条件

- Node.js 18以上
- npm

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### ビルド

```bash
# アプリのビルド
npm run build

# macOS用パッケージの作成
npm run dist:mac

# Windows用パッケージの作成
npm run dist:win
```

---

## サードパーティライセンス

### FFmpeg

本ソフトウェアは動画変換に **FFmpeg** を使用しています。

- **ライセンス**: GNU Lesser General Public License (LGPL) version 2.1 以降
- **公式サイト**: https://ffmpeg.org/
- **ライセンス詳細**: https://ffmpeg.org/legal.html

FFmpegバイナリの取得先:
- macOS: [evermeet.cx](https://evermeet.cx/ffmpeg/) (Intel版、Apple SiliconではRosetta 2経由で動作)
- Windows: [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)

> This software uses code of [FFmpeg](https://ffmpeg.org/) licensed under the [LGPLv2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).

---

## ライセンス

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
