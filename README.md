# NotepadN

NotepadN — это кроссплатформенный клон Notepad++, созданный с использованием Rust, Tauri, React, Vite, TypeScript, CodeMirror 6 и Tailwind CSS.
Пользовательский интерфейс приложения нацелен на современный, нативно выглядящий дизайн для macOS, Windows и Linux.


## Технологии

- **Бэкенд**: Rust, Tauri
- **Фронтенд**: React, Vite, TypeScript, Tailwind CSS
- **Редактор кода**: CodeMirror 6

## Требования

Перед началом работы убедитесь, что у вас установлены:
- [Node.js](https://nodejs.org/) (версия 18 или выше)
- [Rust и Cargo](https://rustup.rs/)

### Зависимости для Linux

Если вы используете Linux (на базе Debian/Ubuntu), для сборки Tauri-приложений необходимо установить следующие зависимости:

```bash
sudo apt-get update
sudo apt-get install -y libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.0-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev libxdo-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

*Для других дистрибутивов Linux (Arch, Fedora и др.) ознакомьтесь с [официальной документацией Tauri](https://tauri.app/v1/guides/getting-started/prerequisites#linux).*

## Запуск на локальной машине

1. **Клонируйте репозиторий:**
   ```bash
   git clone <URL_репозитория>
   cd <название_папки>
   ```

2. **Установите зависимости фронтенда:**
   ```bash
   npm install
   ```

3. **Запустите проект в режиме разработки:**
   ```bash
   npm run tauri dev
   ```
   *При первом запуске это займет некоторое время, так как Cargo будет скачивать и компилировать зависимости для Rust.*

## Сборка (Production)

Чтобы собрать готовый исполняемый файл для вашей операционной системы, выполните:

```bash
npm run tauri build
```
Собранные бинарные файлы будут лежать в папке `src-tauri/target/release/bundle/`.

## Рекомендуемая среда разработки

- [VS Code](https://code.visualstudio.com/)
- Расширение [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- Расширение [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
