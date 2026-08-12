import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShowHnStory } from "../app/ShowHnStory";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShowHnStory />
  </StrictMode>,
);
