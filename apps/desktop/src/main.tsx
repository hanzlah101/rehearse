import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/app";

import "@/index.css";
import "@/lib/theme";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
