export function chipClass(active: boolean): string {
  return [
    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs tracking-[0.08em]",
    active
      ? "border-[#ff8c00] bg-[#ff8c00]/20 text-[#ffb77d]"
      : "border-[#564334] bg-[#1f2020] text-[#ddc1ae]",
  ].join(" ");
}
