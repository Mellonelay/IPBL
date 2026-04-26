import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Forward the request to the real IPBL live endpoint
        const response = await fetch("https://api.ipbl.pro/calendar/online?tag=/api/results/live&lang=ru");
        const data = await response.json();
        
        // Return the data directly to the frontend
        return res.status(200).json(data);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}