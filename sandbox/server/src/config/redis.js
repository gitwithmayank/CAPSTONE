import  Redis  from 'ioredis';
import { deletePod } from '../kubernetes/pod.js';
import { deleteService } from '../kubernetes/service.js';


export const redis = new Redis(process.env.REDIS_URL);
export const subscriber = new Redis(process.env.REDIS_URL);

export async function createSandboxKey(sandboxId) {
  await redis.set(`sandbox:${sandboxId}`, JSON.stringify({
    status: "active",
  }), "EX", 60 * 20);
}


subscriber.config("SET", 'notify-keyspace-events', "Ex");

subscriber.subscribe("__keyevent@0__:expired");

// TTL expire = sandbox 20 min se idle hai -> pod + service dono delete karo.
//
// PEHLE YAHAN BUG THA: deletePod/deleteService import the par kabhi call nahi
// hote the — sirf console.log hota tha. Isliye idle sandbox pods hamesha chalte
// rehte the, cluster ka CPU request full ho jata tha, aur naya sandbox
// "FailedScheduling: Insufficient cpu" ke saath Pending me atak jata tha.
//
// NOTE: managed Redis (Redis Cloud) par keyspace notifications block ho sakti
// hain, isliye ye best-effort hai. Guaranteed cleanup k8s/sandbox-gc-cronjob.yml
// karta hai — wo Redis key poll karke decide karta hai.
subscriber.on("message", async (channel, key) => {
  if (channel !== "__keyevent@0__:expired" || !key.startsWith("sandbox:")) return;

  const sandboxId = key.split(":")[1];
  console.log(`KEY EXPIRED  ${key} -> cleaning up sandbox ${sandboxId}`);

  const results = await Promise.allSettled([
    deletePod(sandboxId),
    deleteService(sandboxId),
  ]);

  for (const r of results) {
    if (r.status === "rejected") {
      console.log(`Cleanup partial for ${sandboxId}: ${r.reason?.message ?? r.reason}`);
    }
  }
});

export default { subscriber};
