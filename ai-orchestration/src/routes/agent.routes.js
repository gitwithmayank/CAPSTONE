import {Router} from "express";
import agent from "../agents/code.agent.js"

const agentRouter = Router();

// Model sochne ke dauraan stream chup reh sakti hai (bade build me kai minute).
// Itne gap par nginx/browser connection idle maan kar kaat dete hain, isliye
// SSE comment frames (": ...") bhejte rehte hain.
const HEARTBEAT_MS = Number(process.env.AI_SSE_HEARTBEAT_MS || 15000);

agentRouter.post("/invoke", async (req, res) => {
    const { message, projectId } = req.body;

    if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required" });
    }

    // SSE headers writeHead se hi flush ho jate hain.
    // 'X-Accel-Buffering: no' nginx ko bolta hai ki stream buffer na kare —
    // warna frames client tak tab tak pahunchte hi nahi jab tak response poori
    // tarah khatam na ho jaye.
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(": keep-alive\n\n");
    }, HEARTBEAT_MS);

    // Client chala gaya (tab band / "New sandbox") to generation rok do, warna
    // agent bekaar me LLM calls karta rehta hai.
    let clientGone = false;
    let wroteAny = false;

    try {
        const response = await agent.stream({
            messages: [{ role: "user", content: message }],
        }, {
            context: {
                projectId: projectId
            },
            streamMode: "custom",
        });

        for await (const chunk of response) {
            if (clientGone || res.writableEnded) break;
            const payload = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
            res.write(`data: ${payload}\n\n`);
            wroteAny = true;
        }

        if (!clientGone && !res.writableEnded) {
            // Explicit end marker tabhi bhejo jab kuch mila ho. Agar agent ne
            // ek bhi chunk nahi diya (model ne koi tool call nahi kiya, jaise
            // clarifying question pooch liya), to stream bilkul khaali rehne
            // do — frontend us case me apna local fallback chala leta hai.
            if (wroteAny) {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            }
            res.end();
        }
    } catch (error) {
        console.error('AI invoke failed:', error);

        // Headers already flush ho chuke hain, isliye ab JSON error possible
        // nahi — error ko SSE frame ke roop me bhejo.
        if (!clientGone && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    } finally {
        clearInterval(heartbeat);
    }

    res.on('close', () => {
        clientGone = true;
        clearInterval(heartbeat);
    });
});




export default agentRouter;