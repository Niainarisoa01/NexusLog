// NexusLog Filter Helpers
// Utility functions for FilterQuery (type defined in models.ts)

import type { FilterQuery } from "./models";

/** Create an empty filter query with all fields null */
export function createEmptyFilter(): FilterQuery {
  return {
    levels: null,
    event_ids: null,
    providers: null,
    channels: null,
    time_from: null,
    time_to: null,
    search_text: null,
    xpath: null,
  };
}

/** Check if a filter has active conditions */
export function isFilterActive(filter: FilterQuery): boolean {
  return (
    (filter.levels !== null && filter.levels.length > 0) ||
    (filter.event_ids !== null && filter.event_ids.length > 0) ||
    (filter.providers !== null && filter.providers.length > 0) ||
    (filter.channels !== null && filter.channels.length > 0) ||
    filter.time_from !== null ||
    filter.time_to !== null ||
    (filter.search_text !== null && filter.search_text.length > 0) ||
    (filter.xpath !== null && filter.xpath.length > 0)
  );
}
