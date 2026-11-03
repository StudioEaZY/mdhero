import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import MarkdownIt from "markdown-it";
import { MARKDOWN_IT_OPTIONS } from "../../src/lib/renderer/options";

describe("Markdown soft breaks", () => {
  it("renders a single newline as a line break", () => {
    const md = new MarkdownIt(MARKDOWN_IT_OPTIONS);
    const html = md.render("aaa\nbbb");
    expect(html).toContain("<br");
    expect(html).not.toContain("aaa bbb");
  });

  it("makes both renderer constructors use the shared options", () => {
    const source = readFileSync(resolve(__dirname, "../../src/lib/renderer/pipeline.ts"), "utf8");
    expect(source.match(/\.\.\.MARKDOWN_IT_OPTIONS/g)).toHaveLength(2);
  });
});
