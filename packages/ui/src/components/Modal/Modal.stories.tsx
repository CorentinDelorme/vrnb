import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Modal } from './Modal';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { onClose: fn() },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: 'This is modal content. Click outside or press ESC to close.',
  },
};

export const WithActions: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    children: 'Are you sure you want to proceed?',
    actions: (
      <>
        <button className="btn">Cancel</button>
        <button className="btn btn-primary">Confirm</button>
      </>
    ),
  },
};

export const NoTitle: Story = {
  args: {
    isOpen: true,
    children: 'A modal without a title.',
  },
};
