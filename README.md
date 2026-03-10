# Video Cutter

**[English](#english) | [日本語](#japanese)**

---

<a name="english"></a>

## English

### Overview

Video Cutter is a free, browser-based video cutting and splitting tool powered by FFmpeg (WebAssembly). Place markers at any position in your video and download each segment individually. All processing happens entirely in your browser — no files are ever sent to a server.

### Features

- **Multiple markers** — Place as many markers as you need to split your video into segments
- **Fast processing** — Lossless copy-cut via FFmpeg WebAssembly (no re-encoding)
- **Privacy-first** — All processing is done locally in the browser; nothing is uploaded
- **Offline support** — Works without an internet connection after initial load
- **Responsive design** — Works on both desktop and mobile
- **Supported formats** — MP4, MOV, AVI, MKV, WebM (up to 2 GB)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Video Processing | FFmpeg WebAssembly (`@ffmpeg/ffmpeg`) |
| Deployment | Cloudflare Pages |

### Getting Started

#### Prerequisites

- Node.js 18+
- npm 9+

#### Installation

```bash
git clone https://github.com/your-username/video-cutter.git
cd video-cutter
npm install
```

#### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** The development server requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers for FFmpeg WebAssembly (SharedArrayBuffer). These are automatically set by `vite.config.js`.

#### Build

```bash
npm run build
```

Output is generated in the `dist/` directory.

#### Deploy to Cloudflare Pages

```bash
npm run deploy
```

The `public/_headers` file automatically sets the required COOP/COEP headers on Cloudflare Pages.

### How to Use

1. **Open a video** — Drag & drop a video file or click "ファイルを選択"
2. **Play the video** — Use the player controls or click the timeline to seek
3. **Add markers** — Click "マーカー追加" at the positions where you want to cut
4. **Preview segments** — Check the "セグメント" tab to see the split preview
5. **Export** — Click "分割してエクスポート" to process, then download each segment from the "ダウンロード" tab

### Project Structure

```
video-cutter/
├── public/
│   ├── ffmpeg/
│   │   ├── ffmpeg-core.js     # FFmpeg core (local)
│   │   └── ffmpeg-core.wasm   # FFmpeg WebAssembly binary (local)
│   ├── _headers               # Cloudflare Pages COOP/COEP headers
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── App.tsx                # Main application component
│   ├── App.css                # Styles
│   ├── HelpDialog.tsx         # Help dialog component
│   ├── HelpDialog.css
│   └── main.tsx               # Entry point
├── index.html
├── vite.config.js
└── tsconfig.json
```

### License

MIT

---

<a name="japanese"></a>

## 日本語

### 概要

Video Cutter は、FFmpeg（WebAssembly）を利用したブラウザ上で動作する無料の動画カット・分割ツールです。動画の任意の位置にマーカーを配置し、各セグメントを個別にダウンロードできます。すべての処理はブラウザ内で完結し、ファイルがサーバーに送信されることはありません。

### 特徴

- **複数マーカー対応** — マーカーをいくつでも追加して動画を分割
- **高速処理** — FFmpeg WebAssembly による無劣化コピーカット（再エンコード不要）
- **プライバシー保護** — すべての処理をブラウザ内で実施、アップロードなし
- **オフライン対応** — 初回読み込み後はインターネット接続不要
- **レスポンシブデザイン** — PC・スマートフォン両対応
- **対応形式** — MP4・MOV・AVI・MKV・WebM（最大 2GB）

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| UI フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 7 |
| 動画処理 | FFmpeg WebAssembly（`@ffmpeg/ffmpeg`）|
| デプロイ | Cloudflare Pages |

### セットアップ

#### 必要環境

- Node.js 18 以上
- npm 9 以上

#### インストール

```bash
git clone https://github.com/your-username/video-cutter.git
cd video-cutter
npm install
```

#### 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開いてください。

> FFmpeg WebAssembly（SharedArrayBuffer）の動作に `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` ヘッダーが必要です。`vite.config.js` により開発サーバーで自動設定されます。

#### ビルド

```bash
npm run build
```

`dist/` ディレクトリに成果物が生成されます。

#### Cloudflare Pages へのデプロイ

```bash
npm run deploy
```

`public/_headers` により、Cloudflare Pages 上でも COOP/COEP ヘッダーが自動付与されます。

### 使い方

1. **動画を開く** — 動画ファイルをドラッグ＆ドロップ、または「ファイルを選択」をクリック
2. **動画を再生** — プレイヤーのコントロールを操作、またはタイムラインをクリックしてシーク
3. **マーカーを追加** — カットしたい位置で「マーカー追加」をクリック
4. **セグメントを確認** — 「セグメント」タブで分割プレビューを確認
5. **エクスポート** — 「分割してエクスポート」で処理後、「ダウンロード」タブから各セグメントを保存

### ディレクトリ構成

```
video-cutter/
├── public/
│   ├── ffmpeg/
│   │   ├── ffmpeg-core.js     # FFmpeg コア（ローカル）
│   │   └── ffmpeg-core.wasm   # FFmpeg WebAssembly バイナリ（ローカル）
│   ├── _headers               # Cloudflare Pages 用 COOP/COEP ヘッダー設定
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── App.tsx                # メインコンポーネント
│   ├── App.css                # スタイル
│   ├── HelpDialog.tsx         # ヘルプダイアログ
│   ├── HelpDialog.css
│   └── main.tsx               # エントリポイント
├── index.html
├── vite.config.js
└── tsconfig.json
```

### ライセンス

MIT
