export function format(value: string, formatter: (value: string) => string, enabled: boolean): string {
  return enabled ? formatter(value) : value;
}
