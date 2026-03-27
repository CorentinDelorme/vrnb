import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Footer } from './Footer';

const meta = {
  title: 'Components/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    links: (
      <>
        <a className="link link-hover" href="/presentation">Qui sommes-nous ?</a>
        <a className="link link-hover" href="/mentionslegales">Mentions légales</a>
        <a className="link link-hover" href="/contact">Contact</a>
      </>
    ),
    copyright: '©2026 VRNB',
  },
};

export const WithContent: Story = {
  args: {
    children: <div className="p-4 text-center">Carousel placeholder</div>,
    links: (
      <>
        <a className="link link-hover" href="/presentation">Qui sommes-nous ?</a>
        <a className="link link-hover" href="/contact">Contact</a>
      </>
    ),
    copyright: '©2026 VRNB',
  },
};

export const MinimalCopyright: Story = {
  args: {
    copyright: '©2026 VRNB',
  },
};
