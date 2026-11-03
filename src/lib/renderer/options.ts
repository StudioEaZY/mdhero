export const MARKDOWN_IT_OPTIONS = {
  html: false,
  linkify: true,
  typographer: true,
  // A single newline is a hard break. MDHero is used for notes and pasted LLM
  // output, where CommonMark's soft-break space is surprising: "aaa\nbbb"
  // should not silently become "aaa bbb" in the rendered view.
  breaks: true,
};
