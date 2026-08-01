const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course-layout.js');

test('Circuito Brasil tem dez checkpoints e nao cruza sobre si mesmo', () => {
  assert.equal(course.track.length, 11);
  assert.equal(course.hasCrossings(), false);
  assert.ok(course.laneHalfWidth >= 50);
});

test('segmentos mantem espaco suficiente para alinhar as boias', () => {
  course.track.forEach((point, index) => {
    const next = course.track[(index + 1) % course.track.length];
    assert.ok(Math.hypot(next.x - point.x, next.z - point.z) > course.laneHalfWidth * 2);
  });
});

test('jogador fora da rua e teleportado somente depois de cinco segundos', () => {
  let state = course.offCourseState(60, 0, 4.9);
  assert.equal(state.teleport, false);
  state = course.offCourseState(60, state.elapsed, 0.1);
  assert.equal(state.teleport, true);
  assert.equal(course.offCourseState(20, state.elapsed, 1).elapsed, 0);
});
