const LABELS: Record<string, string> = {
  calculate: "Calculate",
  current_time: "Current time",
};

export function toolLabel(name: string): string {
  return LABELS[name] ?? name;
}
