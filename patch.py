with open("src-tauri/src/highlighter.rs", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"markdown" => Some(tree_sitter_md::LANGUAGE.into()),' in line:
        lines[i] = '        "markdown" => Some(tree_sitter_md::INLINE_LANGUAGE.into()),\n'
    elif '"markdown" => {' in line:
        if "tree_sitter_md::LANGUAGE.into()" in lines[i+2]:
            lines[i+2] = lines[i+2].replace("tree_sitter_md::LANGUAGE.into()", "tree_sitter_md::INLINE_LANGUAGE.into()")

with open("src-tauri/src/highlighter.rs", "w") as f:
    f.writelines(lines)
