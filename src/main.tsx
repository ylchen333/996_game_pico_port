import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Spatial } from "@webspatial/core-sdk";
import App from "./App";
import ImageView from "./ImageView";

try {
  if (Spatial.prototype.runInSpatialWeb()) document.documentElement.classList.add("is-spatial");
} catch {
  // The regular browser fallback intentionally needs no WebSpatial runtime.
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {window.location.pathname === "/image-view" ? <ImageView /> : <App />}
  </StrictMode>
);
