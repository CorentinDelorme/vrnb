import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./Input";

const meta = {
  title: "Components/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    type: "email",
    placeholder: "Enter your email",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    type: "email",
    error: "Invalid email address",
    defaultValue: "invalid",
  },
};

export const Required: Story = {
  args: {
    label: "Full Name",
    required: true,
    placeholder: "Enter your name",
  },
};

export const Password: Story = {
  args: {
    label: "Password",
    type: "password",
    placeholder: "••••••••",
  },
};

export const Small: Story = {
  args: {
    label: "Small Input",
    size: "sm",
    placeholder: "Small",
  },
};

export const Large: Story = {
  args: {
    label: "Large Input",
    size: "lg",
    placeholder: "Large",
  },
};

export const NoLabel: Story = {
  args: {
    placeholder: "Search...",
  },
};
