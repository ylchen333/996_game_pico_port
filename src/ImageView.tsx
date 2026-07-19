import { useEffect, useState } from "react";
import { IMAGE_CHANNEL_NAME, type ImageChannelMessage, type ImagePayload } from "./game/image-channel";
import "./app.css";

export default function ImageView() {
  const [image, setImage] = useState<ImagePayload>({ kind: "empty", alt: "Waiting for the game" });
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("image-view-page");
    const channel = new BroadcastChannel(IMAGE_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ImageChannelMessage>) => {
      if (event.data.kind !== "ready") setImage(event.data);
    };
    channel.postMessage({ kind: "ready" } satisfies ImageChannelMessage);
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (image.kind === "image" && image.blob) {
      const nextUrl = URL.createObjectURL(image.blob);
      setBlobUrl(nextUrl);
      return () => URL.revokeObjectURL(nextUrl);
    }
    setBlobUrl(null);
  }, [image]);

  const source = image.kind === "image" ? image.src || blobUrl : null;

  return (
    <main className="image-view-shell">
      {source ? (
        <img src={source} alt={image.alt} />
      ) : (
        <p>IMAGE VIEW<br /><small>Waiting for the main game window…</small></p>
      )}
      <div className="scanlines" />
    </main>
  );
}
