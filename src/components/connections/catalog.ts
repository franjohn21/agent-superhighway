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
    id: "town",
    name: "Town",
    image: "town.png",
    description: "Email, calendar & routines",
    role: "My work assistant, runs my email, calendar and routines",
    website: "https://town.com",
  },
  {
    id: "boardy",
    name: "Boardy",
    image: "boardy.png",
    description: "Introductions & networking",
    role: "My networking agent, makes introductions based on my goals",
    website: "https://www.boardy.ai",
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
