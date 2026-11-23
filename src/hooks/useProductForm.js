import { useState } from "react";
import { validateQuantity } from "../order";
import { combineCartItems } from "../lib/commerce";

// Estado do formulário de personalização do produto aberto no diálogo.
export default function useProductForm({ cart, setCart, onAdded }) {
  const [product, setProduct] = useState(null),
    [qty, setQty] = useState(30),
    [color, setColor] = useState("A definir"),
    [method, setMethod] = useState("A definir com a equipe"),
    [text, setText] = useState(""),
    [art, setArt] = useState(null),
    [error, setError] = useState("");
  const open = (p) => {
    setProduct(p);
    setQty(p.min);
    setColor("A definir");
    setMethod("A definir com a equipe");
    setText("");
    setArt(null);
    setError("");
  };
  const add = () => {
    if (!validateQuantity(qty, product.min)) {
      setError(
        `Informe uma quantidade inteira a partir de ${product.min} unidades.`,
      );
      return;
    }
    const item = {
      id: product.id,
      name: product.nome,
      qty: Number(qty),
      color,
      method,
      text: text.trim(),
      art: art?.name || "",
      key: crypto.randomUUID(),
    };
    try {
      setCart(combineCartItems([...cart, item]));
    } catch (e) {
      setError(e.message);
      return;
    }
    setProduct(null);
    onAdded();
  };
  return {
    product,
    open,
    close: () => setProduct(null),
    add,
    form: {
      qty,
      setQty,
      color,
      setColor,
      method,
      setMethod,
      text,
      setText,
      art,
      setArt,
      error,
      setError,
    },
  };
}
