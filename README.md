# OpenRouter Mobile Chat 🚀

Chat with AI anywhere – on your phone, offline, or in the cloud.
A fully-featured mobile-first chat application that connects to OpenRouter (cloud) or Ollama (local), with a built-in code workspace to edit, preview, and manage your projects.

## ✨ Features

### Dual API Mode
- ☁️ **Cloud**: Use any model from OpenRouter (hundreds of LLMs)
- 📱 **Local**: Connect to Ollama running on your device (Termux/desktop) – works offline!

### Intelligent Chat
- Stream responses, stop generation, retry on error
- Voice input (browser speech recognition)
- Export conversations as JSON
- System prompt & adjustable parameters (temp, top_p, max tokens)

### Built‑in Workspace (File System)
- Create projects, folders, and files directly in the browser (IndexedDB)
- Import from ZIP or GitHub repository
- Export as ZIP or single text file
- **File versions** – automatically saved on every update, restore any version
- Syntax‑highlighted code editor with live preview (HTML/CSS/JS & Python via Pyodide)

### AI‑Powered Coding Skills
Use slash commands like `/create-project react`, `/add-tests src/App.js`, or `/fix-bug "button doesn't click"`.
Skills can read your workspace and generate code with automatic file paths.

### Fully Responsive & Mobile‑First
- Touch‑optimized sidebar swipe gestures
- Dark/light theme sync with system preference
- PWA ready – install on your home screen

### Storage Management
- See your IndexedDB quota usage
- Clear workspace database with one click

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, clsx, tailwind-merge
- **State Management**: Zustand (with persistence)
- **Database**: IndexedDB via idb
- **Markdown & Code**: react-markdown, remark-gfm, react-syntax-highlighter
- **Icons**: lucide-react
- **PWA**: vite-plugin-pwa
- **Python in Browser**: Pyodide (for preview)

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/kioshiDesu/AnyChats.git
cd AnyChats
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` – the app works best in mobile view, but desktop is fine too.

### 3. Build for Production

```bash
npm run build
npm run preview
```

## 🔧 Configuration

All settings are stored in your browser's local storage. No backend required!

### ☁️ Cloud Mode (OpenRouter)

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Open the Settings (gear icon)
3. Switch to **Cloud (OpenRouter)** and paste your key
4. Click **Test Connection** – models will auto‑load
5. Select your favourite model and start chatting

### 📱 Local Mode (Ollama)

You can run Ollama on your local machine or phone (Termux).

#### On Desktop

- Install [Ollama](https://ollama.ai) and run `ollama serve`
- Pull a model, e.g. `ollama run llama3.2:1b`
- In the app, switch to **Local (Ollama)** and set the endpoint to `http://127.0.0.1:11434`

#### On Android (Termux)

1. Install [Termux](https://f-droid.org/packages/com.termux/) from F‑Droid
2. Run:
   ```bash
   pkg install ollama
   ollama serve
   ```
3. Open a new Termux session and pull a model:
   ```bash
   ollama run llama3.2:1b   # or qwen2.5-coder:7b, deepseek-coder:6.7b, etc.
   ```
4. In the app, use `http://127.0.0.1:11434`

> **Note**: For low‑memory devices (≤4GB RAM) stick to 1B–3B models. For 6GB+, 7B models work well.

## 📁 Workspace Usage

### Create a Project

- In the sidebar, click **Create Workspace** and enter a name
- Your project appears in the list – click it to activate

### Add Files

- Use the **+** button next to the project name
- Enter a path like `src/App.js` (folders are created automatically)
- Or **Import ZIP** / **Import Repo** to pull existing code

### Edit Files

- Click any file in the explorer to open the editor
- **Save** – versions are kept automatically (max 5 per file)
- View history with the **History** button

### Preview Your Code

- Click the **Play** button in the workspace header
- For web projects, an iframe shows your HTML/CSS/JS
- For Python, Pyodide executes `.py` files (console output shown)

## 🤖 AI Skills (Slash Commands)

Type `/` in the chat to see available skills:

| Command | Description |
|---------|-------------|
| `/create-project` | Generate a full project scaffold (React, HTML/CSS/JS, etc.) |
| `/add-tests` | Write unit tests for a specific file |
| `/fix-bug` | Analyze an issue and suggest a fix (with optional file path) |

Skills read your current workspace files and can create/update files automatically when they output codeblocks with `path="..."`.

## 🧠 Tips & Tricks

- **Apply code directly** – When the AI responds with codeblocks containing a `path` attribute, a green Apply button appears. Click to save to your workspace.
- **Apply All** – If multiple files are generated, a single button applies all at once.
- **Long conversations** – Keep an eye on token usage; start a new chat when things get long.
- **Offline?** – Switch to local mode and keep chatting even without internet.

## 🤝 Contributing

Contributions are welcome!

- Found a bug? [Open an issue](https://github.com/kioshiDesu/AnyChats/issues)
- Want a new feature? Submit a PR
- Have a question? Start a discussion

Please follow the existing code style and add tests if applicable.

## 📄 License

MIT © [svahc] – feel free to use and modify.

---

Made with 💙 for AI tinkerers and mobile developers.
If you like it, star the repo and share it with friends!
