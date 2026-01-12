import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('health returns { ok: true }', () => {
    const controller = new AppController();
    expect(controller.health()).toEqual({ ok: true });
  });
});


