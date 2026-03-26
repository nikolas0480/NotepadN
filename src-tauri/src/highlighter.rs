use serde::{Deserialize, Serialize};
use tree_sitter_highlight::{HighlightConfiguration, HighlightEvent, Highlighter};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HighlightToken {
    pub start: usize,
    pub end: usize,
    pub token_type: String,
}

pub fn get_language(lang_name: &str) -> Option<tree_sitter::Language> {
    match lang_name {
        "rust" => Some(tree_sitter_rust::LANGUAGE.into()),
        "javascript" => Some(tree_sitter_javascript::LANGUAGE.into()),
        "python" => Some(tree_sitter_python::LANGUAGE.into()),
        "html" => Some(tree_sitter_html::LANGUAGE.into()),
        "css" => Some(tree_sitter_css::LANGUAGE.into()),
        "json" => Some(tree_sitter_json::LANGUAGE.into()),
        "c" => Some(tree_sitter_c::LANGUAGE.into()),
        "cpp" => Some(tree_sitter_cpp::LANGUAGE.into()),
        "go" => Some(tree_sitter_go::LANGUAGE.into()),
        "markdown" => Some(tree_sitter_md::LANGUAGE.into()),
        "text" | _ => None,
    }
}

pub fn get_highlight_config(lang_name: &str) -> Option<HighlightConfiguration> {
    match lang_name {
        "rust" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_rust::LANGUAGE.into(),
                "rust",
                tree_sitter_rust::HIGHLIGHTS_QUERY,
                tree_sitter_rust::INJECTIONS_QUERY,
                "", // locals_query
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "javascript" => {
             let mut config = HighlightConfiguration::new(
                tree_sitter_javascript::LANGUAGE.into(),
                "javascript",
                tree_sitter_javascript::HIGHLIGHT_QUERY,
                tree_sitter_javascript::INJECTIONS_QUERY,
                tree_sitter_javascript::LOCALS_QUERY,
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "python" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_python::LANGUAGE.into(),
                "python",
                tree_sitter_python::HIGHLIGHTS_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "html" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_html::LANGUAGE.into(),
                "html",
                tree_sitter_html::HIGHLIGHTS_QUERY,
                tree_sitter_html::INJECTIONS_QUERY,
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "css" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_css::LANGUAGE.into(),
                "css",
                tree_sitter_css::HIGHLIGHTS_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "json" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_json::LANGUAGE.into(),
                "json",
                tree_sitter_json::HIGHLIGHTS_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "c" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_c::LANGUAGE.into(),
                "c",
                tree_sitter_c::HIGHLIGHT_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "cpp" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_cpp::LANGUAGE.into(),
                "cpp",
                tree_sitter_cpp::HIGHLIGHT_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "go" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_go::LANGUAGE.into(),
                "go",
                tree_sitter_go::HIGHLIGHTS_QUERY,
                "",
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        "markdown" => {
            let mut config = HighlightConfiguration::new(
                tree_sitter_md::LANGUAGE.into(),
                "markdown",
                tree_sitter_md::HIGHLIGHT_QUERY_BLOCK,
                tree_sitter_md::INJECTION_QUERY_BLOCK,
                "",
            ).ok()?;
            config.configure(&HIGHLIGHT_NAMES);
            Some(config)
        }
        _ => None
    }
}

pub const HIGHLIGHT_NAMES: [&str; 24] = [
    "attribute",
    "constant",
    "function.builtin",
    "function",
    "keyword",
    "operator",
    "property",
    "punctuation",
    "punctuation.bracket",
    "punctuation.delimiter",
    "string",
    "string.special",
    "tag",
    "type",
    "type.builtin",
    "variable",
    "variable.builtin",
    "variable.parameter",
    "comment",
    "number",
    "boolean",
    "escape",
    "label",
    "module",
];

pub fn get_highlights(text: &str, lang_name: &str) -> Vec<HighlightToken> {
    let mut highlighter = Highlighter::new();
    let config = match get_highlight_config(lang_name) {
        Some(config) => config,
        None => return vec![],
    };

    let events = highlighter.highlight(&config, text.as_bytes(), None, |_| None);

    let mut tokens = Vec::new();
    let mut highlight_stack: Vec<usize> = Vec::new();

    if let Ok(events) = events {
        for event in events {
            if let Ok(event) = event {
                match event {
                    HighlightEvent::HighlightStart(s) => {
                        highlight_stack.push(s.0);
                    }
                    HighlightEvent::Source { start, end } => {
                        if let Some(&highlight_idx) = highlight_stack.last() {
                            if highlight_idx < HIGHLIGHT_NAMES.len() {
                                tokens.push(HighlightToken {
                                    start,
                                    end,
                                    token_type: HIGHLIGHT_NAMES[highlight_idx].to_string(),
                                });
                            }
                        }
                    }
                    HighlightEvent::HighlightEnd => {
                        highlight_stack.pop();
                    }
                }
            }
        }
    }

    tokens
}
