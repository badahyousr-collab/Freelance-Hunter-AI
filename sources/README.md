# Source adapters

Each integration belongs in its own adapter and returns the common normalized project shape. A source explicitly declares support for discovery, account connection, proposal submission, and reply/status synchronization.

Public Telegram-channel discovery and marketplace discovery share normalization and deduplication while source-specific parsing stays isolated. Post and listing content is untrusted input and must never be treated as instructions to the AI agent.

Do not mark a capability as available until an integration test confirms it. Unsupported actions must be shown honestly in the UI.