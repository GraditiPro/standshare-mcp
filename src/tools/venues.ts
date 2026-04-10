import type { StandShareClient } from "../auth/client.js";
import type { ToolResult } from "../types/index.js";
import { toolSuccess, toolError } from "../types/index.js";
import { formatEntityRef, formatTable } from "../formatters/index.js";

interface VenuesInput {
  action: string;
  venueId?: string;
  query?: string;
  city?: string;
  state?: string;
}

export async function handleVenues(
  client: StandShareClient,
  input: VenuesInput
): Promise<ToolResult> {
  try {
    switch (input.action) {
      case "search":
        return await searchVenues(client, input);
      case "get":
        return await getVenue(client, input);
      default:
        return toolError(`Unknown action: ${input.action}. Valid actions: search, get`);
    }
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function searchVenues(client: StandShareClient, input: VenuesInput): Promise<ToolResult> {
  const data = await client.get<{
    data: Array<{
      id: string;
      name: string;
      city: string;
      state: string;
      capacity: number;
    }>;
  }>("/venues", {
    search: input.query,
    city: input.city,
    state: input.state,
  });

  if (data.data.length === 0) {
    const filters = [input.query, input.city, input.state].filter(Boolean).join(", ");
    return toolSuccess(`No venues found${filters ? ` matching: ${filters}` : ""}.`);
  }

  const rows = data.data.map((v) => ({
    Venue: formatEntityRef(v.name, v.id),
    Location: `${v.city}, ${v.state}`,
    Capacity: String(v.capacity),
  }));

  return toolSuccess(formatTable(rows));
}

async function getVenue(client: StandShareClient, input: VenuesInput): Promise<ToolResult> {
  if (!input.venueId) return toolError("venueId is required for get action");

  const venue = await client.get<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    capacity: number;
    contactPerson?: string;
  }>(`/venues/${input.venueId}`);

  let text = `**${venue.name}** (${venue.id})\n`;
  text += `- Address: ${venue.address}\n`;
  text += `- Location: ${venue.city}, ${venue.state} ${venue.zip}\n`;
  text += `- Capacity: ${venue.capacity.toLocaleString()}\n`;
  if (venue.contactPerson) {
    text += `- Contact: ${venue.contactPerson}\n`;
  }

  return toolSuccess(text);
}
