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
