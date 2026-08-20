import {v7 as uuidv7} from "uuid";

export const LAZY_EXPERIMENTATION_API_HOST = "https://experimentation.lazyweb.com";

export interface LazyExperimentationServerOptions {
  serverKey: string;
  apiHost?: string;
  fetch?: typeof fetch;
}

export class LazyExperimentationServer {
  readonly #serverKey: string;
  readonly #apiHost: string;
  readonly #fetch: typeof fetch;

  constructor(options: LazyExperimentationServerOptions) {
    if (!/^lwe_srv_[A-Za-z0-9_-]{24,}$/.test(options.serverKey)) {
      throw new Error("serverKey must be an lwe_srv_ credential");
    }
    this.#serverKey = options.serverKey;
    this.#apiHost = new URL(options.apiHost ?? LAZY_EXPERIMENTATION_API_HOST).origin;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async bindSubject(experimentSubject: string, externalId: string): Promise<"bound" | "already_bound"> {
    const response = await this.#post("/v1/subjects/bind", {
      experiment_subject: opaqueId(experimentSubject),
      external_id: opaqueId(externalId),
    });
    if (response.status !== "bound" && response.status !== "already_bound") throw new Error("invalid bind response");
    return response.status;
  }

  async capture(event: string, externalId: string, properties: Record<string, unknown> = {}, value?: number): Promise<void> {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(event)) throw new Error("invalid event name");
    const timestamp = new Date().toISOString();
    await this.#post("/v1/events", {
      sent_at: timestamp,
      events: [{
        event_id: uuidv7(),
        type: "track",
        event,
        external_id: opaqueId(externalId),
        timestamp,
        properties,
        ...(value === undefined ? {} : {value}),
      }],
    });
  }

  async #post(path: string, body: unknown): Promise<Record<string, unknown>> {
    const response = await this.#fetch(`${this.#apiHost}${path}`, {
      method: "POST",
      headers: {authorization: `Bearer ${this.#serverKey}`, "content-type": "application/json"},
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Lazy Experimentation request failed (${response.status})`);
    return response.json() as Promise<Record<string, unknown>>;
  }
}

export function createLazyExperimentationServer(options: LazyExperimentationServerOptions): LazyExperimentationServer {
  return new LazyExperimentationServer(options);
}

function opaqueId(value: string): string {
  const id = value?.trim();
  if (!id || id.length > 256 || id.includes("@")) throw new Error("identity must be opaque");
  return id;
}
