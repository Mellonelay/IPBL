const { Redis } = require("@upstash/redis");

// Inlined configuration to prevent path resolution errors during bundle
const getResultsRedis = () => {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
};

module.exports = async (req, res) => {
    const { year, month, division } = req.query;
    if (!year || !month || !division) return res.status(400).json({ error: "Missing params" });
    
    // Inlined key generation to avoid dependency issues
    const key = `ipbl:results:${year}:${String(month).padStart(2, "0")}:${division}`;
    
    try {
        const client = getResultsRedis();
        if (!client) return res.status(503).json({ error: "KV not configured" });
        
        const data = await client.get(key);
        if (!data) return res.status(404).json({ error: "Cold data", key, cold: true });
        
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};