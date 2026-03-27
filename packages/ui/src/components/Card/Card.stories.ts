import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    children: 'This is a card body content.',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Card With Image',
    imageUrl: 'https://placehold.co/400x200',
    imageAlt: 'Placeholder image',
    children: 'A card with an image at the top.',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Card With Actions',
    children: 'This card has action buttons.',
    actions: <button className="btn btn-primary btn-sm">Action</button>,
  },
};

export const Compact: Story = {
  args: {
    title: 'Compact Card',
    compact: true,
    children: 'A compact card with reduced padding.',
  },
};

export const NoTitle: Story = {
  args: {
    children: 'A card without a title.',
  },
};
