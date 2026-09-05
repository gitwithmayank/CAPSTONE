import {Router} from "express";
import agent from "../agents/code.agent.js"

const agentRouter = Router();

agentRouter.post("/invoke", async (req,res)=>{
    try{
        const {message, projectId} = req.body;
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        const response = await agent.stream({
            messages: [{ role: "user", content: message }],  
        },{
            context: {
                projectId: projectId
            },
            streamMode: "custom",
        });
          
        for await (const chunk of response) {
            console.log(chunk);
            res.write(`data: ${chunk}\n\n`);
        }
            
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




export default agentRouter;