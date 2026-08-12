import type { Metadata } from "next";
import { ShowHnStory } from "./ShowHnStory";

export const metadata: Metadata = {
  title: "Show HN volume surged; 20-point posts barely moved — OrangeCrumbs",
  description:
    "Show HN submissions peaked at 6.3× their ChatGPT-launch level, while posts reaching 20 points grew far less.",
};

export default function Home() {
  return <ShowHnStory />;
}
