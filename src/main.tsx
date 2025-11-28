import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

// Add smooth transitions for theme changes
const style = document.createElement('style');
style.textContent = `
  * {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
`;
document.head.appendChild(style);

// Ensure the root element has the light class by default
document.documentElement.classList.add('light');

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
