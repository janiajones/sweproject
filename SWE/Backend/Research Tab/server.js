const express = require('express');
//const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

//app.use(cors());
app.use(express.json());

// 🔐 Replace with your actual keys
const PERPLEXITY_API_KEY = 'Bearer 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'; // your Perplexity key
const SCRAPER_API_KEY = 'ddc7f6d70e3e51a6ff80354184fe8130'; // your ScraperAPI key

// 🔍 Extract top 5 keywords from user text
const getKeywords = async (text) => {
  const response = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent assistant that extracts keywords only.',
        },
        {
          role: 'user',
          content: 'Extract the top 5 keywords from this health-related message: "${text}". Return a JSON array only. Example: ["fatigue", "muscle cramps"]',
        },
      ],
    },
    {
      headers: {
        Authorization: PERPLEXITY_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const raw = response.data.choices[0].message.content;
  const jsonStart = raw.indexOf('[');
  const jsonEnd = raw.lastIndexOf(']');
  return JSON.parse(raw.substring(jsonStart, jsonEnd + 1));
};

// 🌐 Scrape Healthline articles based on a keyword
const scrapeHealthline = async (keyword) => {
  const searchUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=https://www.healthline.com/search?q=${encodeURIComponent(keyword)}`;
  const articles = [];
  console.log(`🔗 Scraping Healthline for "${keyword}" → ${searchUrl}`);

  try {
    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      // Only accept real article links under /health/
      if (
        href &&
        title &&
        href.startsWith('/health/') &&
        //!href.includes('#') &&
        !href.includes('?') &&
        title.length > 5
      ) {
        articles.push({
          id: `${keyword}-${i}`,
          title,
          url: 'https://www.healthline.com' + href,
        });
      }
    });

    return articles;
  } catch (err) {
    console.error(`❌ Error scraping for "${keyword}":`, err.message);
    return [];
  }
};

// 📬 Main route
app.post('/api/keywords', async (req, res) => {
  const { text } = req.body;
  console.log('User input:', text);

  try {
    const keywords = await getKeywords(text);
    console.log('🔍 Keywords:', keywords);

    let allArticles = [];

    for (const keyword of keywords) {
      const results = await scrapeHealthline(keyword);
      allArticles = allArticles.concat(results);
      if (allArticles.length >= 10) break;
    }
    if (allArticles.length === 0) {
      console.warn('⚠️ No articles found. Try using a more general keyword.');
    }
    const finalArticles = allArticles.slice(0, 10);
    res.json({ articles: finalArticles });
    console.log(`✅ Sent ${finalArticles.length} real articles to frontend`);
  } catch (error) {
    console.error('❌ Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(500).json({ error: 'Failed to retrieve articles.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
}); 