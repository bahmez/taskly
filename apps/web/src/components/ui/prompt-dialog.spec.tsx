/* eslint-disable react/display-name */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptDialog } from './prompt-dialog';

vi.mock('@taskly/ui', async () => {
  const React = await import('react');
  const passthrough =
    (Tag: keyof JSX.IntrinsicElements) =>
    ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(Tag, props, children);

  return {
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? React.createElement('div', {}, children) : null,
    DialogContent: passthrough('div'),
    DialogHeader: passthrough('div'),
    DialogTitle: passthrough('h2'),
    DialogDescription: passthrough('p'),
    DialogFooter: passthrough('div'),
    Button: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement('button', props, children),
    Input: (props: Record<string, unknown>) => React.createElement('input', props),
  };
});

describe('PromptDialog', () => {
  it('Confirm is disabled when value is blank', async () => {
    render(
      <PromptDialog
        open
        onOpenChange={() => undefined}
        title="Rename"
        confirmText="Save"
        defaultValue="   "
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Pressing Enter confirms with trimmed value and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <PromptDialog
        open
        onOpenChange={onOpenChange}
        title="Rename"
        confirmText="Save"
        defaultValue=""
        onConfirm={onConfirm}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.type(input, '  hello  {Enter}');

    expect(onConfirm).toHaveBeenCalledWith('hello');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});


