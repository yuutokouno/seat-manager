# 出社検知・可視化機能 設計ドキュメント

## 要件まとめ

| # | 要件 | 詳細 |
|---|------|------|
| 1 | **出社検知** | オフィスのWi-Fiに繋がっていたら「出社している」とみなす |
| 2 | **出社記録** | 誰がいつ来たか日単位でDBに保存する |
| 3 | **草グラフ** | GitHubの草のように出社カレンダーを可視化する |
| 4 | **出社ランキング** | 週間・月間の出社回数を人別にランキング表示する |
| 5 | **連続出社日数** | 平日連続出社日数を計算する（週末は来ても含む、来なくても途切れない） |

---

## 実現可否

**全機能、実装可能。** 既存スタックで完結する。

| 機能 | 難易度 | 理由 |
|------|--------|------|
| 出社検知（IP判定） | 🟢 低 | Cloudflare WorkerはCF-Connecting-IPヘッダーで接続元IPを取得できる |
| attendance_logsテーブル追加 | 🟢 低 | Supabaseマイグレーション1本 |
| 草グラフ | 🟢 低 | `react-calendar-heatmap`などのライブラリで実装可能 |
| 出社ランキング | 🟢 低 | attendance_logsをCOUNT+GROUP BYするだけ |
| 連続出社日数 | 🟡 中 | 連続判定ロジックに注意が必要（後述） |

---

## アーキテクチャ

```
[ユーザーがアプリを開く]
       ↓
[Cloudflare Worker: fetch handler]
  CF-Connecting-IP を取得
  → オフィスIPと一致？
       ↓ Yes
  Supabase: attendance_logs に upsert (user_id, date)
       ↓
[フロントエンド]
  attendance_logs を取得
  → 草グラフ描画
  → ランキング表示
  → 連続日数計算
```

---

## DB設計

### 新規テーブル: `attendance_logs`

```sql
create table attendance_logs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date not null,
  detected_at timestamptz default now() not null,
  unique(user_id, date)  -- 1日1レコード保証
);

alter table attendance_logs enable row level security;

create policy "自分の出社記録は誰でも見られる"
  on attendance_logs for select using (true);

create policy "システムだけが挿入できる（service_role）"
  on attendance_logs for insert
  with check (auth.uid() = user_id);
```

### 既存テーブルの変更

**不要。** `profiles` に出社カラムを追加する必要はない。
日単位の履歴は `attendance_logs` で持つ。集計はクエリで行う。

---

## 実装方針

### 1. 出社検知（Cloudflare Worker）

`worker.ts` に `fetch` ハンドラを追加する。

```ts
// worker.ts に追加
async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/api/attendance' && request.method === 'POST') {
    const clientIp = request.headers.get('CF-Connecting-IP')
    const officeIp = env.OFFICE_IP  // wrangler.jsonc に環境変数として設定

    if (clientIp !== officeIp) {
      return new Response(JSON.stringify({ at_office: false }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 認証ユーザーのトークンを受け取ってSupabaseに記録
    const { user_id, date } = await request.json()
    await fetch(`${env.SUPABASE_URL}/rest/v1/attendance_logs`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',  // 重複は無視（upsert的な動作）
      },
      body: JSON.stringify({ user_id, date }),
    })

    return new Response(JSON.stringify({ at_office: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 既存のフロントエンド配信
  return env.ASSETS.fetch(request)
}
```

**フロント側**（アプリ起動時に1回だけ呼ぶ）:
```ts
// useAttendance.ts などのhookで
const checkAttendance = async (userId: string) => {
  await fetch('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
    }),
  })
}
```

---

### 2. 草グラフ

ライブラリ: `react-calendar-heatmap`

```tsx
import CalendarHeatmap from 'react-calendar-heatmap'

// attendance_logsから自分の出社履歴を取得
const { data } = useQuery({
  queryFn: () => supabase
    .from('attendance_logs')
    .select('date')
    .eq('user_id', currentUser.id)
    .gte('date', startOfYear)
})

const values = data.map(row => ({ date: row.date, count: 1 }))

return <CalendarHeatmap values={values} startDate={startOfYear} endDate={today} />
```

---

### 3. 出社ランキング

```ts
// 週間ランキングの例
const { data } = await supabase
  .from('attendance_logs')
  .select('user_id, profiles(name, avatar_url), date')
  .gte('date', weekStart)
  .lte('date', today)

// user_id でグループしてカウント（クライアント側 or Supabase RPC）
```

Supabase RPCで集計関数を作るとクリーン:
```sql
create function get_attendance_ranking(start_date date, end_date date)
returns table(user_id uuid, name text, avatar_url text, count bigint)
language sql
as $$
  select p.id, p.name, p.avatar_url, count(a.date)
  from attendance_logs a
  join profiles p on p.id = a.user_id
  where a.date between start_date and end_date
  group by p.id, p.name, p.avatar_url
  order by count desc;
$$;
```

---

### 4. 連続出社日数

**ルール**:
- 平日（月〜金）: 来なければストリーク終了
- 週末（土・日）: 来ても来なくても途切れない（スキップ扱い）

```ts
function calcStreak(dates: string[]): number {
  const dateSet = new Set(dates)
  let streak = 0
  let d = new Date()

  while (true) {
    const day = d.getDay() // 0=日, 6=土
    const dateStr = d.toISOString().split('T')[0]

    if (day === 0 || day === 6) {
      // 週末はスキップ（来ても来なくても続行）
      d.setDate(d.getDate() - 1)
      continue
    }

    if (!dateSet.has(dateStr)) break  // 平日で来ていない → ストリーク終了

    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}
```

---

## 環境変数追加

`wrangler.jsonc` に追加:
```json
{
  "vars": {
    "OFFICE_IP": "xxx.xxx.xxx.xxx"  // オフィスの固定IPを設定
  }
}
```

---

## 実装順序

1. `attendance_logs` テーブル作成（マイグレーション）
2. Cloudflare Worker に `/api/attendance` エンドポイント追加
3. フロントで起動時に出社チェックAPI呼び出し
4. 草グラフ画面の実装
5. 出社ランキング画面の実装
6. 連続出社日数の表示

---

## 未解決の検討事項

- **オフィスIPが固定でない場合**: IP範囲（CIDR）での判定に変更する必要あり
- **在宅でVPN使用時**: オフィスIPに見えてしまう → 許容する or VPN除外は後回し
- **草グラフの粒度**: 個人の自分の草のみ表示か、全員分も見られるかを決める
- **ランキングの表示範囲**: 週間・月間・全期間のタブ切り替えを入れるか
