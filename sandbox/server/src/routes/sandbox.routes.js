import { Router } from "express";
import { createPod } from "../kubernetes/pod.js";
import { createService } from "../kubernetes/service.js";
import {createSandboxKey} from "../config/redis.js";
import {v7 as uuid} from "uuid";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";

const router = Router();


router.post('/project', authMiddleware, async(req,res)=>{
    const {title} = req.body;

    // title request body me required hai
    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'title is required' });
    }

    const newProject = new Project({
        user: req.user.id,
        title
    });

    await newProject.save();

    return res.status(201).json({
        message: 'Project created successfully',
        project: newProject
    })
})


router.get("/projects", authMiddleware, async (req,res)=>{
  const projects = await Project.find({user: req.user.id}).sort({ _id: -1 });
    
  return res.status(200).json({
    message: 'Projects retrieved successfully',
    projects
  })

})

router.post("/start",authMiddleware,async (req,res)=>{
  try {
    const { projectId } = req.body;
    let project = null;

    if (projectId) {
      // Agar projectId diya gaya hai to ownership verify karo
      try {
        project = await Project.findOne({ _id: projectId, user: req.user.id });
      } catch (err) {
        project = null; // invalid ObjectId format
      }
      if (!project) {
        return res.status(404).json({ message: 'Project not found or access denied' });
      }
    } else {
      // Frontend bina projectId ke bhi aa sakta hai:
      // user ka latest project use karo, warna naya project bana do.
      project = await Project.findOne({ user: req.user.id }).sort({ _id: -1 });
      if (!project) {
        project = await Project.create({ user: req.user.id, title: 'My Sandbox' });
      }
    }

    const sandboxId = uuid();

    await Promise.all([
      createPod(sandboxId, project._id),
      createService(sandboxId),
      createSandboxKey(sandboxId),
    ]);

    return res.status(201).json({
      message: 'sandbox environment created successfully',
      sandboxId,
      projectId: project._id,
      // Preview URL: k8s/ingress.yml me "*.preview.<PREVIEW_DOMAIN>" host rule
      // router-service par jata hai, aur router host ka pehla label dekh kar
      // us sandbox ke service par proxy karta hai.
      //
      // PREVIEW_SCHEME default "https" hai kyunki frontend bhi HTTPS par chalta
      // hai — warna browser mixed-content block kar dega. Local dev ke liye
      // PREVIEW_SCHEME=http PREVIEW_DOMAIN=preview.localhost set kar lo.
      previewUrl: `${process.env.PREVIEW_SCHEME || "https"}://${sandboxId}.preview.${process.env.PREVIEW_DOMAIN || "aisandbox.duckdns.org"}`,
    });
  } catch (err) {
    console.error('Error starting sandbox:', err);
    return res.status(500).json({ message: 'Failed to start sandbox' });
  }
});



export default router;