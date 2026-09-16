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
  const projects = await Project.findOne({user: req.user.id});
    
  return res.status(200).json({
    message: 'Project retrived successfully',
    projects
  })

})

router.post("/start",authMiddleware,async (req,res)=>{
  
    const projectId = req.body.projectId;

    const project = await Project.findOne({ _id: projectId, user: req.user.id});
    if(!project) {
        return res.status(404).json({message: 'Project not found or access denied'})
    }
   
  const sandboxId = uuid();

  await Promise.all([
    createPod(sandboxId),
    createService(sandboxId),
    createSandboxKey(sandboxId)
  ]);

  return res.status(201).json({
    message: ' sandbox environment created successfully',
    sandboxId,
    previewUrl: `http://${sandboxId}.preview.localhost`
  });

});



export default router;