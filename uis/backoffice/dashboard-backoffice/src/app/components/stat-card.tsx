import { Card } from "./ui/card";

export type Stat = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: Stat) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-stone-100">
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </Card>
  );
}
