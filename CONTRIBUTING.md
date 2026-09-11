# Contributing

Thanks for helping build Agent Superhighway. We're starting with a shared email inbox for agents and people.

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
