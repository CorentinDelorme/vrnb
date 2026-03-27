import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeroImage } from "./HeroImage";

const meta = {
  title: "Components/HeroImage",
  component: HeroImage,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof HeroImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageUrl: "https://placehold.co/1200x400",
    title: "Hero Title",
    subtitle: "A brief description or tagline",
  },
};

export const TitleOnly: Story = {
  args: {
    imageUrl: "https://placehold.co/1200x400",
    title: "Nos Balades",
  },
};

export const WithAlt: Story = {
  args: {
    imageUrl: "https://placehold.co/1200x400",
    imageAlt: "Beautiful cycling route",
    title: "Randonnées à vélo",
  },
};
