"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { withGodspeedCloser } = require("./delegate.js");

test("Godspeed closer is appended exactly once and canonicalized", () => {
  assert.equal(withGodspeedCloser("Review the workspace"), "Review the workspace | godspeed");
  assert.equal(withGodspeedCloser("Review the workspace | godspeed"), "Review the workspace | godspeed");
  assert.equal(
    withGodspeedCloser("Review the workspace | GODSPEED | godspeed\n"),
    "Review the workspace | godspeed",
  );
});

