const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for the UI layout
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Production port configuration for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Downloader application web server running safely on port ${PORT}`);
});
