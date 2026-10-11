import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";

import { queryClient, router } from "@/router";

import "@/index.css";

const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
function syncTheme() {
  document.documentElement.classList.toggle("dark", darkScheme.matches);
}
syncTheme();
darkScheme.addEventListener("change", syncTheme);

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
