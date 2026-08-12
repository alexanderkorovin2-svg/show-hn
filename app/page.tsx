import type { Metadata } from "next";
import { ShowHnStory } from "./ShowHnStory";

export const metadata: Metadata = {
  title: "Show HN after AI coding — OrangeCrumbs",
  description:
    "An interactive look at how Show HN submissions changed after ChatGPT and Claude Code.",
};

export default function Home() {
  return <ShowHnStory />;
}

