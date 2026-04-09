import { describe, it, expect } from "vitest";
import {
  getJitsiMeetUrl,
  getJitsiEmbedConfig,
} from "@/lib/video/jitsi";

describe("Jitsi helpers", () => {
  describe("getJitsiMeetUrl", () => {
    it("returns a URL with the room ID", () => {
      const url = getJitsiMeetUrl("ecoleversity-abc123");
      expect(url).toBe("https://meet.jit.si/ecoleversity-abc123");
    });

    it("uses meet.jit.si as the domain", () => {
      const url = getJitsiMeetUrl("test-room");
      expect(url).toContain("meet.jit.si");
    });
  });

  describe("getJitsiEmbedConfig", () => {
    it("sets French as default language", () => {
      const config = getJitsiEmbedConfig("test-room", "Test User");
      expect(config.configOverwrite.defaultLanguage).toBe("fr");
    });

    it("includes the room name", () => {
      const config = getJitsiEmbedConfig("ecoleversity-room-123", "Marie");
      expect(config.roomName).toBe("ecoleversity-room-123");
    });

    it("includes user display name", () => {
      const config = getJitsiEmbedConfig("room", "Koné Aminata");
      expect(config.userInfo.displayName).toBe("Koné Aminata");
    });

    it("enables prejoin page", () => {
      const config = getJitsiEmbedConfig("room", "User");
      expect(config.configOverwrite.prejoinPageEnabled).toBe(true);
    });

    it("includes essential toolbar buttons", () => {
      const config = getJitsiEmbedConfig("room", "User");
      const buttons = config.interfaceConfigOverwrite.TOOLBAR_BUTTONS;
      expect(buttons).toContain("microphone");
      expect(buttons).toContain("camera");
      expect(buttons).toContain("hangup");
      expect(buttons).toContain("chat");
    });

    it("hides Jitsi watermark", () => {
      const config = getJitsiEmbedConfig("room", "User");
      expect(config.interfaceConfigOverwrite.SHOW_JITSI_WATERMARK).toBe(false);
    });
  });
});
