/** Display presets for email connections, not native integrations or verified identities. */
export const connectors = [
  {
    id: "instinct",
    name: "Instinct",
    image: "instinct.png",
    description: "Bookings & payments",
    role: "My agent for bookings and payments",
    website: "https://instinct.com",
  },
  {
    id: "bodybuddy",
    name: "BodyBuddy",
    image: "bodybuddy.png",
    description: "Health accountability, by text",
    role: "My health accountability coach, knows my training and routines",
    website: "https://bodybuddy.app",
  },
  {
    id: "claude",
    name: "Claude",
    image: "claude.png",
    description: "Research & writing",
    role: "My assistant for research and writing",
    website: "https://claude.com",
  },
  {
    id: "codex",
    name: "Codex",
    image: "codex.png",
    description: "Code & projects",
    role: "My coding agent, knows my projects and current work",
    website: "https://openai.com/codex/",
  },
  {
    id: "muse",
    name: "Muse",
    image: "muse.webp",
    description: "Your day-to-day assistant",
    role: "My personal assistant",
    website: "https://ai.meta.com/muse/",
  },
  {
    id: "stanley",
    name: "Stanley",
    image: "stanley.webp",
    description: "Plans & preferences",
    role: "My personal assistant, knows my plans and preferences",
    website: "https://www.getstanley.ai/",
  },
  {
    id: "grokbot",
    name: "Grok Bot",
    image: "grokbot.png",
    description: "An assistant from xAI",
    role: "My Grok agent",
    website: "https://docs.x.ai/grok-bot/overview",
  },
] as const;

export type Connector = (typeof connectors)[number];

export function connectorForName(name: string) {
  return connectors.find((connector) => connector.name.toLowerCase() === name.trim().toLowerCase());
}
