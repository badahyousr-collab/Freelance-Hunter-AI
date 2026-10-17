# Public Telegram sources

Last reviewed: 2026-10-17.

The site includes a curated starting set of public Telegram channels that publish freelance requests, projects, or remote-work listings. Public previews and channel descriptions were checked on the review date. This is not an exhaustive list of all Telegram sources, and public activity alone does not prove that the deployed Worker can parse a channel successfully.

| Channel | Focus | Language | Public link | Evidence / note |
|---|---|---|---|---|
| Вакансии для разработчиков ботов | Requests for Telegram bots and Mini Apps, often with requirements and budget | RU | https://t.me/s/job_for_bots | Public preview contains a channel description and a bot-development request. |
| Запили мне, зерокодер | No-code, automation, applications and bots | RU | https://t.me/s/zerocode_jobs | Public preview showed current project posts. |
| Ит Вакансии / Работа программиста | IT-вакансии, удалённая работа и позиции для разработчиков | RU | https://t.me/s/hr_itwork | Публичный просмотр содержит свежие IT-вакансии; часть публикаций является полной занятостью, поэтому фильтрация обязательна. |
| GetClient | Freelance orders across IT, design, marketing and related fields | RU | https://t.me/s/GetClient | Public channel listing describes regular orders and links to a companion bot. |
| Фриланс Таверна Official | Заказы и удалённые вакансии, включая разработку и digital | RU | https://t.me/s/freelancetaverna | Публичный просмотр содержит свежие публикации с заказами; конкретные объявления всё равно требуют проверки. |
| Вакансии для фрилансеров | Remote work and freelance orders | RU | https://t.me/s/kadrof_work | Public listing describes daily remote vacancies and freelance orders. |
| Фриланс, удалённая работа | Orders and vacancies in IT, design, marketing and other areas | RU | https://t.me/s/frwork3 | Public channel listing describes freelance orders and regular activity. |
| DIGITAL Tender / freelance | Проекты и вакансии в digital, IT и смежных направлениях | RU | https://t.me/s/digitaltender | Публичный просмотр содержит публикации с задачами и описанием условий; качество потока нужно проверить сканированием. |
| Проєкти Freelancehunt | Freelance projects, including development | UA/RU | https://t.me/s/FreelancehuntProjects | Existing catalog entry; verify recent posts and parsing in the deployed scanner before treating as reliable. |
| IT freelance and remote | IT projects, leads and collaboration | EN/RU | https://t.me/s/itfreelancers | Existing catalog entry; verify recent posts and parsing in the deployed scanner before treating as reliable. |

## Verification states

1. **Listed** means the channel has a public URL and a relevant public description or post.
2. **Configured** means a user added it to their account.
3. **Scanned successfully** means the deployed Worker fetched the channel preview and recorded scan metadata.
4. **Useful source** means the parser collected relevant, non-duplicate projects over repeated scans.

Only the last two states prove that ingestion works. A channel may contain ordinary vacancies, advertisements, unpaid work, or posts that are not a fit for a user's profile. The source must not be marked healthy just because its URL opens.

## Current technical limits

- The scanner reads public Telegram web previews; it does not read private channels.
- The current Worker scanner extracts text posts, scores skill relevance, checks language, budget minimum, excluded keywords, explicit unpaid-work signals, and risk/complexity indicators, and stores reasons for the score. It does not guarantee every post is paid work or relevant. Notifications are sent only for newly inserted rows and can be disabled in agent settings.
- Telegram API credentials/user sessions are not required for public web previews, but live scans in the deployed Worker still need to be verified.
- A source catalog entry does not implement a marketplace adapter or guarantee that a platform supports automated applications.
- Keep channel additions data-driven and verify them with a real scan before claiming a source is working.
