import {
  Landmark,
  ShoppingCart,
  Plane,
  CreditCard,
  Plug,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  LineChart,
  Tag,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  landmark: Landmark,
  "shopping-cart": ShoppingCart,
  plane: Plane,
  "credit-card": CreditCard,
  plug: Plug,
  "more-horizontal": MoreHorizontal,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "line-chart": LineChart,
};

export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return ICON_MAP[name] ?? Tag;
}
