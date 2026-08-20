# Lazy Experimentation for JavaScript

Lazy Experimentation gives JavaScript and TypeScript apps local experiment assignment and outcome capture through Lazy's control plane.

```bash
npm install @lazyweb/experimentation-javascript@0.1.0
```

```ts
import {createLazyExperimentation} from "@lazyweb/experimentation-javascript";

const experiments = createLazyExperimentation({clientKey: process.env.LAZY_EXPERIMENTATION_CLIENT_KEY!});
await experiments.start();

const subject = experiments.forSubject(user.id, {plan: user.plan});
const checkout = subject.getVariant("checkout-copy");
subject.capture("checkout_completed", {plan: user.plan}, 29);
```

For server-side identity binding, import `@lazyweb/experimentation-javascript/server`. Never put an `lwe_srv_` key in browser or mobile code.
