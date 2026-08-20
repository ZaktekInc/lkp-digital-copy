export default function BooleanFlag({ value, label }: { value: boolean; label?: string }) {
  return (
    <span
      role="img"
      aria-label={label || (value ? "Да" : "Нет")}
      className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] text-sm font-bold leading-none ${value ? "border-[#0b3b70] text-[#0b3b70]" : "border-[#bd2d2d] text-[#bd2d2d]"}`}
    >
      {value ? "✓" : "−"}
    </span>
  );
}
