export interface Failure {
  title: string;
  hint: string;
  /** The input needs changing; retrying as is won't help */
  fixInput: boolean;
}

const TRANSIENT = "Usually a temporary hiccup. Try again.";

export function describeFailure(code: string, status: number, message: string): Failure {
  switch (code) {
    case "CONTENT_REJECTED":
      return {
        title: "A scene was blocked",
        hint: "The image safety filter rejected one of the scenes. Reword the topic without graphic or explicit details, or pick another style.",
        fixInput: true,
      };
    case "PLAN_FAILED":
      return { title: "Couldn't write the script", hint: "Try again. If it keeps failing, reword the topic.", fixInput: false };
    case "IMAGES_FAILED":
      return { title: "Couldn't paint the scenes", hint: TRANSIENT, fixInput: false };
    case "TTS_FAILED":
      return { title: "Couldn't record the voiceover", hint: TRANSIENT, fixInput: false };
    case "UNSUPPORTED_LANGUAGE":
      return { title: "Language not supported", hint: message, fixInput: true };
    case "NETWORK_ERROR":
      return { title: "Can't connect", hint: "Check your connection, then try again.", fixInput: false };
    case "UPSTREAM_UNREACHABLE":
      return { title: "Can't reach reelapi", hint: "The server couldn't reach the video API. Try again in a moment.", fixInput: false };
    case "CONNECTION_LOST":
      return { title: "Lost track of this one", hint: "It's probably still rendering. Reconnect to check on it.", fixInput: false };
    case "MISSING_API_KEY":
    case "INVALID_API_KEY":
      return { title: "The server isn't set up", hint: message, fixInput: false };
  }

  if (status === 429) return { title: "Too many requests", hint: "Wait a few seconds, then try again.", fixInput: false };
  if (status === 400 || status === 422) return { title: "Couldn't make this one", hint: message, fixInput: true };
  return { title: "Something went wrong", hint: message || TRANSIENT, fixInput: false };
}
