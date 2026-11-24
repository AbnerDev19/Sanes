import { useEffect, useRef, useState } from "react";
import { FileText, ImageOff, RefreshCw, Trash2, Upload } from "lucide-react";
import { getAttachment } from "../lib/attachments";
import { fileSize } from "../lib/commerce";

const ACCEPT = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";

// Miniatura do arquivo guardado no navegador (imagem) ou ícone (PDF).
export function AttachmentThumb({ file }) {
  const [url, setUrl] = useState(""),
    [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true,
      objectUrl = "";
    getAttachment(file.id).then((blob) => {
      if (!active) return;
      if (!blob) return setMissing(true);
      if (file.type.startsWith("image/")) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id]);
  if (missing)
    return (
      <span className="attachment-thumb missing" title="Arquivo indisponível">
        <ImageOff size={18} aria-hidden="true" />
      </span>
    );
  return (
    <span className="attachment-thumb">
      {url ? (
        <img src={url} alt="" />
      ) : (
        <FileText size={20} aria-hidden="true" />
      )}
    </span>
  );
}

export function useMissingAttachments(files) {
  const [missing, setMissing] = useState([]);
  const ids = files.map((f) => f.id).join(",");
  useEffect(() => {
    let active = true;
    Promise.all(files.map((f) => getAttachment(f.id))).then((blobs) => {
      if (active)
        setMissing(files.filter((f, i) => !blobs[i]).map((f) => f.id));
    });
    return () => {
      active = false;
    };
  }, [ids]);
  return missing;
}

export default function AttachmentPicker({
  files,
  onAdd,
  onReplace,
  onRemove,
  busy,
  remoteUpload,
}) {
  const replaceInput = useRef(null),
    replacing = useRef(null);
  return (
    <div className="attachments">
      <span className="attachments-label" id="logo-label">
        Logomarca ou arte <small>PNG, JPG ou PDF · até 10 MB cada</small>
      </span>
      {files.length > 0 && (
        <ul className="attachment-list" aria-labelledby="logo-label">
          {files.map((f) => (
            <li key={f.id}>
              <AttachmentThumb file={f} />
              <span className="attachment-name">
                <strong>{f.name}</strong>
                <small>{fileSize(f.size)}</small>
              </span>
              <button
                type="button"
                className="icon"
                aria-label={`Substituir ${f.name}`}
                title="Substituir"
                onClick={() => {
                  replacing.current = f.id;
                  replaceInput.current?.click();
                }}
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                className="icon"
                aria-label={`Remover ${f.name}`}
                title="Remover"
                onClick={() => onRemove(f.id)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPT}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onReplace(replacing.current, e.target.files[0]);
          e.target.value = "";
        }}
      />
      {files.length < 5 && (
        <label className="upload">
          <Upload size={18} aria-hidden="true" />
          {busy
            ? "Verificando arquivo…"
            : files.length
              ? "Adicionar outro arquivo"
              : "Selecionar logomarca"}
          <input
            type="file"
            accept={ACCEPT}
            multiple
            disabled={busy}
            aria-label="Selecionar logomarca ou arte"
            onChange={(e) => {
              onAdd(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <small className="field-help">
        {remoteUpload
          ? "Os arquivos são enviados com segurança ao finalizar o pedido, e ficam disponíveis no painel da Sanes."
          : "Ao finalizar, o WhatsApp abre com o pedido; anexe os arquivos na conversa."}
      </small>
    </div>
  );
}
