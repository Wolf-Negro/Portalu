interface Message {
  id:        string;
  from_me:   number;
  text:      string;
  timestamp: string;
}

const MEDIA_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  "[📷 Imagen]":    { icon: "📷", label: "Imagen",    color: "#3b82f6" },
  "[🎵 Audio]":     { icon: "🎵", label: "Audio",     color: "#8b5cf6" },
  "[🎬 Video]":     { icon: "🎬", label: "Video",     color: "var(--color-danger)" },
  "[📄 Documento]": { icon: "📄", label: "Documento", color: "var(--color-warning)" },
  "[✨ Sticker]":   { icon: "✨", label: "Sticker",   color: "#10b981" },
};

const IMG_PATTERN = /^\[img:([^\]|]+)(?:\|([^\]]*))?\]/;

function ImageBubble({ text }: { text: string }) {
  const match = text.match(IMG_PATTERN);
  if (!match) return null;
  const filename    = match[1];
  const description = match[2] || "";
  const src         = `/api/media/images/${filename}`;
  return (
    <div className="flex flex-col gap-1">
      <img
        src={src}
        alt={description || "Imagen recibida"}
        className="max-w-full rounded-md max-h-48 object-cover cursor-pointer"
        onClick={() => window.open(src, "_blank")}
      />
      {description && (
        <p className="text-xs opacity-70 leading-relaxed whitespace-pre-wrap">{description}</p>
      )}
    </div>
  );
}

function MediaBadge({ text, fromMe }: { text: string; fromMe: boolean }) {
  const meta = MEDIA_LABELS[text];
  if (!meta) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-lg leading-none">{meta.icon}</span>
      <span className="text-xs font-semibold" style={{ color: meta.color }}>
        {meta.label} {fromMe ? "enviado" : "recibido"}
      </span>
    </div>
  );
}

function parseUTC(iso: string): Date {
  return new Date(
    iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z"
  );
}

export default function MessageBubble({ msg }: { msg: Message }) {
  const isMe    = msg.from_me === 1;
  const isAI    = msg.id.startsWith("ai_") || msg.id.startsWith("assistant_");
  const isHuman = msg.id.startsWith("human_") || msg.id.startsWith("outbox_");
  const isMedia = Object.keys(MEDIA_LABELS).includes(msg.text);
  const isImg   = IMG_PATTERN.test(msg.text);

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-4 my-1`}>
      <div className={`max-w-[75%] p-3 rounded-lg shadow-sm ${
        !isMe
          ? "bg-white text-gray-800"
          : isAI
            ? "bg-green-100 text-gray-800"
            : isHuman
              ? "bg-amber-100 text-gray-800 border border-amber-200"
              : "bg-gray-800 text-white"
      } ${isMedia ? "min-w-[140px]" : ""}`}>

        {isImg
          ? <ImageBubble text={msg.text} />
          : isMedia
            ? <MediaBadge text={msg.text} fromMe={isMe} />
            : <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
        }

        <div className={`flex items-center gap-1 mt-1 opacity-60 text-[10px] ${isMe ? "justify-end" : "justify-start"}`}>
          {parseUTC(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {isMe && (
            <span className="font-bold">
              {isAI ? "• IA" : isHuman ? "• Humano" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
