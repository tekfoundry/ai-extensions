import { AixError } from "../errors.js";

const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function assertUtcTimestamp(value: unknown, path = "timestamp"): asserts value is string {
  if (!isUtcTimestamp(value)) {
    throw new AixError(`Invalid PM timestamp at ${path}: must be an ISO timestamp in UTC ending with Z.`);
  }
}

export function utcTimestamp(date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    throw new AixError("Invalid PM timestamp: date is invalid.");
  }

  return date.toISOString();
}
