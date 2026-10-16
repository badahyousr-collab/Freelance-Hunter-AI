# Public Telegram sources

Last reviewed: 2026-10-16.

These public channels are included in the website's suggested-source catalog because their public Telegram previews or listings showed relevant job/project posts recently. This is a curated starting set, not an exhaustive list of every Telegram channel. Public visibility can change, and a page showing posts is not the same as a successful ingestion test from the deployed Worker.

| Channel | Focus | Language | Public link | Review note |
|---|---|---|---|---|
| Telegram jobs | IT projects, developer requests, freelance opportunities | RU | https://t.me/s/tgram_jobs | Public preview showed recent developer and project posts on 2026-10-16. |
| Вакансии для разработчиков ботов | Telegram bots, Mini Apps, bot maintenance | RU | https://t.me/s/job_for_bots | Public preview showed recent bot-development requests on 2026-10-16. |
| Запили мне, зерокодер | No-code, automation, bots | RU | https://t.me/s/zerocode_jobs | Public preview showed recent project posts on 2026-10-16. |
| Проєкти Freelancehunt | Freelance projects, including bot development | UA/RU | https://t.me/s/FreelancehuntProjects | Public preview showed a recent project post within the last several days. |
| IT freelance and remote | IT projects, leads, collaboration | EN/RU | https://t.me/s/itfreelancers | Public preview showed recent remote-developer content within the last week. |
| Фриланс, удалённая работа | Broad freelance and remote projects | RU | https://t.me/s/frwork3 | Public directory showed activity on 2026-10-16. |

## Verification states

1. **Listed** means the channel has a public URL and recent public evidence.
2. **Configured** means a user added it to their account.
3. **Scanned successfully** means the deployed Worker fetched the channel preview and recorded scan metadata.
4. **Useful source** means the parser actually collected relevant, non-duplicate projects. This must be evaluated over repeated scans.

Only the last two states prove that ingestion works. If a channel becomes private, blocks previews, or changes its format, the source should show an error or stop producing projects rather than being marked as healthy.

## Current technical limits

- The scanner reads public Telegram web previews; it does not read private channels.
- The current Worker scan parser applies keyword, excluded-word, skill, and basic budget filters.
- Telegram API credentials/user sessions are not required for public web previews, but real deployed scans still need to be verified.
- A source catalog entry does not implement a marketplace adapter or guarantee that every post is paid work.
