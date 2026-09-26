// ---------------------------------------------------------------------------
// Sandbox garbage collector.
//
// KYUN CHAHIYE:
//   Har sandbox ek pod (3 containers, ~225m CPU request) + ek service banata hai.
//   2-node cluster me sirf ~3-4 sandbox fit hote hain. Pehle koi reliable cleanup
//   nahi tha (config/redis.js TTL-expiry handler me deletePod/deleteService
//   call hi nahi hoti thi, aur managed Redis par keyspace notifications block ho
//   sakti hain), isliye purane sandbox hamesha chalte rehte the aur naya sandbox
//   "FailedScheduling: Insufficient cpu" -> Pending me atak jata tha.
//
// YE SCRIPT KYA KARTA HAI (har 5 min, CronJob se):
//   1. label app=sandbox-instance wale saare pods list karta hai
//   2. har pod ke sandboxId ke liye Redis me `sandbox:<id>` key dekhta hai
//      (router har request par refreshTTL karta hai -> key = "recently active")
//   3. key na mile (20 min idle) => pod + service delete
//   4. safety cap: 2 ghante se purana pod bhi delete (leaked/active-ho-ne-par-bhi)
//
// Chalane ka tareeka: kubectl apply -f k8s/sandbox-gc-cronjob.yml
// Manual test:        kubectl create job --from=cronjob/sandbox-gc sandbox-gc-manual
// ---------------------------------------------------------------------------
import Redis from "ioredis";
import { K8sCorev1Api } from "./kubernetes/config.js";
import { deletePod } from "./kubernetes/pod.js";
import { deleteService } from "./kubernetes/service.js";

const NAMESPACE = process.env.SANDBOX_NAMESPACE || "default";
const MAX_AGE_MINUTES = Number(process.env.SANDBOX_MAX_AGE_MINUTES || 120);
const IDLE_TTL_SECONDS = 60 * 20;

// Apna alag client — config/redis.js ka subscriber import karne se extra
// pubsub connection + keyspace-notification setup bhi chal jata hai.
const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
});

function ageMinutesOf(pod) {
    const created = new Date(pod.metadata?.creationTimestamp ?? Date.now()).getTime();
    return (Date.now() - created) / 60000;
}

async function main() {
    const podList = await K8sCorev1Api.listNamespacedPod({
        namespace: NAMESPACE,
        labelSelector: "app=sandbox-instance",
    });

    const pods = podList.items ?? [];
    console.log(`[gc] ${pods.length} sandbox pod mile (max age ${MAX_AGE_MINUTES} min, idle TTL ${IDLE_TTL_SECONDS}s)`);

    let deleted = 0;
    let kept = 0;

    for (const pod of pods) {
        const sandboxId = pod.metadata?.labels?.sandboxId;
        if (!sandboxId) {
            console.log(`[gc] skip ${pod.metadata?.name} — sandboxId label nahi hai`);
            continue;
        }

        const age = ageMinutesOf(pod);
        const active = await redis.exists(`sandbox:${sandboxId}`);

        const idle = active !== 1;
        const tooOld = age > MAX_AGE_MINUTES;

        if (idle || tooOld) {
            const why = idle ? "idle (redis TTL expire)" : `max age (${Math.round(age)} min)`;
            console.log(`[gc] DELETE ${sandboxId} — ${why}`);

            const results = await Promise.allSettled([
                deletePod(sandboxId),
                deleteService(sandboxId),
            ]);

            for (const r of results) {
                if (r.status === "rejected") {
                    console.log(`[gc]   (partial) ${r.reason?.message ?? r.reason}`);
                }
            }
            deleted += 1;
        } else {
            console.log(`[gc] KEEP   ${sandboxId} — active, age ${Math.round(age)} min`);
            kept += 1;
        }
    }

    console.log(`[gc] done — deleted=${deleted} kept=${kept}`);
}

main()
    .then(async () => {
        await redis.quit();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error("[gc] FAILED:", err);
        try { await redis.quit(); } catch { /* ignore */ }
        process.exit(1);
    });
