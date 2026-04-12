# Seat Manager

フリーアドレスオフィスの席管理アプリ。空席をリアルタイムで確認し、QR コードで着席・退席を記録する。

## 技術スタック

- **Frontend:** React + TypeScript (Vite) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Hosting:** Cloudflare Workers
- **Local Dev:** Docker + Supabase CLI

## 機能

- フロアマップで空席をリアルタイム確認
- QR コードで着席・退席
- 席の予約（日付 + 30分刻み時間指定）
- 予約の自動取り消し（30分経過 + 未着席）
- タイムテーブル（ガントチャート風予約一覧）
- 管理画面（席の追加・削除・QR 生成・レイアウト編集・ユーザー権限管理）
- Google OAuth ログイン
- 毎日0時の全席自動リセット

## セットアップ

### 必要なもの

- Node.js
- Docker Desktop
- Supabase アカウント
- GCP プロジェクト（Google OAuth 用）

### ローカル開発

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local に Supabase のローカル URL と Anon Key を記入

# Google OAuth の設定
cp supabase/.env.example supabase/.env
# supabase/.env に GCP の Client ID と Secret を記入

# 開発サーバー起動（Supabase + Vite）
npm run dev

# 停止
npm run dev:stop
```

### 環境変数

| 変数名 | 用途 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase の接続先 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase の Anon Key |

### スクリプト

| コマンド | 動作 |
|---------|------|
| `npm run dev` | Supabase + Vite を起動 |
| `npm run dev:vite` | Vite だけ起動 |
| `npm run dev:stop` | 全部停止 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |

## デプロイ

`main` ブランチに push すると Cloudflare Workers に自動デプロイされる。

## ライセンス

Private
