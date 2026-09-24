import { describe, it, expect, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const eqMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => {
  const from = vi.fn(() => ({
    select: (...args: any[]) => { selectMock(...args); return { eq: (...a: any[]) => eqMock(...a) }; },
    update: (...args: any[]) => { updateMock(...args); return { eq: () => ({ eq: () => ({ error: null }) }) }; },
  }));
  return { supabaseAdmin: { from } };
});

import { handleGpsPing } from "./ingest.server";

function req(body: any, method = "POST") {
  return new Request("https://example.com/api/gps/ping", {
    method,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

const VEHICLE = { id: "v1", company_id: "c1", data: { tracker: { deviceId: "IMEI123", webhookToken: "secret-token" } } };

describe("handleGpsPing", () => {
  beforeEach(() => {
    selectMock.mockReset();
    eqMock.mockReset();
    updateMock.mockReset();
    eqMock.mockResolvedValue({ data: [VEHICLE], error: null });
  });

  it("rejects non-POST methods", async () => {
    const res = await handleGpsPing(req({}, "GET"));
    expect(res.status).toBe(405);
  });

  it("rejects invalid JSON body", async () => {
    const res = await handleGpsPing(new Request("https://x/api/gps/ping", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing deviceId or token", async () => {
    const res = await handleGpsPing(req({ lat: 6.37, lng: 2.39 }));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range coordinates", async () => {
    const res = await handleGpsPing(req({ deviceId: "IMEI123", token: "secret-token", lat: 999, lng: 2.39 }));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown device id (no match found)", async () => {
    eqMock.mockResolvedValueOnce({ data: [], error: null });
    const res = await handleGpsPing(req({ deviceId: "UNKNOWN", token: "secret-token", lat: 6.37, lng: 2.39 }));
    expect(res.status).toBe(403);
  });

  it("rejects a matching deviceId with the wrong token", async () => {
    const res = await handleGpsPing(req({ deviceId: "IMEI123", token: "wrong-token", lat: 6.37, lng: 2.39 }));
    expect(res.status).toBe(403);
  });

  it("accepts a matching deviceId + token and writes the position", async () => {
    const res = await handleGpsPing(req({ deviceId: "IMEI123", token: "secret-token", lat: 6.37, lng: 2.39, speedKmh: 42 }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [payload] = updateMock.mock.calls[0];
    expect(payload.data.lastPosition).toMatchObject({ lat: 6.37, lng: 2.39, speedKmh: 42, source: "webhook" });
  });
});
