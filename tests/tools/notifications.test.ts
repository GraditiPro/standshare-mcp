import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleNotifications } from "../../src/tools/notifications.js";
import type { StandShareClient } from "../../src/auth/client.js";

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  } as unknown as StandShareClient;
}

describe("handleNotifications", () => {
  let client: ReturnType<typeof mockClient>;

  beforeEach(() => {
    client = mockClient();
  });

  describe("list", () => {
    it("returns formatted notification table", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "notif_1",
          title: "Shift Reminder",
          message: "Your shift starts in 2 hours at Stand 3.",
          read: false,
          createdAt: "2026-04-10T10:00:00Z",
        },
        {
          id: "notif_2",
          title: "Payment Processed",
          message: "Your payment of $45.00 has been processed.",
          read: true,
          createdAt: "2026-04-09T15:00:00Z",
        },
      ]);

      const result = await handleNotifications(client, { action: "list" });

      expect(result.content[0].text).toContain("Unread");
      expect(result.content[0].text).toContain("Read");
      expect(result.content[0].text).toContain("Shift Reminder");
      expect(result.content[0].text).toContain("Payment Processed");
      expect(client.get).toHaveBeenCalledWith("/my/notifications", {});
    });

    it("passes unreadOnly param when specified", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "notif_1",
          title: "New Assignment",
          message: "You have been assigned to Stand 1.",
          read: false,
          createdAt: "2026-04-10T08:00:00Z",
        },
      ]);

      const result = await handleNotifications(client, {
        action: "list",
        unreadOnly: true,
      });

      expect(result.content[0].text).toContain("New Assignment");
      expect(client.get).toHaveBeenCalledWith(
        "/my/notifications",
        expect.objectContaining({ unreadOnly: true })
      );
    });

    it("truncates message to 60 characters", async () => {
      const longMessage =
        "This is a very long notification message that exceeds sixty characters easily.";
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "notif_1",
          title: "Long Message",
          message: longMessage,
          read: false,
          createdAt: "2026-04-10T10:00:00Z",
        },
      ]);

      const result = await handleNotifications(client, { action: "list" });

      expect(result.content[0].text).toContain("...");
      expect(result.content[0].text).not.toContain(longMessage);
    });

    it("returns empty message when no notifications found", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await handleNotifications(client, { action: "list" });
      expect(result.content[0].text).toContain("No notifications found");
    });
  });

  describe("send", () => {
    it("sends notification and returns confirmation", async () => {
      (client.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await handleNotifications(client, {
        action: "send",
        userId: "usr_123",
        title: "Schedule Update",
        message: "Your schedule has been updated.",
      });

      expect(result.content[0].text).toBe(
        'Notification sent to user usr_123: "Schedule Update"'
      );
      expect(client.post).toHaveBeenCalledWith("/my/notifications", {
        userId: "usr_123",
        title: "Schedule Update",
        message: "Your schedule has been updated.",
      });
    });

    it("returns error when userId is missing", async () => {
      const result = await handleNotifications(client, {
        action: "send",
        title: "Hello",
        message: "World",
      });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("userId is required");
    });

    it("returns error when title is missing", async () => {
      const result = await handleNotifications(client, {
        action: "send",
        userId: "usr_123",
        message: "World",
      });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("title is required");
    });

    it("returns error when message is missing", async () => {
      const result = await handleNotifications(client, {
        action: "send",
        userId: "usr_123",
        title: "Hello",
      });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("message is required");
    });
  });

  // 1.0.0 let an AI client broadcast an org-wide announcement from here. That
  // action must stay gone; `send` to an individual user is unchanged.
  describe("removed announce action", () => {
    it("announce is an unknown action and never calls the API", async () => {
      const result = await handleNotifications(client, {
        action: "announce",
        title: "t",
        message: "m",
      });

      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
      expect(result.content[0].text.split("Valid actions:")[1]).not.toContain("announce");
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns error for unknown action", async () => {
      const result = await handleNotifications(client, { action: "invalid" } as any);
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unknown action");
    });

    it("returns error when API call fails", async () => {
      (client.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Unauthorized")
      );

      const result = await handleNotifications(client, { action: "list" });
      expect(result).toHaveProperty("isError", true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });
});
