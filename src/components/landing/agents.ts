import { connectors } from "@/components/connections/catalog";

const positions = [
  { id: "bodybuddy", context: "Training & routines", side: "left", position: 0 },
  { id: "town", context: "Email & calendar", side: "left", position: 1 },
  { id: "flip", context: "Money, by text", side: "left", position: 2 },
  { id: "instinct", context: "Bookings & payments", side: "right", position: 0 },
  { id: "boardy", context: "Introductions", side: "right", position: 1 },
  { id: "stanley", context: "AI head of content", side: "right", position: 2 },
] as const;

export const agents = positions.map((position) => ({
  ...connectors.find((agent) => agent.id === position.id)!,
  ...position,
}));
