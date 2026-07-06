// Java string-literal decoding - pure, browser-safe. tree-sitter hands us the raw
// inner text of a string literal (escapes intact); before classifying a selector we
// must decode it, or the classifiers see `\"` and misjudge the shape. Covers the
// JLS 3.10.6 escapes + a best-effort text-block decoder.

export function decodeJavaString(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== "\\") { out += c; continue; }
    const n = raw[i + 1];
    switch (n) {
      case "n": out += "\n"; i++; break;
      case "t": out += "\t"; i++; break;
      case "r": out += "\r"; i++; break;
      case "b": out += "\b"; i++; break;
      case "f": out += "\f"; i++; break;
      case "s": out += " "; i++; break;        // Java 14+ (\s = space)
      case '"': out += '"'; i++; break;
      case "'": out += "'"; i++; break;
      case "\\": out += "\\"; i++; break;
      case "u": {                               // \u+XXXX (one or more 'u')
        let j = i + 2;
        while (raw[j] === "u") j++;
        const hex = raw.slice(j, j + 4);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) { out += String.fromCharCode(parseInt(hex, 16)); i = j + 3; }
        else out += c;                          // malformed - keep the backslash
        break;
      }
      default: {
        if (n >= "0" && n <= "7") {             // octal \o \oo \ooo (JLS: 3 digits if first <=3, else 2)
          const maxLen = n <= "3" ? 3 : 2;
          let oct = n, k = i + 2;
          while (oct.length < maxLen && raw[k] >= "0" && raw[k] <= "7") { oct += raw[k]; k++; }
          out += String.fromCharCode(parseInt(oct, 8));
          i = k - 1;
        } else {
          out += c;                             // unknown/EOF escape - keep backslash (defensive)
        }
        break;
      }
    }
  }
  return out;
}

// Text block ("""...""") - JLS incidental-whitespace stripping, then escapes.
// Best-effort for R1; validated against real grammar output at step 8. Input is the
// full text block including the triple-quote delimiters.
export function decodeJavaTextBlock(raw: string): string {
  let body = raw;
  const open = body.indexOf('"""');
  if (open !== -1) {
    const nl = body.indexOf("\n", open + 3);
    body = nl === -1 ? body.slice(open + 3) : body.slice(nl + 1);
  }
  const close = body.lastIndexOf('"""');
  let closingIndent = 0;
  if (close !== -1) {
    const lineStart = body.lastIndexOf("\n", close - 1) + 1;
    closingIndent = close - lineStart;
    body = body.slice(0, close);
  }

  const lines = body.split("\n");
  let minIndent = Infinity;
  for (const ln of lines) {
    if (ln.trim() === "") continue;
    const indent = ln.length - ln.trimStart().length;
    if (indent < minIndent) minIndent = indent;
  }
  if (closingIndent < minIndent) minIndent = closingIndent;
  if (!isFinite(minIndent)) minIndent = 0;

  const stripped = lines.map(ln => ln.slice(minIndent).replace(/[ \t]+$/, ""));
  if (stripped.length && stripped[stripped.length - 1] === "") stripped.pop();

  // line continuation (\<newline>) suppresses the newline, then decode escapes.
  return decodeJavaString(stripped.join("\n").replace(/\\\n/g, ""));
}
