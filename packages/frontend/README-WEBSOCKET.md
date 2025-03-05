# WebSocket Testing Guide

This guide provides instructions on how to test the WebSocket connection in the AdminAI application.

## WebSocket Configuration

The WebSocket connection is configured using the following environment variables:

```
VITE_WS_URL=http://localhost:3000
VITE_WS_PATH=/ws
```

## Testing Methods

### 1. Using the WebSocketTest Component

Navigate to the `/websocket-test` route in the application to access the WebSocket test component. This component provides a user interface for testing the WebSocket connection, including:

- Connection status display
- Connection details (URL, path, socket ID, user ID)
- Buttons for testing the connection, forcing a reconnect, and sending a test message

### 2. Using the Browser Console

You can test the WebSocket connection directly from the browser console:

1. Open the browser developer tools (F12 or right-click and select "Inspect")
2. Navigate to the Console tab
3. Run the following command:

```javascript
window.testWebSocketConnection()
```

This will create a new WebSocket connection and log the connection details and events to the console.

### 3. Using the Debug Script

For more advanced testing, you can use the debug script:

```bash
cd packages/frontend
node src/scripts/debug-websocket.js
```

This script tests different WebSocket paths and logs detailed information about the connection process.

## Troubleshooting

If you encounter connection issues:

1. Check that the server is running (`npm run dev` from the project root)
2. Verify that the WebSocket path in the frontend matches the backend (`/ws` without trailing slash)
3. Check the browser console for error messages
4. Try forcing a reconnect using the WebSocketTest component
5. Check the server logs for any WebSocket-related errors

## Common Issues

### "xhr poll error"

This error typically occurs when:
- The WebSocket path is incorrect (should be `/ws` without trailing slash)
- The server is not running
- There's a CORS issue

### "WebSocket connection failed"

This error can occur when:
- The WebSocket server is not initialized properly
- The path is incorrect
- There's a network issue

## Additional Resources

- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [Socket.IO Server Documentation](https://socket.io/docs/v4/server-api/) 