import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWorkers } from "../../src/tools/workers.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleWorkers", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("event_roster", () => {
    it("returns formatted roster for an event", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [
          {
            assignmentId: "asgn_1",
            userId: "usr_1",
            workerName: "Jane Smith",
            familyName: "The Smiths",
            familyId: "fam_1",
            standNumber: 1,
            standId: "std_1",
            registrationStatus: "confirmed",
            attendanceStatus: "attended",
          },
          {
            assignmentId: "asgn_2",
            userId: "usr_2",
            workerName: "John Doe",
            familyName: "The Does",
            familyId: "fam_2",
            standNumber: 2,
            standId: "std_2",
            registrationStatus: "waitlisted",
            attendanceStatus: null,
          },
        ],
      });

      const result = await handleWorkers(client, {
        action: "event_roster",
        eventId: "evt_1",
      });

      expect(result.content[0].text).toContain("Jane Smith");
      expect(result.content[0].text).toContain("usr_1");
      expect(result.content[0].text).toContain("The Smiths");
      expect(result.content[0].text).toContain("Stand 1");
      expect(result.content[0].text).toContain("confirmed");
      expect(result.content[0].text).toContain("attended");
      expect(result.content[0].text).toContain("John Doe");
      expect(client.get).toHaveBeenCalledWith("/events/evt_1/workers", undefined);
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleWorkers(client, { action: "event_roster" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });
  });

  describe("assign", () => {
    it("assigns a worker and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        assignmentId: "asgn_new",
        workerName: "Alice Johnson",
        familyName: "The Johnsons",
        registrationStatus: "confirmed",
      });

      const result = await handleWorkers(client, {
        action: "assign",
        eventId: "evt_1",
        familyId: "fam_3",
        userId: "usr_3",
        standId: "std_1",
        workerName: "Alice Johnson",
      });

      expect(result.content[0].text).toContain("asgn_new");
      expect(result.content[0].text).toContain("Alice Johnson");
      expect(result.content[0].text).toContain("confirmed");
      expect(client.post).toHaveBeenCalledWith(
        "/events/evt_1/workers",
        expect.objectContaining({ familyId: "fam_3", userId: "usr_3", standId: "std_1" })
      );
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleWorkers(client, { action: "assign", familyId: "fam_1" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });

    it("returns error when familyId is missing", async () => {
      const result = await handleWorkers(client, { action: "assign", eventId: "evt_1" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("familyId is required");
    });
  });

  describe("update_assignment", () => {
    it("updates attendance status and returns confirmation", async () => {
      (client.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        assignmentId: "asgn_1",
        workerName: "Jane Smith",
        attendanceStatus: "attended",
        registrationStatus: "confirmed",
      });

      const result = await handleWorkers(client, {
        action: "update_assignment",
        eventId: "evt_1",
        assignmentId: "asgn_1",
        attendanceStatus: "attended",
      });

      expect(result.content[0].text).toContain("asgn_1");
      expect(result.content[0].text).toContain("attended");
      expect(client.put).toHaveBeenCalledWith(
        "/events/evt_1/workers/asgn_1",
        expect.objectContaining({ attendanceStatus: "attended" })
      );
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleWorkers(client, {
        action: "update_assignment",
        assignmentId: "asgn_1",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });

    it("returns error when assignmentId is missing", async () => {
      const result = await handleWorkers(client, {
        action: "update_assignment",
        eventId: "evt_1",
      });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("assignmentId is required");
    });
  });

  describe("availability", () => {
    it("returns workers not already assigned to the event", async () => {
      (client.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: [
            { userId: "usr_1", workerName: "Jane Smith" },
            { userId: "usr_2", workerName: "John Doe" },
          ],
        })
        .mockResolvedValueOnce({
          data: [
            { id: "usr_1", name: "Jane Smith", status: "active" },
            { id: "usr_2", name: "John Doe", status: "active" },
            { id: "usr_3", name: "Alice Johnson", status: "active" },
            { id: "usr_4", name: "Bob Brown", status: "active" },
          ],
        });

      const result = await handleWorkers(client, {
        action: "availability",
        eventId: "evt_1",
      });

      // usr_1 and usr_2 are already assigned, so only usr_3 and usr_4 should appear
      expect(result.content[0].text).toContain("Alice Johnson");
      expect(result.content[0].text).toContain("Bob Brown");
      expect(result.content[0].text).not.toContain("Jane Smith");
      expect(result.content[0].text).not.toContain("John Doe");
      expect(client.get).toHaveBeenCalledWith("/admin/users", expect.objectContaining({ limit: 100, status: "active" }));
    });

    it("returns error when eventId is missing", async () => {
      const result = await handleWorkers(client, { action: "availability" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("eventId is required");
    });
  });

  describe("attendance_history", () => {
    it("returns attendance history with attendance rate", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          {
            eventName: "Cardinals Game",
            eventDate: "2026-04-15T18:00:00Z",
            attendanceStatus: "attended",
          },
          {
            eventName: "Bucs Game",
            eventDate: "2026-03-20T18:00:00Z",
            attendanceStatus: "no_show",
          },
          {
            eventName: "Lightning Game",
            eventDate: "2026-02-10T18:00:00Z",
            attendanceStatus: "attended",
          },
        ],
      });

      const result = await handleWorkers(client, {
        action: "attendance_history",
        userId: "usr_1",
        dateFrom: "2026-01-01",
        dateTo: "2026-04-30",
      });

      expect(result.content[0].text).toContain("Cardinals Game");
      expect(result.content[0].text).toContain("attended");
      expect(result.content[0].text).toContain("no_show");
      // attendance rate: 2 attended out of 3 = 67%
      expect(result.content[0].text).toMatch(/2\/3|67%/);
      expect(client.get).toHaveBeenCalledWith(
        "/admin/worker-performance/usr_1",
        expect.objectContaining({ startDate: "2026-01-01", endDate: "2026-04-30" })
      );
    });

    it("returns error when userId is missing", async () => {
      const result = await handleWorkers(client, { action: "attendance_history" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("userId is required");
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleWorkers(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Event not found")
      );

      const result = await handleWorkers(client, { action: "event_roster", eventId: "bad_id" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Event not found");
    });
  });
});
