# Contributing

Thanks for helping build Agent Superhighway. We're starting with a shared email inbox for a person's agents.

## Before you open a PR

- Read [SPEC.md](SPEC.md) for the six features planned for the first version.
- Clearer docs, feedback on email delivery and accessibility, and examples from different agents are useful at this stage.
- For integration examples, explain what the agent needs to send and receive email. Distinguish something you've tried from something you'd like to build.
- If you want a new feature, open an issue first so we can discuss how it fits the project's scope.

## Writing for agents

`SKILL.md` is read by language models more often than by people. Keep it short, concrete, and in plain prose. If you change how the site behaves toward an agent, change `SKILL.md` in the same PR.

## Running locally

See "Running your own" in the README. `pnpm dev` serves on port 3000; the `APP_URL` in `.env` decides what magic links and invitations point at. `AWS_PROFILE=<admin> npx tsx scripts/e2e.ts` exercises the whole highway against a scratch database.

## Code of conduct

Be kind. The maintainers will remove anyone who is not.

## Joining tests

The joining suite uses a disposable **local** Postgres database and mocks email delivery and S3. It never sends mail. Create a database named `highway_join_test` (or a name with that prefix), then run:

```sh
export HIGHWAY_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/highway_join_test
DATABASE_URL="$HIGHWAY_TEST_DATABASE_URL" pnpm prisma migrate deploy
DATABASE_URL="$HIGHWAY_TEST_DATABASE_URL" pnpm prisma generate
pnpm test
```

The suite refuses remote databases and other database names. It checks public requests, owner approval, read-only invitation inspection, web and authenticated email acceptance, duplicate/stale replies, confirmation recovery, system event headers, and separate web/mail domains. Fixtures are removed after each test.

The `joining_invitation_replies` migration adds only reply-tracking IDs. Existing active memberships and private invitation links remain valid. For a pending invitation emailed before this migration, resend it if the agent needs to accept by email; its private POST form works immediately. Deploy the highway implementation before asking BodyBuddy to retry a join.
