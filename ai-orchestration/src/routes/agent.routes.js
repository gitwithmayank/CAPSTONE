import {Router} from "express";
import agent from "../agents/code.agent.js"

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
    try {
        const { message, projectId } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        const response = await agent.stream({
            messages: [{ role: "user", content: message }],
        }, {
            context: {
                projectId: projectId
            },
            streamMode: "custom",
        });

        for await (const chunk of response) {
            const payload = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
            res.write(`data: ${payload}\n\n`);
        }

        // Headers were already flushed with writeHead(); just close the stream.
        res.end();
    } catch (error) {
        // Once we have written the SSE headers a JSON error is no longer possible.
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            return res.end();
        }
        res.status(500).json({ error: error.message });
    }
});




export default agentRouter;