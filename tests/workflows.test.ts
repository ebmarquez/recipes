import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

function workflow(name: string) {
  return parse(readFileSync(join(process.cwd(), '.github', 'workflows', name), 'utf8'));
}

test('CI stays read-only and uses the same verifier as deployment', () => {
  const ci = workflow('ci.yml');
  assert.deepEqual(ci.permissions, {});
  assert.ok('push' in ci.on && 'pull_request' in ci.on);
  assert.deepEqual(ci.jobs.verify.permissions, { contents: 'read' });
  assert.equal(ci.jobs.verify.uses, './.github/workflows/verify.yml');
  assert.equal(ci.jobs.verify.with, undefined);
});

test('Pages cannot deploy PR/branch code and serializes deployments without cancelling active releases', () => {
  const pages = workflow('pages.yml');
  assert.deepEqual(Object.keys(pages.on).sort(), ['push', 'workflow_dispatch']);
  assert.deepEqual(pages.on.push.branches, ['main']);
  assert.deepEqual(pages.permissions, {});
  assert.equal(pages.concurrency.group, 'github-pages');
  assert.equal(pages.concurrency['cancel-in-progress'], false);
  for (const job of [pages.jobs.build, pages.jobs.deploy]) {
    assert.match(job.if, /github.ref == 'refs\/heads\/main'/);
    assert.match(job.if, /github.event_name == 'push'/);
    assert.match(job.if, /github.event_name == 'workflow_dispatch'/);
  }
  assert.deepEqual(pages.jobs.build.permissions, { contents: 'read' });
  assert.equal(pages.jobs.deploy.needs, 'build');
  assert.deepEqual(pages.jobs.deploy.permissions, { pages: 'write', 'id-token': 'write' });
  assert.equal(pages.jobs.deploy.environment.name, 'github-pages');
});

test('verification uploads only dist after browser restoration and output verification, with pinned official actions', () => {
  const verify = workflow('verify.yml');
  assert.equal(verify.on.workflow_call.inputs['upload-pages'].default, false);
  assert.deepEqual(verify.jobs.verify.permissions, { contents: 'read' });
  const steps: { uses?: string; run?: string; if?: string; with?: Record<string, unknown> }[] = verify.jobs.verify.steps;
  const browser = steps.findIndex(step => step.run === 'npm run test:e2e');
  const output = steps.findIndex(step => step.run === 'npm run verify:output');
  const upload = steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.ok(browser >= 0 && output > browser && upload > output);
  assert.equal(steps[upload].with?.path, 'dist');
  assert.match(steps[upload].if!, /inputs.upload-pages && github.ref == 'refs\/heads\/main'/);
  assert.ok(steps.some(step => step.run === 'npm run lint:docs'));
  for (const step of [...steps, ...workflow('pages.yml').jobs.deploy.steps]) {
    if (step.uses) assert.match(step.uses, /^actions\/[\w-]+@[a-f0-9]{40}$/);
    assert.ok(!/gh api|visibility|upload-artifact@|pull_request_target/.test(step.run ?? ''));
  }
});
