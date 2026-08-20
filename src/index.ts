import { GrowthBookClient } from "@growthbook/growthbook";
import type { Attributes, EventProperties, InitResponse } from "@growthbook/growthbook";
import { growthbookTrackingPlugin } from "@growthbook/growthbook/plugins";

export const LAZY_EXPERIMENTATION_API_HOST = "https://experimentation.lazyweb.com";

export interface LazyExperimentationOptions {
  clientKey: string;
  apiHost?: string;
  timeoutMs?: number;
}

export interface LazyVariant<T> {
  value: T | null;
  variation: "control" | "variant";
  inExperiment: boolean;
}

export class LazyExperimentation {
  readonly growthbook: GrowthBookClient;
  readonly #timeoutMs: number;

  constructor(options: LazyExperimentationOptions) {
    const clientKey = options.clientKey?.trim();
    if (!clientKey) throw new Error("clientKey is required");
    const apiHost = normalizeOrigin(options.apiHost ?? LAZY_EXPERIMENTATION_API_HOST);
    this.#timeoutMs = options.timeoutMs ?? 2_000;
    this.growthbook = new GrowthBookClient({
      apiHost,
      clientKey,
      plugins: [
        growthbookTrackingPlugin({
          ingestorHost: apiHost,
          queueFlushInterval: 0,
          dedupeKeyAttributes: ["id"],
          eventFilter: ({ eventName }) => eventName === "Experiment Viewed" || validEventName(eventName),
          transport: "fetch",
        }),
      ],
    });
  }

  start(): Promise<InitResponse> {
    return this.growthbook.init({timeout: this.#timeoutMs, streaming: false});
  }

  forSubject(distinctId: string, attributes: Attributes = {}): LazyExperimentationSubject {
    const id = opaqueId(distinctId);
    const subject = this.growthbook.createScopedInstance({attributes: {...attributes, id}});
    return new LazyExperimentationSubject(subject);
  }

  destroy(): void {
    this.growthbook.destroy();
  }
}

type Subject = ReturnType<GrowthBookClient["createScopedInstance"]>;

export class LazyExperimentationSubject {
  constructor(readonly growthbook: Subject) {}

  getVariant<T = unknown>(experimentKey: string): LazyVariant<T> {
    const result = this.growthbook.evalFeature<T>(experimentKey);
    const experiment = result.experimentResult;
    return {
      value: result.value,
      variation: experiment?.variationId === 1 ? "variant" : "control",
      inExperiment: result.source === "experiment" && experiment?.inExperiment === true,
    };
  }

  capture(eventName: string, properties: EventProperties = {}, value?: number): void {
    if (!validEventName(eventName)) throw new Error("eventName must be a lowercase Lazyweb key");
    if (value !== undefined && !Number.isFinite(value)) throw new Error("value must be finite");
    this.growthbook.logEvent(eventName, value === undefined ? properties : {...properties, value});
  }
}

export function createLazyExperimentation(options: LazyExperimentationOptions): LazyExperimentation {
  return new LazyExperimentation(options);
}

function validEventName(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value);
}

function opaqueId(value: string): string {
  const id = value?.trim();
  if (!id || id.length > 256 || id.includes("@")) throw new Error("distinctId must be an opaque identifier");
  return id;
}

function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("apiHost must be an HTTP(S) origin");
  }
  return url.origin;
}
