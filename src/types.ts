import type { AuthContext } from "./middleware/auth";
import type { EffectiveSubscription } from "./lib/subscriptions";

export type AppEnv = {
  Bindings: CloudflareBindings & {
    KEK?: string;
    SYNC_ALLOW_PLAINTEXT?: string;
  };
  Variables: AuthContext & {
    subscription?: EffectiveSubscription;
  };
};
