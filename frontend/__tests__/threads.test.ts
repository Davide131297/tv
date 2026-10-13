import {
  getThreadsTextLength,
  publishThread,
  splitTextForThreads,
  THREADS_MAX_TEXT_LENGTH,
  ThreadsPublishError,
} from "../lib/threads";

describe("getThreadsTextLength", () => {
  it("counts plain text and umlauts as one character each", () => {
    expect(getThreadsTextLength("Grüne")).toBe(5);
  });

  it("counts emojis with their UTF-8 byte length", () => {
    expect(getThreadsTextLength("📊")).toBe(4);
    expect(getThreadsTextLength("a📊b")).toBe(6);
  });
});

describe("splitTextForThreads", () => {
  it("returns short texts unchanged without counter", () => {
    expect(splitTextForThreads("Kurzer Text\n")).toEqual(["Kurzer Text"]);
  });

  it("keeps every chunk within the limit including the counter", () => {
    const episodes = Array.from(
      { length: 12 },
      (_, i) =>
        `Mo: Show ${i}\nG: ${"Max Mustermann (SPD), ".repeat(4)}Erika Musterfrau (CDU) 📊`,
    );
    const text = `Polit-Talks der Woche\n\n${episodes.join("\n\n")}`;

    const chunks = splitTextForThreads(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(getThreadsTextLength(chunk)).toBeLessThanOrEqual(
        THREADS_MAX_TEXT_LENGTH,
      );
      expect(chunk.endsWith(`(${i + 1}/${chunks.length})`)).toBe(true);
    });
  });

  it("splits at paragraph boundaries and keeps episode blocks intact", () => {
    const block = (n: number) => `Show ${n}\n${"x".repeat(200)}`;
    const text = [block(1), block(2), block(3)].join("\n\n");

    const chunks = splitTextForThreads(text);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(`${block(1)}\n\n${block(2)}\n\n(1/2)`);
    expect(chunks[1]).toBe(`${block(3)}\n\n(2/2)`);
  });

  it("hard-splits very long words without exceeding the limit", () => {
    const chunks = splitTextForThreads("y".repeat(1200));

    chunks.forEach((chunk) =>
      expect(getThreadsTextLength(chunk)).toBeLessThanOrEqual(
        THREADS_MAX_TEXT_LENGTH,
      ),
    );
    expect(chunks.map((c) => c.split("\n\n")[0]).join("")).toBe(
      "y".repeat(1200),
    );
  });

  it("reserves room for two-digit counters", () => {
    const text = Array.from({ length: 40 }, () => "z".repeat(150)).join("\n\n");

    const chunks = splitTextForThreads(text);

    expect(chunks.length).toBeGreaterThanOrEqual(10);
    chunks.forEach((chunk) =>
      expect(getThreadsTextLength(chunk)).toBeLessThanOrEqual(
        THREADS_MAX_TEXT_LENGTH,
      ),
    );
  });
});

describe("publishThread", () => {
  const originalFetch = global.fetch;
  let calls: { url: string; params: URLSearchParams }[];

  const jsonResponse = (body: unknown) =>
    Promise.resolve({ json: () => Promise.resolve(body) } as Response);

  function mockThreadsApi(
    handler: (url: string, params: URLSearchParams) => unknown,
  ) {
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const params =
        init?.body instanceof URLSearchParams
          ? init.body
          : new URL(url).searchParams;
      calls.push({ url, params });
      return jsonResponse(handler(url, params));
    }) as typeof fetch;
  }

  function defaultHandler() {
    let container = 0;
    let post = 0;
    return (url: string) => {
      if (url.endsWith("/threads")) return { id: `container-${++container}` };
      if (url.endsWith("/threads_publish")) return { id: `post-${++post}` };
      return { status: "FINISHED" };
    };
  }

  const options = {
    userId: "user",
    accessToken: "token",
    topicTag: "Polittalk",
    replyRetryDelaysMs: [0],
    containerPollIntervalMs: 0,
  };

  beforeEach(() => {
    calls = [];
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("publishes the first chunk as post and the rest as replies", async () => {
    mockThreadsApi(defaultHandler());

    const ids = await publishThread({ ...options, chunks: ["a", "b", "c"] });

    expect(ids).toEqual(["post-1", "post-2", "post-3"]);
    const containers = calls.filter((c) => c.url.endsWith("/threads"));
    expect(containers).toHaveLength(3);
    expect(containers[0].params.get("reply_to_id")).toBeNull();
    expect(containers[0].params.get("topic_tag")).toBe("Polittalk");
    expect(containers[1].params.get("reply_to_id")).toBe("post-1");
    expect(containers[1].params.get("topic_tag")).toBeNull();
    expect(containers[2].params.get("reply_to_id")).toBe("post-2");
  });

  it("waits for the container status before publishing", async () => {
    let statusCalls = 0;
    const base = defaultHandler();
    mockThreadsApi((url, params) => {
      if (params.get("fields")) {
        statusCalls++;
        return { status: statusCalls < 3 ? "IN_PROGRESS" : "FINISHED" };
      }
      return base(url);
    });

    await publishThread({ ...options, chunks: ["a"] });

    expect(statusCalls).toBe(3);
  });

  it("never falls back to standalone posts when a reply fails", async () => {
    const base = defaultHandler();
    mockThreadsApi((url, params) => {
      if (url.endsWith("/threads") && params.get("reply_to_id")) {
        return { error: { type: "THApiException", code: 10 } };
      }
      return base(url);
    });

    const promise = publishThread({ ...options, chunks: ["a", "b"] });

    await expect(promise).rejects.toBeInstanceOf(ThreadsPublishError);
    await expect(promise).rejects.toMatchObject({ publishedIds: ["post-1"] });
    const containers = calls.filter((c) => c.url.endsWith("/threads"));
    // 1x Root + 2 Versuche für die Antwort, keiner ohne reply_to_id
    expect(containers).toHaveLength(3);
    containers
      .slice(1)
      .forEach((c) => expect(c.params.get("reply_to_id")).toBe("post-1"));
  });

  it("retries reply creation and succeeds on a later attempt", async () => {
    let replyAttempts = 0;
    const base = defaultHandler();
    mockThreadsApi((url, params) => {
      if (url.endsWith("/threads") && params.get("reply_to_id")) {
        replyAttempts++;
        if (replyAttempts === 1) return { error: { code: 24 } };
      }
      return base(url);
    });

    const ids = await publishThread({ ...options, chunks: ["a", "b"] });

    expect(ids).toEqual(["post-1", "post-2"]);
    expect(replyAttempts).toBe(2);
  });

  it("rejects chunks over the character limit before publishing", async () => {
    mockThreadsApi(defaultHandler());

    await expect(
      publishThread({ ...options, chunks: ["x".repeat(501)] }),
    ).rejects.toBeInstanceOf(ThreadsPublishError);
    expect(calls).toHaveLength(0);
  });
});
