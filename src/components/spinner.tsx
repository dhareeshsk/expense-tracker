const SIZE_CLASSES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

export function Spinner({ size = "sm" }: { size?: keyof typeof SIZE_CLASSES }) {
  return (
    <span
      className={`${SIZE_CLASSES[size]} animate-spin rounded-full border-2 border-white/40 border-t-white`}
    />
  );
}
