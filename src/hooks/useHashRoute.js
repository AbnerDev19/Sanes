import { useEffect, useState } from "react";
import { routeFromHash } from "../lib/routes";

export default function useHashRoute(reducedMotion) {
  const [route, setRoute] = useState(() => routeFromHash(location.hash));
  useEffect(() => {
    const update = () => setRoute(routeFromHash(location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const key = route.name === "product" ? route.productId : route.name;
  useEffect(() => {
    if (route.name !== "home") window.scrollTo(0, 0);
    else if (location.hash && !location.hash.startsWith("#/"))
      requestAnimationFrame(() =>
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }),
      );
  }, [key]);
  return route;
}
