jest.mock("obsidian", () => ({ normalizePath: (p: string) => p }), {
  virtual: true,
});
jest.mock("../../../../services/logger", () => ({ logger: { error: jest.fn() } }));

import {
  getMessageText,
  normalizeStoredMessages,
} from "./chat-history-manager";

describe("chat history message normalize", () => {
  it("keeps old-format messages with content", () => {
    const msgs = normalizeStoredMessages([
      { id: "1", role: "user", content: "hello" },
    ]);
    expect(msgs[0].content).toBe("hello");
  });

  it("builds content from new-format text parts", () => {
    const msgs = normalizeStoredMessages([
      {
        id: "2",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "Hi " },
          { type: "tool-invocation", toolInvocation: {} },
          { type: "text", text: "there" },
        ],
      },
    ]);
    expect(msgs[0].content).toBe("Hi there");
  });

  it("gives empty text when there is no content or parts", () => {
    expect(getMessageText({ id: "3", role: "assistant" })).toBe("");
    expect(getMessageText(undefined)).toBe("");
  });

  it("handles a missing or bad messages list", () => {
    expect(normalizeStoredMessages(undefined)).toEqual([]);
    expect(normalizeStoredMessages([null, "x", { id: "4", role: "user", content: "ok" }])).toHaveLength(1);
  });
});
