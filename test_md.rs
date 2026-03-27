use tree_sitter_highlight::{HighlightConfiguration, HighlightEvent, Highlighter};
use notepadn_lib::highlighter::HIGHLIGHT_NAMES;

fn main() {
    let mut config_block = HighlightConfiguration::new(
        tree_sitter_md::LANGUAGE.into(),
        "markdown_block",
        tree_sitter_md::HIGHLIGHT_QUERY_BLOCK,
        tree_sitter_md::INJECTION_QUERY_BLOCK,
        "",
    ).unwrap();
    config_block.configure(&HIGHLIGHT_NAMES);

    let mut config_inline = HighlightConfiguration::new(
        tree_sitter_md::INLINE_LANGUAGE.into(),
        "markdown_inline",
        tree_sitter_md::HIGHLIGHT_QUERY_INLINE,
        tree_sitter_md::INJECTION_QUERY_INLINE,
        "",
    ).unwrap();
    config_inline.configure(&HIGHLIGHT_NAMES);

    // We also need to configure html for injection
    let mut config_html = HighlightConfiguration::new(
        tree_sitter_html::LANGUAGE.into(),
        "html",
        tree_sitter_html::HIGHLIGHTS_QUERY,
        tree_sitter_html::INJECTIONS_QUERY,
        "",
    ).unwrap();
    config_html.configure(&HIGHLIGHT_NAMES);


    let mut highlighter = Highlighter::new();
    let text = "# Hello World\n**bold** and *italic*";

    // Test block highlighting
    let events = highlighter.highlight(&config_block, text.as_bytes(), None, |lang| {
        println!("lang req: {}", lang);
        if lang == "markdown_inline" {
            Some(&config_inline)
        } else if lang == "html" {
            Some(&config_html)
        } else {
            None
        }
    });

    println!("Block events:");
    if let Ok(events) = events {
        for event in events {
            if let Ok(event) = event {
                println!("{:?}", event);
            }
        }
    }
}
