import { useEffect, useState } from "react";
import { appPath, routeFromLocation } from "../lib/routes";

const getRoute = () => routeFromLocation(location.pathname, location.hash);

export default function useHashRoute(reducedMotion) {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const update = () => {
      const next = getRoute();
      if (location.hash.startsWith("#/") && next.name !== "home") {
        const path = appPath(location.hash.slice(2));
        // O link legado é substituído no histórico, inclusive em páginas profundas.
        history.replaceState(null, "", `${path}${location.search}`);
      }
      setRoute(next);
    };
    const follow = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.download || (link.target && link.target !== "_self"))
        return;
      const next = new URL(link.href);
      const base = appPath();
      if (
        next.origin !== location.origin ||
        (next.pathname !== base &&
          routeFromLocation(next.pathname, next.hash).name === "home")
      )
        return;
      event.preventDefault();
      if (next.href !== location.href) history.pushState(null, "", next);
      update();
    };
    update();
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    document.addEventListener("click", follow);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
      document.removeEventListener("click", follow);
    };
  }, []);
  useEffect(() => {
    if (route.name !== "home" || !location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    const frame = requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [route, reducedMotion]);
  return route;
}
