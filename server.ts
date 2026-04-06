import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STEADFAST_API_URL = "https://portal.steadfast.com.bd/api/v1";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Steadfast API Integration
  const getSteadfastHeaders = () => {
    const apiKey = (process.env.STEADFAST_API_KEY || "").trim();
    const secretKey = (process.env.STEADFAST_SECRET_KEY || "").trim();

    if (!apiKey || !secretKey) {
      console.error("CRITICAL: Steadfast API Key or Secret Key is missing!");
      throw new Error("Steadfast API Key or Secret Key is missing in environment variables.");
    }

    // Log partial keys for debugging (safe)
    console.log(`Using Steadfast API Key starting with: ${apiKey.substring(0, 4)}...`);

    return {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };
  };

  // Create Order on Steadfast
  app.post("/api/steadfast/create-order", async (req, res) => {
    try {
      const {
        invoice,
        recipient_name,
        recipient_phone,
        recipient_address,
        cod_amount,
        note
      } = req.body;

      // Validate inputs
      if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
        return res.status(400).json({ error: "Missing required fields for Steadfast order." });
      }

      // Sanitize data: Steadfast can be picky about special characters in names/addresses
      const sanitize = (str: string) => str.replace(/[^\w\s\-\,\.\(\)\/]/gi, '').trim();

      const payload = {
        invoice: String(invoice),
        recipient_name: sanitize(String(recipient_name)),
        recipient_phone: String(recipient_phone).replace(/\D/g, ''),
        recipient_address: sanitize(String(recipient_address)),
        cod_amount: Math.round(Number(cod_amount)),
        note: sanitize(String(note || "Optical Order")).substring(0, 255)
      };

      console.log("Sending to Steadfast Payload:", payload);

      const response = await axios.post(
        `${STEADFAST_API_URL}/create_order`,
        payload,
        { 
          headers: getSteadfastHeaders(),
          timeout: 20000, // Increase to 20 seconds
          validateStatus: (status) => status < 500 // Catch 500s manually for better logging
        }
      );

      if (response.status >= 400) {
        console.error("Steadfast API returned error status:", response.status, response.data);
        return res.status(response.status).json(response.data);
      }

      console.log("Steadfast Success Response:", response.data);
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      const statusCode = error.response?.status || 500;
      
      console.error("Steadfast Create Order Exception:", {
        status: statusCode,
        message: error.message,
        data: errorData
      });
      
      res.status(statusCode).json({
        error: "Steadfast API Error",
        message: typeof errorData === 'object' ? (errorData.message || errorData.error) : errorData,
        details: errorData
      });
    }
  });

  // Get Order Status from Steadfast
  app.get("/api/steadfast/status/:trackingId", async (req, res) => {
    const { trackingId } = req.params;
    try {
      const response = await axios.get(
        `${STEADFAST_API_URL}/get_status/${trackingId}`,
        { headers: getSteadfastHeaders() }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Steadfast Status Error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Failed to fetch Steadfast status",
        details: error.response?.data || error.message
      });
    }
  });

  // Webhook for Steadfast Status Updates
  app.post("/api/webhooks/steadfast", async (req, res) => {
    const { order_id, status, tracking_code } = req.body;
    console.log(`Steadfast Webhook Received: Order ${order_id}, Status ${status}, Tracking ${tracking_code}`);
    
    // Here you would typically update your Firestore database
    // Since we don't have the admin SDK initialized here easily without a service account,
    // we'll log it for now. In a real production app, you'd use firebase-admin.
    
    res.status(200).send("OK");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
