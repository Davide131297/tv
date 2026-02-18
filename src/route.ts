// Updated route.ts to include support for bearer token
import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/api/some-endpoint', async (req, res) => {
    const apiKey = process.env.CRAWL_API_KEY; // Fetching the API key from Actions secrets
    const headers = { 'Authorization': `Bearer ${apiKey}` };
    try {
        const response = await axios.get('https://api.example.com/data', { headers });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;