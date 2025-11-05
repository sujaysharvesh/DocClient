// Run this in browser console or Node.js with yjs installed
const Y = require('yjs');

const ydoc = new Y.Doc();
const yText = ydoc.getText('default');

// Insert "Hello World"
yText.insert(0, 'Hello World');

// Get the state as update (NOT encodeStateAsUpdate)
const update = Y.encodeStateAsUpdate(ydoc);

// Convert to base64
const base64 = btoa(String.fromCharCode(...update));
console.log('Base64 for Postman:', base64);