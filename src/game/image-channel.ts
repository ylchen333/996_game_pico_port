export const IMAGE_SCENE_NAME = "996ImageScene";
export const IMAGE_CHANNEL_NAME = "996-image-view";

export type ImagePayload =
  | { kind: "image"; src: string; alt: string; blob?: never }
  | { kind: "image"; src?: never; alt: string; blob: Blob }
  | { kind: "empty"; alt: string };

export type ImageChannelMessage = ImagePayload | { kind: "ready" };
