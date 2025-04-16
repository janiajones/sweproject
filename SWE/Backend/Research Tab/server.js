const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer'); // Newly added

const app = express();
const PORT = 3000;

app.use(express.json());

// 🔐 Replace with your actual keys
const PERPLEXITY_API_KEY = 'Bearer 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';

// 🔍 Extract top 5 keywords from the user text
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
          content: `Extract the top 5 keywords from this health-related message: "${text}". Return only the JSON array. Example: ["fatigue", "muscle cramps"]`,
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
  const arrayMatch = raw.match(/\[.*\]/s);
  if (!arrayMatch) {
    throw new Error('No JSON array found in response');
  }
  return JSON.parse(arrayMatch[0]);
};

// Use Puppeteer to scrape dynamic content from Healthline for the given keyword
const scrapeHealthline = async (keyword) => {
  // Construct the search URL using the keyword
  const searchUrl = `https://www.healthline.com/search?q1=${keyword}`;
  const articles = [];
  console.log(`🔗 Scraping Healthline using Puppeteer for "${keyword}" → ${searchUrl}`);

  // Launch Puppeteer in headless mode
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    

    // Extract articles from the page.
    // Here we pick links that match common patterns in the Healthline search results page.
    const extractedArticles = await page.evaluate((kw) => {
      // Adjust the CSS selectors as needed for the current page structure.
      const anchors = Array.from(document.querySelectorAll(
        "a[href^='/health/'], a[href^='https://www.healthline.com/health/']"
      ));
      
      return anchors.map((el, index) => {
        const title = el.innerText.trim();
        const url = el.href;
        return { id: `${index}`, title, url };
      }).filter(article => article.title.length > 5 && article.title.toLowerCase().includes(kw.toLowerCase()));
    }, keyword);
    
    articles.push(...extractedArticles);
    console.log(`Articles scraped for "${keyword}":`, articles);
  } catch (err) {
    console.error(`❌ Error scraping for "${keyword}" with Puppeteer:`, err.message);
  } finally {
    await browser.close();
  }
  
  return articles;
};

// 📬 Main API route: Get keywords, scrape articles, and send them to the frontend.
app.post('/api/keywords', async (req, res) => {
  const { text } = req.body;
  console.log('User input:', text);

  try {
    const keywords = await getKeywords(text);
    console.log('🔍 Keywords:', keywords);

    let allArticles = [];

    // Process each keyword and gather articles from Healthline
    for (const keyword of keywords) {
      const results = await scrapeHealthline(keyword);
      allArticles = allArticles.concat(results);
      // Stop if we have at least 10 articles; adjust as needed.
      if (allArticles.length >= 10) break;
    }

    if (allArticles.length === 0) {
      console.warn('⚠️ No articles found. Try using a more general keyword.');
    }
    const finalArticles = allArticles.slice(0, 10);
    console.log(`✅ Final articles:`, finalArticles);

    // Send the articles to the frontend.
    res.json({ articles: finalArticles });
    console.log(`✅ Sent ${finalArticles.length} articles to frontend`);
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
