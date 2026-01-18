# AdaptBTC Roadmap (Scaffolding)

## Accounts, bookmarks, and learner progress
- **Static-first approach:** Use localStorage to store bookmarks and progress without requiring authentication.
- **Optional backend later:** Expand to a lightweight service (Supabase/Firebase) for sync across devices.
- **Progress tracking:** Track completed lessons, quiz checkpoints, and resume states per lesson slug.

## Price alerts
- **Email-first delivery:** Gather alert preferences locally, then connect to an email service later.
- **Alert rules:** Above/below price triggers with optional cooldowns.
- **MVP scope:** UI and storage only; no outbound sending yet.

## Additional tool ideas
- Multisig setup checklist and signing workflow planner.
- Tax estimate helper and cost basis logging export.
- Treasury allocation simulator with drawdown bands.

## Community Q&A
- **Embedded option:** Use a Discourse or Circle embed for moderated discussions.
- **Custom option:** Build a lightweight FAQ + AMA submission flow backed by a simple CMS.
