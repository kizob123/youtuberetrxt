const express = require('express');
const path = require('path');
const { Readable } = require('stream'); // CRUCIAL: Node utility to convert stream formats
const { Innertube } = require('youtubei.js'); 
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let youtubeEngine = null;
async function getYoutubeInstance() {
  if (!youtubeEngine) {
    youtubeEngine = await Innertube.create();
  }
  return youtubeEngine;
}

app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Missing video URL parameter.');
    }

    const videoIdMatch = videoUrl.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    if (!videoIdMatch || videoIdMatch.length < 2) {
      return res.status(400).send('Invalid YouTube URL format.');
    }
    const videoId = videoIdMatch[1];

    const youtube = await getYoutubeInstance();
    
    res.setHeader('Content-Disposition', `attachment; filename="youtuber_extract_${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    // Fetch the raw web stream from YouTube
    const webStream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'best',
      client: 'ANDROID'
    });

    // FIXED: Converts the modern Web stream into a classic Node stream layout
    const nodeStream = Readable.fromWeb(webStream);

    // Pipes the chunk array natively into the web response frame without crashes
    nodeStream.pipe(res);

  } catch (error) {
    console.error('Download stream error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: Direct video data stream failed.');
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`youtubei.js engine running safely on port ${PORT}`);
});
