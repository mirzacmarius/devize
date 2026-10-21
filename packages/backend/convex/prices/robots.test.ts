import { describe, expect, test } from "bun:test";
import { robotsAllows } from "./robots";

describe("robotsAllows", () => {
  const robots = [
    "# Comments are ignored",
    "User-agent: *",
    "Disallow: /cos",
    "Disallow: /cautare",
    "Allow: /cautare/ajutor$",
    "Disallow: /*?sort=",
    "",
    "User-agent: BadBot",
    "User-agent: OtherBot",
    "Disallow: /",
  ].join("\n");

  test("follows the rules for every crawler", () => {
    expect(robotsAllows(robots, "DevizeBot", "/p/adeziv/100200")).toBe(true);
    expect(robotsAllows(robots, "DevizeBot", "/cos/vezi")).toBe(false);
    expect(robotsAllows(robots, "DevizeBot", "/cautare/ajutor")).toBe(true);
    expect(robotsAllows(robots, "DevizeBot", "/cautare/ajutor/x")).toBe(false);
    expect(robotsAllows(robots, "DevizeBot", "/lista?sort=pret")).toBe(false);
  });

  test("uses a group naming the crawler instead", () => {
    expect(robotsAllows(robots, "OtherBot", "/p/adeziv/100200")).toBe(false);
    expect(
      robotsAllows(
        `${robots}\nUser-agent: DevizeBot\nDisallow: /p/`,
        "devizebot",
        "/p/adeziv",
      ),
    ).toBe(false);
  });

  test("allows everything without rules", () => {
    expect(robotsAllows("", "DevizeBot", "/p/x")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow:", "DevizeBot", "/p/x")).toBe(
      true,
    );
  });
});
