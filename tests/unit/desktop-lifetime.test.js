/**
 * @file Prove optional native admission precedes the original actual application operation and completion follows it.
 * Functions: event-driven bridge-boundary tests cover browser mode, held admission, rejection and failed completion.
 * Variables: inert independent promises only; no worker results or database output is fabricated.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { withDesktopOperation } from "../../src/desktop.js";
afterEach(() => Reflect.deleteProperty(window, "timelineDesktop"));

describe("optional acknowledged native lifetime", () => {
  it("retains original browser behavior and work rejection", async () => {
    expect(await withDesktopOperation("import", async () => 42)).toBe(42);
    await expect(
      withDesktopOperation("import", async () => {
        throw new Error("original failure");
      }),
    ).rejects.toThrow("original failure");
  });
  it("cannot start before admission or acknowledge completion before real work settles", async () => {
    /** @type {(value:string)=>void} */
    let admit = () => {
      throw new Error("uninitialized admission");
    };
    /** @type {(value:number)=>void} */
    let complete = () => {
      throw new Error("uninitialized work");
    };
    const admission = new Promise((resolve) => {
        admit = resolve;
      }),
      workResult = new Promise((resolve) => {
        complete = resolve;
      });
    const begin = vi.fn(() => admission),
      end = vi.fn(async () => {}),
      work = vi.fn(async () => workResult);
    Reflect.set(window, "timelineDesktop", { beginOperation: begin, endOperation: end });
    const result = withDesktopOperation("import", work);
    expect(begin).toHaveBeenCalledWith("import");
    expect(work).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    admit("actual-token");
    await Promise.resolve();
    expect(work).toHaveBeenCalledOnce();
    expect(end).not.toHaveBeenCalled();
    complete(7);
    expect(await result).toBe(7);
    expect(end).toHaveBeenCalledExactlyOnceWith("actual-token");
  });
  it("does not mutate when admission is refused", async () => {
    const work = vi.fn(async () => 0),
      end = vi.fn(async () => {});
    Reflect.set(window, "timelineDesktop", {
      beginOperation: async () => {
        throw new Error("closed admission");
      },
      endOperation: end,
    });
    await expect(withDesktopOperation("clear", work)).rejects.toThrow("closed admission");
    expect(work).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });
  it("ends failed actual work and never hides refused completion as success", async () => {
    const end = vi.fn(async () => {});
    Reflect.set(window, "timelineDesktop", {
      beginOperation: async () => "token",
      endOperation: end,
    });
    await expect(
      withDesktopOperation("fixture", async () => {
        throw new Error("work failed");
      }),
    ).rejects.toThrow("work failed");
    expect(end).toHaveBeenCalledExactlyOnceWith("token");
    Reflect.set(window, "timelineDesktop", {
      beginOperation: async () => "token",
      endOperation: async () => {
        throw new Error("completion refused");
      },
    });
    await expect(withDesktopOperation("fixture", async () => 7)).rejects.toThrow(
      "completion refused",
    );
  });
});
