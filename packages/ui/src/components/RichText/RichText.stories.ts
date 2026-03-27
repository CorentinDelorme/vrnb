import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RichText } from './RichText';

const meta = {
  title: 'Components/RichText',
  component: RichText,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHtml: Story = {
  args: {
    content:
      '<h2>Welcome</h2><p>This is a <strong>rich text</strong> block with various elements.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
  },
};

export const WithChildren: Story = {
  args: {
    children: (
      <>
        <h2>Title</h2>
        <p>
          This is paragraph text rendered via <em>React children</em>.
        </p>
      </>
    ),
  },
};

export const Empty: Story = {
  args: {},
};
