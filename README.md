# OpenWebUI Native Windows Client

This is a fully native Windows application built with [React](https://react.dev) and [Electron](https://www.electronjs.org/) that serves as a secure and performant client for OpenWebUI. It connects to a running OpenWebUI server instance, supports user authentication, and provides full chat functionality.

## Features

- Authenticate using your OpenWebUI credentials.
- Retrieve and render your full chat history.
- Send messages and see responses in a bubble‑style chat interface.
- Upload files through the chat UI (if the server supports file uploads) and download attachments safely.
- Switch between multiple server profiles.
- Light and dark theme toggle.
- Secure session token storage and reauthentication.
- Graceful error handling for network or authentication problems.

## Running the App

To run the application locally:

```sh
# Install dependencies
npm install

# Start the development build
npm start
```

This runs the Electron app in development mode and connects to the server specified in the login screen. Make sure you have Node.js installed and have a running OpenWebUI server to connect to.

To build the production application:

```sh
npm run build
```

This compiles the TypeScript/React code with Webpack and packages the Electron application.

## Folder Structure

- `src/main.ts`: Entry point for the Electron main process that creates the application window.
- `src/preload.ts`: Preload script that exposes a limited IPC API to the renderer.
- `src/renderer/index.tsx`: Entry point for the React renderer process.
- `src/renderer/App.tsx`: Main React component that implements login, chat history and messaging.
- `public/index.html`: HTML template used by the renderer.
- `webpack.config.js`, `babel.config.js`, `tsconfig.json`: Build configuration.

## License

This project is licensed under the MIT License. See the LICENSE file for more information.
