import { useLayoutEffect, useRef } from "react";

const FIELDS =
  'input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])';
const FOCUSABLE =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

// Foco inicial, Tab preso dentro do diálogo, Esc fecha e o foco volta ao gatilho.
// `view` identifica o conteúdo aberto (null = fechado); trocar de conteúdo
// reposiciona o foco.
export default function useDialogFocus(view, onClose) {
  const dialog = useRef(null),
    trigger = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    if (!view) return;
    trigger.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const root = dialog.current;
    (
      root?.querySelector(FIELDS) ||
      root?.querySelector('button:not([disabled]),[tabindex="0"]')
    )?.focus({ preventScroll: true });
    const key = (e) => {
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab") return;
      const visible = Array.from(
        dialog.current?.querySelectorAll(FOCUSABLE) || [],
      ).filter(
        (node) =>
          node.getClientRects().length && !node.closest('[aria-hidden="true"]'),
      );
      if (!visible.length) return;
      const first = visible[0],
        last = visible[visible.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      trigger.current?.focus();
    };
  }, [view]);
  return dialog;
}
