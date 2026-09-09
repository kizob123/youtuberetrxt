const express = require('express');
const path = require('path');
const app = express();

// Serve the frontend files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for the UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic port configuration for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Youtuber Extraxt running on port ${PORT}`);
});
