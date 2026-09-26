import { api, ApiError, API_BASE, splitName, withFilter } from "@/lib/api";

function mockFetch(body: unknown, status = 200) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("withFilter", () => {
  it("omits 'all' values", () => {
    const params = withFilter(new URLSearchParams(), { show: "all", year: "all" });
    expect(params.toString()).toBe("");
  });

  it("adds show and year", () => {
    const params = withFilter(new URLSearchParams(), {
      show: "Markus Lanz",
      year: "2026",
    });
    expect(params.get("show")).toBe("Markus Lanz");
    expect(params.get("year")).toBe("2026");
  });
});

describe("splitName", () => {
  it("splits first and last name", () => {
    expect(splitName("Friedrich Merz")).toEqual({ first: "Friedrich", last: "Merz" });
    expect(splitName("Marie-Agnes Strack-Zimmermann")).toEqual({
      first: "Marie-Agnes",
      last: "Strack-Zimmermann",
    });
    expect(splitName("Merz")).toBeNull();
  });
});

describe("api", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses the public v1 endpoint for rankings without an API key", async () => {
    const fetchMock = mockFetch({ success: true, data: [] });
    await api.rankings({ show: "all", year: "2026" }, 300);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `${API_BASE}/api/v1/politics?type=politician-rankings&year=2026&limit=300`,
    );
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("passes the filter to the TV ratings endpoint", async () => {
    const fetchMock = mockFetch({ success: true, data: { ratings: [] } });
    await api.tvRatings({ show: "Caren Miosga", year: "2026" });
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_BASE}/api/tv-ratings?show=Caren+Miosga&year=2026`,
    );
  });

  it("throws an ApiError with status on HTTP errors", async () => {
    mockFetch({ error: "boom" }, 500);
    await expect(api.summary()).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
    });
  });

  it("throws when the envelope reports failure", async () => {
    mockFetch({ success: false, error: "Internal server error" });
    await expect(api.partyStats()).rejects.toBeInstanceOf(ApiError);
  });

  it("maps network failures to status 0", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
    await expect(api.summary()).rejects.toMatchObject({ status: 0 });
  });

  it("treats unknown politicians as having no appearances", async () => {
    mockFetch({ error: "Politician not found" }, 404);
    await expect(api.politicianAppearances("Max Mustermann")).resolves.toEqual([]);
  });

  it("drops the possibly incomplete oldest episode when the row limit is hit", async () => {
    mockFetch({
      success: true,
      data: [
        { episode_date: "2026-09-01", politician_count: 2, politicians: [] },
        { episode_date: "2026-09-10", politician_count: 2, politicians: [] },
      ],
    });
    const episodes = await api.episodes("Markus Lanz", "2026", 4);
    expect(episodes.map((e) => e.episode_date)).toEqual(["2026-09-10"]);
  });

  it("keeps all episodes when below the row limit", async () => {
    mockFetch({
      success: true,
      data: [{ episode_date: "2026-09-10", politician_count: 2, politicians: [] }],
    });
    const episodes = await api.episodes("Markus Lanz", null, 400);
    expect(episodes).toHaveLength(1);
  });
});
