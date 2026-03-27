import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: 'https://placehold.co/96x96',
    alt: 'User avatar',
  },
};

export const WithInitials: Story = {
  args: {
    initials: 'JD',
  },
};

export const Placeholder: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    size: 'sm',
    initials: 'S',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    src: 'https://placehold.co/96x96',
    alt: 'Large avatar',
  },
};
