import {afterEach, describe, expect, it, vi} from "vitest";
import {setPolyfills} from "@growthbook/growthbook";
import {createLazyExperimentation} from "../src/index.js";

afterEach(() => vi.unstubAllGlobals());

describe("LazyExperimentation", () => {
  it("lets GrowthBook fetch, assign, and deliver exposure and outcome events", async () => {
    const requests: Array<{url: string; body?: string}> = [];
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({url, body: init?.body?.toString()});
      if (url.includes("/api/features/")) {
        return new Response(JSON.stringify({
          features: {
            "checkout-copy": {
              defaultValue: "control",
              rules: [{variations: ["control", "variant"], coverage: 1, seed: "checkout-copy"}],
            },
          },
        }), {status: 200, headers: {"content-type": "application/json"}});
      }
      return new Response(JSON.stringify({accepted: 1}), {status: 200});
    });
    vi.stubGlobal("fetch", mockFetch);
    setPolyfills({fetch: mockFetch});

    const client = createLazyExperimentation({clientKey: "lwe_cfg_test", apiHost: "https://example.test"});
    expect((await client.start()).success).toBe(true);
    const subject = client.forSubject("subject-123", {plan: "pro"});
    expect(subject.getVariant<string>("checkout-copy").inExperiment).toBe(true);
    subject.capture("checkout_completed", {plan: "pro"}, 29);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const tracking = requests.filter(({url}) => url.includes("/track?client_key="));
    expect(tracking.length).toBeGreaterThanOrEqual(1);
    expect(tracking.map(({body}) => body).join(" ")).toContain("checkout_completed");
    client.destroy();
  });
});
