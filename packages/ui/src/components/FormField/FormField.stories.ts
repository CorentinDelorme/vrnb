import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from './FormField';

const meta = {
  title: 'Components/FormField',
  component: FormField,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    inputProps: { type: 'email', placeholder: 'Enter your email' },
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    required: true,
    inputProps: { placeholder: 'First and last name' },
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    error: 'Please enter a valid email address',
    inputProps: { type: 'email', defaultValue: 'invalid' },
  },
};

export const WithCustomInput: Story = {
  args: {
    label: 'Message',
    required: true,
    children: <textarea className="textarea textarea-bordered w-full" placeholder="Your message..." />,
  },
};
