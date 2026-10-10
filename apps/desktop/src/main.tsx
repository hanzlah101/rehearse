import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/app";

import "@/index.css";

const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
const syncTheme = () => {
  document.documentElement.classList.toggle("dark", darkScheme.matches);
};
syncTheme();
darkScheme.addEventListener("change", syncTheme);

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
