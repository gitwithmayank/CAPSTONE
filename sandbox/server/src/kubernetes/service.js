import { K8sCorev1Api } from "./config.js";


export const createService = async (sandboxId)=>{
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                app: 'sandbox',
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