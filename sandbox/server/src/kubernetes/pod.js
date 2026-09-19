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
                    image: "template",
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
                    image: "template",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sandbox-container',
                    command: ["npm", "run", "dev"],
                    ports: [{containerPort: 5173, name: "http"}],
                    resources:{
                        limits: {cpu: "500m",memory: "1Gi"},
                        requests: {cpu : "250m",memory: "500Mi"}
                    },
                    volumeMounts:[
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image: "agent",
                    imagePullPolicy: "IfNotPresent",
                    name: 'agent-container',
                    ports: [{containerPort: 3000, name: "http"}],
                    resources:{
                        limits: {cpu: "500m",memory: "1Gi"},
                        requests: {cpu : "250m",memory: "500Mi"}
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
                    image: "sync-agent",
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
                            valueFrom: { secretKeyRef: { name: 'aws', key: 'AWS_SECET_ACCESS_KEY' } }
                        }
                    ],
                    resources: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "200m", memory: "256Mi" }
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