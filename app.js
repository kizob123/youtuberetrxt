const express = require('express');
const path = require('path');
const { Innertube } = require('youtubei.js'); // Active internal API wrapper
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Keep a single instance ready to prevent slowdowns
let youtubeEngine = null;
async function getYoutubeInstance() {
  if (!youtubeEngine) {
    youtubeEngine = await Innertube.create();
  }
  return youtubeEngine;
}

// Low-memory streaming API endpoint
app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Missing video URL parameter.');
    }

    // FIXED: Correctly pulls the clean 11-digit ID parameter out of group index 1
    const videoIdMatch = videoUrl.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    if (!videoIdMatch || videoIdMatch.length < 2) {
      return res.status(400).send('Invalid YouTube URL format.');
    }
    const videoId = videoIdMatch[1]; // Target position index 1 directly

    const youtube = await getYoutubeInstance();
    
    // Configure client browser parameters to force download prompts natively
    res.setHeader('Content-Disposition', `attachment; filename="video_${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    // Pull the clean web video data layout channel
    const webStream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'best',
      client: 'ANDROID'
    });

    // FIXED: Creates a web-standard writable pipeline to flash chunks to Express natively
    const expressWritableStream = new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
      abort(err) {
        console.error('Stream playback aborted:', err);
        if (!res.headersSent) res.status(500).end();
      }
    });

    // Directly pipe the web stream into Express without format converters or crashes
    await webStream.pipeTo(expressWritableStream);

  } catch (error) {
    console.error('Direct download pipeline execution failure:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: Direct video extraction failed.');
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});
