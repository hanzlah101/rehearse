import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";

import { queryClient, router } from "@/router";

import "@/index.css";
import "@/lib/theme";

// The webview has no reload shortcut of its own; mirror the browser's in dev.
if (import.meta.env.DEV) {
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "r") {
      event.preventDefault();
      window.location.reload();
    }
  });
}

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
