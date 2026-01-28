import { cn } from "@/lib/utils";

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getAvatarColor = (name: string) => {
  const colors = [
    "bg-chart-1/20",
    "bg-chart-2/20",
    "bg-chart-3/20",
    "bg-chart-4/20",
    "bg-chart-5/20",
    "bg-primary/20",
    "bg-secondary/20",
    "bg-accent/20",
  ];
  const index =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
};
