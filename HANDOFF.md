# StackMe — Handoff Note

## Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4, deployed on **Vercel**
- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL, deployed on **Railway**
- **Auth**: Clerk (`useUser`, `useAuth`, JWT bearer tokens)
- **i18n**: react-i18next, JSON files bundled at build time (need git push to update)
- **State**: Zustand v5 with persist middleware (localStorage, key: `stackme-workspace`)

## Project structure
```
StackMe/
  apps/hub/src/
    layouts/      AppShell.tsx, PanelLayout.tsx
    pages/        MarketMe, AccountMe, NotifyMe, ForgeMe, AnalyzeMe
    shared/       RoadmapTab.tsx (used by both ForgeMe and AnalyzeMe)
    store/        workspace.ts  (panel tabs state)
    context/      ModulesContext.tsx
    registry.ts   MODULE_REGISTRY
    App.tsx        routes
  backend/core/
    models/       roadmap_vote.py, suggestion.py, suggestion_vote.py,
                  notification.py, user_profile.py
    routers/      roadmap.py, suggestions.py, admin.py, notifications.py,
                  me.py, health.py
    main.py       registers all routers + create_all
    auth.py       get_current_user, get_optional_user
```

## What was built (recent sessions)

### Voting & Suggestions (RoadmapTab)
- Tables: `roadmap_votes`, `suggestions`, `suggestion_votes`
- Users vote on roadmap items (toggle, auth required)
- Users submit feature suggestions (text + optional show_username)
- Community suggestions shown after admin publishes them
- Anonymous names: Alice characters + 5 chars of user_id (deterministic hash)
- Username stored at submission time from `user_profiles.nickname`

### In-app Notifications (NotifyMe)
- Tables: `notifications`, `notification_reads`
- Bell icon in header with unread dot badge, polling every 60s
- `/notify-me` page: All/Unread tabs, click to mark read, mark all read
- Broadcast (user_id=null) + personal notifications
- When admin publishes a suggestion → auto notification to the author

### Admin Panel (AccountMe)
- Visible only to `VITE_ADMIN_USER_ID` (Clerk user ID, set in Vercel env vars)
- Sends broadcast notifications: announcement / new_version / survey
- Backend guard: `ADMIN_USER_IDS` env var on Railway (same Clerk user ID)

### Panel tabs (AppShell)
- Zustand workspace store: panels persist to localStorage
- `openPanel` is now **additive** (doesn't replace unpinned tabs — was a bug)
- Lock icon = pin panel (survives openPanel calls)
- System pages (AccountMe, NotifyMe) don't highlight any panel tab
- Clicking a tab always navigates to its route

## Key env vars
| Var | Where | Purpose |
|-----|-------|---------|
| `VITE_ADMIN_USER_ID` | Vercel | Shows admin panel in AccountMe |
| `ADMIN_USER_IDS` | Railway | Backend admin guard (same Clerk ID) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel | Clerk frontend |
| `DATABASE_URL` | Railway | PostgreSQL |

## Known pending / to verify
- Admin broadcast UI works (was getting 403 — check Railway logs if issue persists)
- `admin.py` publish endpoint: notification title now includes module name (`Your Forge Me suggestion is now live 🎉`)
- Full voting flow test after latest deploy

## DB notes
- All tables created via SQLAlchemy `create_all` on startup
- One manual migration was needed: `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS username VARCHAR(100);`
- DBGate used for ad-hoc SQL (Railway PostgreSQL)

## Style / conventions
- Tailwind utility classes, no separate CSS files
- Colors: violet-400 = ForgeMe, teal-400 = AnalyzeMe
- Text sizes: xs for most UI, [10px]/[11px] for meta labels
- Buttons: `rounded-lg`, `rounded-md` for smaller controls
- `text-muted-foreground` for secondary text, `text-foreground` for active
