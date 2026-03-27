import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

// Mock dialog methods for jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('Modal', () => {
  it('should render title when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
        Content
      </Modal>,
    );
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('should render children content', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Modal body
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeDefined();
  });

  it('should render actions when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} actions={<button>OK</button>}>
        Content
      </Modal>,
    );
    expect(screen.getByText('OK')).toBeDefined();
  });

  it('should call showModal when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Content
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('should have close button in backdrop', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Content
      </Modal>,
    );
    expect(screen.getByLabelText('Close')).toBeDefined();
  });
});
