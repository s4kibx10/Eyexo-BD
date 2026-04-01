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
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error("Steadfast API Key or Secret Key is missing in environment variables.");
    }

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

      console.log("Sending to Steadfast:", {
        invoice,
        recipient_name,
        recipient_phone,
        recipient_address,
        cod_amount,
        note
      });

      const response = await axios.post(
        `${STEADFAST_API_URL}/create_order`,
        {
          invoice,
          recipient_name,
          recipient_phone,
          recipient_address,
          cod_amount,
          note
        },
        { 
          headers: getSteadfastHeaders(),
          timeout: 10000 // 10 seconds timeout
        }
      );

      console.log("Steadfast Response:", response.data);
      res.json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error("Steadfast Create Order Error:", errorData);
      
      // If Steadfast returns a 500 with "Server Error", it's often due to invalid keys or malformed data
      res.status(error.response?.status || 500).json({
        error: "Failed to create Steadfast order",
        message: typeof errorData === 'object' ? errorData.message : errorData,
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
