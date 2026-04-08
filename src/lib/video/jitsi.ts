export function getJitsiMeetUrl(roomId: string): string {
  return `https://meet.jit.si/${roomId}`;
}

export function getJitsiEmbedConfig(roomId: string, userName: string) {
  return {
    roomName: roomId,
    parentNode: undefined as HTMLElement | undefined,
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      prejoinPageEnabled: true,
      disableDeepLinking: true,
      defaultLanguage: "fr",
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      DEFAULT_BACKGROUND: "#f0fdf4",
      TOOLBAR_BUTTONS: [
        "microphone",
        "camera",
        "desktop",
        "chat",
        "raisehand",
        "participants-pane",
        "tileview",
        "hangup",
        "recording",
      ],
    },
    userInfo: {
      displayName: userName,
    },
  };
}
