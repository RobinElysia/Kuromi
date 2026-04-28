import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import math from "@bytemd/plugin-math";
import mermaid from "@bytemd/plugin-mermaid";
import type { BytemdPlugin } from "bytemd";
import type { Schema } from "hast-util-sanitize";
import remarkBreaks from "remark-breaks";

const breaksPlugin: BytemdPlugin = {
  remark: (processor) => processor.use(remarkBreaks),
};

const markdownPlugins: BytemdPlugin[] = [
  breaksPlugin,
  gfm(),
  math({
    katexOptions: {
      strict: "warn",
      trust: false,
      throwOnError: false,
    },
  }),
  mermaid({
    securityLevel: "strict",
    theme: "dark",
  }),
  highlight(),
];

const COMMON_TAGS = [
  "section",
  "article",
  "header",
  "footer",
  "details",
  "summary",
  "mark",
  "svg",
  "g",
  "path",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "circle",
  "rect",
  "text",
  "tspan",
  "defs",
  "marker",
  "mask",
  "pattern",
  "foreignObject",
];

export function createMarkdownSanitizer(schema: Schema): Schema {
  const next = structuredClone(schema);

  next.tagNames = Array.from(new Set([...(next.tagNames ?? []), ...COMMON_TAGS]));
  next.attributes = next.attributes ?? {};

  const currentAllAttributes = next.attributes["*"] ?? [];
  next.attributes["*"] = Array.from(
    new Set([
      ...currentAllAttributes,
      "className",
      "style",
      "id",
      "ariaHidden",
      "viewBox",
      "role",
      "transform",
      "strokeLinecap",
      "strokeLinejoin",
      "strokeWidth",
      "textAnchor",
      "dominantBaseline",
    ])
  );

  next.protocols = next.protocols ?? {};
  const imageProtocols = next.protocols.src ?? [];
  next.protocols.src = Array.from(new Set([...imageProtocols, "http", "https", "data"]));

  return next;
}

export { markdownPlugins };
