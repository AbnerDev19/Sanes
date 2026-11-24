import { restorePagesPath } from "./lib/routes";
import { createRoot } from "react-dom/client";
import App from "./App";
import { StoreSettingsProvider } from "./lib/storeSettings";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./style.css";
import "./responsive.css";
import "./commerce.css";
import "./order.css";

restorePagesPath();
createRoot(document.getElementById("root")).render(
  <StoreSettingsProvider>
    <App />
  </StoreSettingsProvider>,
);
