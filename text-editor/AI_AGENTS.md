# AI Agents Panel

The AI Agents Panel is a built-in chat interface that allows you to interact with AI models directly within the editor. You can ask questions about your files, get help with code, analyze data, and more.

## Features

### Pre-configured Agents

The editor comes with several pre-configured AI agents:

1. **📊 Data Analyst** - Analyzes CSV, JSON, and data files to find patterns and insights
2. **🔍 Code Reviewer** - Reviews code for quality, bugs, and best practices
3. **📋 Log Analyzer** - Parses log files and finds patterns, errors, and insights
4. **🔤 Regex Expert** - Helps with regex patterns, testing, and explanations
5. **🗂️ JSON Wrangler** - Helps transform, query, and manipulate JSON data
6. **🗃️ SQL Assistant** - Writes and optimizes SQL queries for data analysis

### Supported AI Providers

- **OpenAI** - GPT-4, GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Ollama** - Local models (Llama, Mistral, CodeLlama, etc.)
- **Custom** - Any OpenAI-compatible API endpoint

## Getting Started

### 1. Open the AI Agents Panel

- **Keyboard Shortcut**: `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
- **Command Palette**: Type "Open AI Agents Panel"
- **Floating Button**: Click the 🤖 button in the top-right corner

### 2. Configure Your AI Provider

1. Click the **Settings** (⚙️) button in the AI panel
2. Select your preferred AI provider
3. Enter your API key (stored locally, never sent to our servers)
4. Choose a model and adjust settings (temperature, max tokens, etc.)
5. Click **Done**

### 3. Start Chatting

1. Select an agent from the dropdown
2. Type your question in the input box
3. Press `Ctrl+Enter` to send
4. The AI will respond with context-aware information about your current file

## Using the AI Agents

### Data Analysis

When you have a data file (CSV, JSON, etc.) open:

1. Select the **Data Analyst** agent
2. Ask questions like:
   - "What columns are in this dataset?"
   - "Find any outliers in the data"
   - "Suggest a SQL query to aggregate this data"
3. The AI can suggest SQL queries that you can run directly in the Query Panel

### Code Review

When you have a code file open:

1. Select the **Code Reviewer** agent
2. Ask for:
   - "Review this code for bugs"
   - "How can I optimize this function?"
   - "Is this secure?"
3. The AI will analyze your code and provide suggestions

### Log Analysis

When viewing log files:

1. Select the **Log Analyzer** agent
2. Ask:
   - "Find all error messages"
   - "What's the most common warning?"
   - "Analyze the timestamps"

### Regex Help

1. Select the **Regex Expert** agent
2. Describe what you want to match
3. Get a regex pattern with explanation and test cases

## Custom Agents

You can create your own specialized agents:

1. Click the "Create Custom Agent" button in the agent selector
2. Give it a name, description, and icon (emoji)
3. Write a system prompt that defines how the agent should behave
4. Save and use your custom agent

## Action Buttons

AI responses can include actionable buttons:

- **Run SQL Query** - Opens the query in the Query Panel
- **Run Python Code** - Opens the code in the Query Panel
- **Insert Code** - Inserts the code snippet at your cursor position

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle AI Panel | `Ctrl+Shift+A` |
| Send Message | `Ctrl+Enter` |
| Close Panel | `Esc` |

## Settings

### Provider Settings

- **API Key**: Your provider API key (stored locally)
- **Model**: Select which model to use
- **Temperature**: Control creativity (0 = focused, 2 = creative)
- **Max Tokens**: Maximum response length
- **Context Window**: How much file content to include

### Context Building

The AI automatically builds context from your current file:
- File name and type
- Schema (for structured data)
- Sample data rows
- Current cursor position

Context respects the configured context window size to stay within token limits.

## Privacy & Security

- API keys are stored locally in your browser
- File content is only sent to the AI provider you choose
- No data is sent to our servers
- For maximum privacy, use Ollama with local models

## Tips

1. **Be specific** in your questions for better results
2. **Use the right agent** for your task
3. **Create custom agents** for repetitive tasks
4. **Check suggested queries** before running them
5. **Use streaming** to see responses in real-time

## Troubleshooting

### "API key not configured"
- Go to Settings and enter your API key

### "Failed to connect to Ollama"
- Make sure Ollama is running locally
- Check the base URL (default: http://localhost:11434)
- Test the connection in Settings

### "Context too large"
- Reduce the context window size in Settings
- Or ask more specific questions about a portion of the file

### Slow responses
- Try a faster model (e.g., GPT-3.5-turbo or Claude Haiku)
- Reduce max tokens
- Use a local Ollama model
