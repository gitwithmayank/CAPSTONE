import { K8sCorev1Api } from "./config.js";


export const createService = async (sandboxId)=>{
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: 'sandbox-instance',
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                app: 'sandbox-instance',
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: "TCP"
                },
        
                {
                    name: "agent-http",
                    port: 3000,
                    targetPort: 3000,
                    protocol: "TCP"
                },
            ],
            type: "ClusterIP"
        }
    }

    const response = await K8sCorev1Api.createNamespacedService({
        namespace: 'default',
        body: serviceManifest
    })

    return response;
}

export async function deleteService(sandboxId){
    const response = await K8sCorev1Api.deleteNamespacedService({
        name: `sandbox-service-${sandboxId}`,
        namespace: 'default'
    });
    return response;
}