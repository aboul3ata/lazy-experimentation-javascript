# Lazy Experimentation for JavaScript

Lazy Experimentation is the thin product layer over GrowthBook. GrowthBook owns feature loading, caching, targeting, hashing, assignment, and exposure lifecycle; this package points it at Lazy's control plane and adds outcome capture.

```bash
npm install @lazyweb/sdk@0.2.0
```

```ts
import {createLazyExperimentation} from "@lazyweb/sdk";

const experiments = createLazyExperimentation({clientKey: process.env.LAZY_EXPERIMENTATION_CLIENT_KEY!});
await experiments.start();

const subject = experiments.forSubject(user.id, {plan: user.plan});
const checkout = subject.getVariant("checkout-copy");
subject.capture("checkout_completed", {plan: user.plan}, 29);
```

For server-side identity binding, import `@lazyweb/sdk/server`. Never put an `lwe_srv_` key in browser or mobile code.

Official engine: [`@growthbook/growthbook`](https://github.com/growthbook/growthbook/tree/main/packages/sdk-js).
