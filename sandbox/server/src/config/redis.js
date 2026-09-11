import  Redis  from 'ioredis';
import { deletePod } from '../kubernetes/pod.js';
import { deleteService } from '../kubernetes/service.js';


export const redis = new Redis(process.env.REDIS_URL);
export const subscriber = new Redis(process.env.REDIS_URL);

export async function createSandboxKey(sandboxId) {
  await redis.set(`sandbox:${sandboxId}`, JSON.stringify({
    status: "active",
  }), "EX", 120);
}


subscriber.config("SET", 'notify-keyspace-events', "Ex");

subscriber.subscribe("__keyevent@0__:expired");

subscriber.on("message", (channel, key) => {
  console.log(`KEY EXPIRED  ${key}`);

const sandboxId = key.split(":")[1];

});

export default { subscriber};
