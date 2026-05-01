import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUrlQuery, type ListQueryState } from "@/shared/lib/resource-client";

describe("resources url state", () => {
  const defaults: ListQueryState = {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc"
  };

  beforeEach(() => {
    window.history.replaceState({}, "", "/targets");
    vi.restoreAllMocks();
  });

  it("replaces list query history entries when requested", () => {
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    updateUrlQuery(
      {
        ...defaults,
        q: "portal",
        page: 2
      },
      defaults,
      "replace"
    );

    expect(replaceSpy).toHaveBeenCalledWith(window.history.state, "", "/targets?page=2&q=portal");
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("does not touch history when the next url matches the current one", () => {
    window.history.replaceState({}, "", "/targets?page=2&q=portal");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const pushSpy = vi.spyOn(window.history, "pushState");

    updateUrlQuery(
      {
        ...defaults,
        q: "portal",
        page: 2
      },
      defaults,
      "replace"
    );

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
