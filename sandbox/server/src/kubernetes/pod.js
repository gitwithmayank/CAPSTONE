import { K8sCorev1Api } from "./config.js";



export async function createPod(sandboxId,projectId) {
    
    const podManifest = {
        metadata:{
           name: `sandbox-pod-${sandboxId}`,
           labels: {
              app: 'sandbox-instance',
              sandboxId: sandboxId
           }
        },
        spec:{
            volumes:[
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: "init-container",
                    image: "777171524883.dkr.ecr.ap-south-1.amazonaws.com/capstone-template",
                    imagePullPolicy: "IfNotPresent",
                    command: [ 'sh', "-c", 'cp -r /workspace/. /seed/'],
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ]

                }
            ],
            containers:[
                {
                    image: "777171524883.dkr.ecr.ap-south-1.amazonaws.com/capstone-template",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sandbox-container',
                    command: ["npm", "run", "dev"],
                    ports: [{containerPort: 5173, name: "http"}],
                    // Requests chhote rakhe hain taaki ek node par zyada sandbox fit
                    // ho (scheduling sirf requests dekhta hai). Limits me Vite dev
                    // server ko burst karne ki poori jagah hai.
                    resources:{
                        limits: {cpu: "600m",memory: "1Gi"},
                        requests: {cpu : "100m",memory: "256Mi"}
                    },
                    volumeMounts:[
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    // NOTE: tag immutable rakho (:v2). ":latest" + IfNotPresent ke
                    // saath naya build kabhi pull nahi hota (stale agent chal jata
                    // hai). Naya fix push karo to tag badha kar yahan update karo.
                    image: "777171524883.dkr.ecr.ap-south-1.amazonaws.com/capstone-agent:v2",
                    imagePullPolicy: "IfNotPresent",
                    name: 'agent-container',
                    ports: [{containerPort: 3000, name: "http"}],
                    resources:{
                        limits: {cpu: "300m",memory: "512Mi"},
                        requests: {cpu : "100m",memory: "256Mi"}
                    },
                    volumeMounts:[
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]

                },
                {
                    // Keeps ./workspace mirrored to S3 under the project's own
                    // prefix ("credscoop-bucket/<PROJECT_ID>/...").
                    image: "777171524883.dkr.ecr.ap-south-1.amazonaws.com/capstone-sync-agent",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sync-agent-container',
                    env: [
                        {
                            // sandboxId doubles as the S3 key prefix for the project.
                            name: 'PROJECT_ID',
                            value: sandboxId
                        },
                        {
                            name: 'AWS_REGION',
                            valueFrom: { secretKeyRef: { name: 'aws', key: 'AWS_REGION' } }
                        },
                        {
                            name: 'AWS_ACCESS_KEY_ID',
                            valueFrom: { secretKeyRef: { name: 'aws', key: 'AWS_ACCESS_KEY_ID' } }
                        },
                        {
                            name: 'AWS_SECRET_ACCESS_KEY',
                            valueFrom: { secretKeyRef: { name: 'aws', key: 'AWS_SECRET_ACCESS_KEY' } }
                        }
                    ],
                    resources: {
                        requests: { cpu: "25m", memory: "48Mi" },
                        limits: { cpu: "100m", memory: "128Mi" }
                    },
                    volumeMounts: [
                        {
                            // The image runs from /app, so the shared volume is
                            // mounted at /app/workspace = the agent's ./workspace.
                            name: 'workspace-volume',
                            mountPath: '/app/workspace'
                        }
                    ]
                }
            ]
        }
    }

    const response = await K8sCorev1Api.createNamespacedPod({
        namespace: 'default',
        body: podManifest
    })

    return response;
}

export async function deletePod (sandboxId){
    const response = await K8sCorev1Api.deleteNamespacedPod({
        name: `sandbox-pod-${sandboxId}`,
        namespace: 'default'
    },{
        gracePeriodSeconds: 0
    });
    return response;
}